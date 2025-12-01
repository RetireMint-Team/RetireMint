/**
 * InvestEvents.js - Module for processing yearly investment events.
 */

/**
 * Processes the investment strategy for the current year, investing excess cash.
 * Handles contribution limits for after-tax retirement accounts.
 * MUTATES the yearState object directly.
 * 
 * @param {Array} currentYearEventsLog - Array to push log entries into.
 * @param {Object | null} currentInvestStrategyInfo - Strategy info for the current year, or null.
 * @param {Object} yearState - The current year's state object (will be modified).
 * @param {Number} currentInflationFactor - Inflation factor for the year.
 * @param {Object} modelData - Full model data for accessing investment type definitions.
 * @param {Function} [prng=Math.random] - Optional seeded random number generator (unused here, but accepted for consistency).
 * @returns {Object} - The potentially modified yearState object.
 */
function processInvestEvents(currentYearEventsLog, currentInvestStrategyInfo, yearState, currentInflationFactor, modelData, prng = Math.random) {
    
    if (!currentInvestStrategyInfo || !currentInvestStrategyInfo.strategy) {
        // console.log(`Year ${yearState.year}: No investment strategy active.`);
        return yearState;
    }

    const strategy = currentInvestStrategyInfo.strategy;
    const defaultMaximumCash = 20000; // Default if not specified? Or take from scenario?
    const maximumCash = currentInvestStrategyInfo.newMaximumCash ?? defaultMaximumCash; // Use event override if available
    
    let excessCash = yearState.cash - maximumCash;

    if (excessCash <= 0) {
        // console.log(`Year ${yearState.year}: No excess cash (${yearState.cash.toFixed(2)}) above maximum (${maximumCash.toFixed(2)}) to invest.`);
        return yearState;
    }

    // console.log(`Year ${yearState.year}: Processing Invest Event. Excess Cash: ${excessCash.toFixed(2)}`);

    // --- Calculate Initial Purchase Amounts based on Allocation --- 
    let initialPurchases = {}; // { investmentName: amount }
    let totalAllocated = 0;

    // Helper to calculate purchases for a specific allocation type
    const calculateTypeAllocation = (allocationMap, totalAllocationPercent, totalCashToAllocate, renormalizeFactor = 1) => {
        if (!allocationMap || Object.keys(allocationMap).length === 0 || totalAllocationPercent <= 0) return;
        
        // Apply renormalizeFactor to the cash allocated to this type
        const typeExcessCash = totalCashToAllocate * (totalAllocationPercent / 100) * renormalizeFactor;
        
        let sumPct = 0;
        Object.values(allocationMap).forEach(pct => sumPct += (pct || 0)); // Sum percentages in this map, handle null/undefined
        if (sumPct <= 0) { // Use <= 0
             // If sub-allocation sums to zero or less, maybe distribute equally to defined targets?
             const targetNames = Object.keys(allocationMap);
             if (targetNames.length > 0) {
                 const perTargetAmount = typeExcessCash / targetNames.length;
                 targetNames.forEach(name => {
                     initialPurchases[name] = (initialPurchases[name] || 0) + perTargetAmount;
                     totalAllocated += perTargetAmount; // Track allocation
                 });
             }
             return;
        }

        for (const [name, percent] of Object.entries(allocationMap)) {
            const purchaseAmount = typeExcessCash * ((percent || 0) / sumPct);
            initialPurchases[name] = (initialPurchases[name] || 0) + purchaseAmount;
            totalAllocated += purchaseAmount; // Track allocation
        }
    };

    // Calculate renormalization factor excluding pre-tax
    let renormalizeFactor = 1.0;
    if (strategy.taxStatusAllocation) {
        const includedCategories = ['after-tax', 'non-retirement', 'tax-exempt'];
        let totalIncludedPercent = 0;
        includedCategories.forEach(cat => totalIncludedPercent += (strategy.taxStatusAllocation[cat] || 0));
        
        // Avoid division by zero and handle case where only pre-tax has allocation
        if (totalIncludedPercent > 0 && totalIncludedPercent < 100) {
            renormalizeFactor = 100 / totalIncludedPercent;
        } else if (totalIncludedPercent <= 0) {
            // If only pre-tax was specified (or zero allocation everywhere else), 
            // maybe distribute excess cash equally among all non-pre-tax, non-RMD/Roth accounts?
            // For now, we'll just effectively invest nothing via taxStatusAllocation in this case.
            renormalizeFactor = 0; // Prevent allocation via tax status if only pre-tax had % > 0
        }
        // If totalIncludedPercent is 100, renormalizeFactor remains 1.0
    }

    // Calculate for each tax status type based on its top-level allocation, excluding pre-tax
    if (strategy.taxStatusAllocation) {
        // Skip pre-tax: calculateTypeAllocation(strategy.preTaxAllocation, strategy.taxStatusAllocation['pre-tax'], excessCash, renormalizeFactor);
        calculateTypeAllocation(strategy.afterTaxAllocation, strategy.taxStatusAllocation['after-tax'], excessCash, renormalizeFactor);
        calculateTypeAllocation(strategy.nonRetirementAllocation, strategy.taxStatusAllocation['non-retirement'], excessCash, renormalizeFactor);
        calculateTypeAllocation(strategy.taxExemptAllocation, strategy.taxStatusAllocation['tax-exempt'], excessCash, renormalizeFactor);
    }

    // Adjust totalAllocated slightly due to potential floating point issues if needed
    // Recalculate totalAllocated based on initialPurchases map
    totalAllocated = Object.values(initialPurchases).reduce((sum, val) => sum + val, 0);
    
    // Scale purchases slightly to match excessCash EXACTLY to avoid minor discrepancies
    if (excessCash > 0.01 && Math.abs(totalAllocated - excessCash) > 0.01) {
         console.warn(`Year ${yearState.year}: Invest Event scaling purchases. Initial Allocated ${totalAllocated.toFixed(2)}, Excess Cash ${excessCash.toFixed(2)}`);
         const scaleFactor = excessCash / totalAllocated;
         totalAllocated = 0; // Reset for recalculation
         for (const name in initialPurchases) {
             initialPurchases[name] *= scaleFactor;
             totalAllocated += initialPurchases[name]; // Recalculate total allocated after scaling
         }
    }
    
    // --- Adjust for Individual After-Tax Contribution Limits --- 
    let finalPurchases = { ...initialPurchases };
    let totalReductionFromLimits = 0;
    const initialNonRetirementPurchases = {}; // Track initial non-retirement targets
    
    // First pass: Identify non-retirement targets and cap after-tax contributions individually
    for (const name in initialPurchases) {
        const purchaseAmount = initialPurchases[name];
        if (purchaseAmount <= 0) continue;

        const investment = yearState.investments.find(inv => inv.name === name);
        if (!investment || investment.name.includes('(RMD)') || investment.name.includes('(Roth)')) { 
            // Also explicitly skip RMD/Roth named accounts here, though they shouldn't be targeted by strategy
            finalPurchases[name] = 0; // Cannot purchase if not found or is RMD/Roth
            totalReductionFromLimits += purchaseAmount; // Treat the full amount as needing redistribution if invalid target
            delete initialNonRetirementPurchases[name]; // Remove from potential redistribution targets
            continue;
        }

        if (investment.accountTaxStatus === 'non-retirement') {
            initialNonRetirementPurchases[name] = purchaseAmount;
        }
        
        if (investment.accountTaxStatus === 'after-tax') {
            const initialDef = modelData.scenario.investments.find(inv => inv.name === name);
            let individualLimit = Infinity;
            if (initialDef && initialDef.maxAnnualContribution) {
                 individualLimit = initialDef.maxAnnualContribution * currentInflationFactor; 
            }

            if (purchaseAmount > individualLimit) {
                const reduction = purchaseAmount - individualLimit;
                // console.log(`Year ${yearState.year}: Capping contribution for '${name}'. Initial: ${purchaseAmount.toFixed(2)}, Limit: ${individualLimit.toFixed(2)}, Reduction: ${reduction.toFixed(2)}`);
                finalPurchases[name] = individualLimit; // Cap the purchase
                totalReductionFromLimits += reduction;
            }
        }
        // Explicitly skip pre-tax accounts for contribution limits and redistribution logic
        if (investment.accountTaxStatus === 'pre-tax') {
             finalPurchases[name] = 0; // Ensure no purchase happens into pre-tax via this event
             totalReductionFromLimits += purchaseAmount; // The amount intended for pre-tax needs redistribution
             delete initialNonRetirementPurchases[name]; // It wasn't non-retirement anyway
        }
    }

    // Second pass: Redistribute the total reduction to non-retirement accounts if possible
    if (totalReductionFromLimits > 0.01) { // Only redistribute if reduction is significant
        const initialNonRetirementTotal = Object.values(initialNonRetirementPurchases).reduce((sum, val) => sum + val, 0);

        if (initialNonRetirementTotal > 0) {
            let appliedIncrease = 0;
            // console.log(`Year ${yearState.year}: Redistributing ${totalReductionFromLimits.toFixed(2)} from capped/excluded accounts to non-retirement.`);
            for (const name in initialNonRetirementPurchases) {
                // Find the investment again to ensure it still exists and is non-retirement
                const targetInv = yearState.investments.find(inv => inv.name === name && inv.accountTaxStatus === 'non-retirement');
                if (!targetInv) continue;
                
                const proportion = initialNonRetirementPurchases[name] / initialNonRetirementTotal;
                const increase = totalReductionFromLimits * proportion;
                finalPurchases[name] = (finalPurchases[name] || 0) + increase; // Increase the final purchase amount
                appliedIncrease += increase;
                // console.log(`    Increasing '${name}' purchase by ${increase.toFixed(2)}.`);
            }
             // Sanity check log
             // console.log(`    Total Increase Applied: ${appliedIncrease.toFixed(2)} (Should approx equal ${totalReductionFromLimits.toFixed(2)})`);
        } else {
             // Keep this warning
             console.warn(`Year ${yearState.year}: Contributions capped/excluded by ${totalReductionFromLimits.toFixed(2)}, but no non-retirement accounts in strategy to absorb reduction. This amount remains as cash.`);
        }
    }

    // --- Apply Final Purchases --- 
    let totalActuallyInvested = 0;
    for (const name in finalPurchases) {
        const purchaseAmount = finalPurchases[name];
        if (purchaseAmount <= 0.01) continue; // Ignore negligible amounts

        const index = yearState.investments.findIndex(inv => inv.name === name);
        if (index === -1) {
            // Should have been caught earlier, but double-check
            console.warn(`Year ${yearState.year}: Investment '${name}' not found when applying final purchase.`);
            continue;
        }

        // Ensure costBasis exists before adding to it
        if (yearState.investments[index].costBasis === undefined || yearState.investments[index].costBasis === null) {
             yearState.investments[index].costBasis = 0; // Initialize if missing
        }
        
        yearState.investments[index].value += purchaseAmount;
        yearState.investments[index].costBasis += purchaseAmount;
        totalActuallyInvested += purchaseAmount;
        
        // Log individual investment action
        currentYearEventsLog.push({
            year: yearState.year,
            type: 'invest',
            details: `Invested ${purchaseAmount.toFixed(2)} into '${name}'. New Value: ${yearState.investments[index].value.toFixed(2)}, New Basis: ${yearState.investments[index].costBasis.toFixed(2)}`
        });
        // console.log(`    Invested ${purchaseAmount.toFixed(2)} into '${name}'. New Value: ${yearState.investments[index].value.toFixed(2)}, New Basis: ${yearState.investments[index].costBasis.toFixed(2)}`);
    }

    // Update cash based on what was ACTUALLY invested
    yearState.cash -= totalActuallyInvested;
    
    // Recalculate totals
    yearState.totalInvestmentValue = (yearState.investments || []).reduce((sum, inv) => sum + (inv?.value || 0), 0);
    yearState.totalAssets = yearState.totalInvestmentValue + yearState.cash;

    // console.log(`Year ${yearState.year}: Finished Invest Event. Invested: ${totalActuallyInvested.toFixed(2)}, Final Cash: ${yearState.cash.toFixed(2)}, Final Assets: ${yearState.totalAssets.toFixed(2)}`);

    // Only log if an active strategy exists for the year
    if (currentInvestStrategyInfo && currentInvestStrategyInfo.strategy) {
        // REMOVED Overall strategy log - replaced by individual logs
        /*
        currentYearEventsLog.push({
            year: yearState.year,
            type: 'invest',
            details: `Applied Invest Strategy. Method: ${currentInvestStrategyInfo.method}. Cash Limit: ${maximumCash !== undefined ? maximumCash.toFixed(2) : 'default'}. Strategy: ${JSON.stringify(currentInvestStrategyInfo.strategy)}`
        });
        */
    }

    return yearState;
}

module.exports = {
    processInvestEvents
};
