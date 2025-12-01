/**
 * RequiredMinimumDistributions.js
 * 
 * Calculates and processes Required Minimum Distributions (RMDs) for a given year.
 */

const { performWithdrawal } = require('../Utils/WithdrawalUtils'); // Import withdrawal utility

/**
 * Finds or creates a target investment account for RMD withdrawals.
 * 
 * @param {Array} investments - The current list of investments in yearState.
 * @param {Object} sourceInvestment - The pre-tax investment being withdrawn from.
 * @param {string} targetTaxStatus - The desired tax status (e.g., 'non-retirement').
 * @returns {Object} The found or newly created target investment object.
 */
function findOrCreateTargetAccount(investments, sourceInvestment, targetTaxStatus) {
    // Look for an existing investment with the same type and target status
    let targetAccount = investments.find(inv => 
        inv.investmentType?._id?.toString() === sourceInvestment.investmentType?._id?.toString() && 
        inv.accountTaxStatus === targetTaxStatus
    );

    if (!targetAccount) {
        // Create a new one if not found
        // console.log(`Creating new ${targetTaxStatus} account for RMD transfer from ${sourceInvestment.name}`);
        targetAccount = {
            // Try to create a meaningful name
            name: `${sourceInvestment.investmentType?.name || 'UnknownType'} (${targetTaxStatus})`, 
            value: 0, 
            investmentType: sourceInvestment.investmentType, // Reference the same type
            accountTaxStatus: targetTaxStatus,
             // Add other necessary fields if required by schema (e.g., _id, purchasePrice)
             // For simplicity, we'll let the main structure handle potential additions later if needed
             // We might need a mechanism to generate unique IDs if creating new DB entries eventually.
             _id: `temp-rmd-${Date.now()}-${Math.random()}` // Temporary ID for simulation tracking
        };
        investments.push(targetAccount);
    }
    return targetAccount;
}

/**
 * Processes Required Minimum Distributions (RMDs) for the simulation year.
 * 
 * @param {Array} rmdStrategies - Ordered list of pre-tax investment names for withdrawal.
 * @param {Array} rmdTables - RMD lookup tables from taxData.
 * @param {number} userAge - The user's age in the current simulation year.
 * @param {Object} yearState - The current state of the simulation year (will be modified).
 * @param {Object} previousYearState - State object from the previous year's simulation (optional, for initial RMD)
 * @param {Array} currentYearEventsLog - Array to push log entries into.
 * @param {Function} [prng=Math.random] - Optional seeded random number generator (unused in RMD, but accepted for consistency).
 * @returns {Object} - Object containing the updated year state and the total RMD income generated.
 *                     { updatedYearState: Object, rmdIncome: Number }
 */
function processRequiredMinimumDistributions(rmdStrategies, rmdTables, userAge, yearState, previousYearState = null, currentYearEventsLog = [], prng = Math.random) {
    
    // --- Basic Validation & Age Check (Moved to the beginning) ---
    if (!userAge || userAge < 73) {
        // Log only if debugging needed for why it skipped
        // console.log(`---> [RMD] Skipping for Year ${yearState.year}, Age ${userAge} (Below RMD age)`);
        return { updatedYearState: yearState, rmdIncome: 0 };
    }
    
    // console.log(`---> [RMD] Entering for Year ${yearState.year}, Age ${userAge}`); // Log only if age check passes
    
    let totalRmdIncomeThisYear = 0;
    
    // --- CHECK 1: Missing Strategies or RMD Tables ---
    if (!rmdStrategies || rmdStrategies.length === 0 || !rmdTables || rmdTables.length === 0) {
        // console.warn(`---> [RMD Skip] Year ${yearState.year}, Age ${userAge}: Missing RMD strategies or tables.`); // UPDATED LOG
        return { updatedYearState: yearState, rmdIncome: 0 };
    }
    
    // --- Select the Correct RMD Table (Assuming Uniform Lifetime for now) ---
    const uniformLifetimeTable = rmdTables.find(table => table.tableType && table.tableType.includes('Uniform Lifetime'));
    
    // --- CHECK 2: Uniform Lifetime Table Not Found ---
    if (!uniformLifetimeTable || !uniformLifetimeTable.rows || uniformLifetimeTable.rows.length === 0) {
        // console.warn(`---> [RMD Skip] Year ${yearState.year}, Age ${userAge}: Uniform Lifetime RMD table not found or empty.`); // UPDATED LOG
        return { updatedYearState: yearState, rmdIncome: 0 };
    }
    
    // --- Find the RMD factor (distribution period) for the user's age within the selected table's rows ---
    const rmdRow = uniformLifetimeTable.rows.find(row => row.age === userAge);
    
    // --- CHECK 3: RMD Row/Factor Not Found for Age ---
    if (!rmdRow || typeof rmdRow.distributionPeriod !== 'number' || rmdRow.distributionPeriod <= 0) {
        // console.warn(`---> [RMD Skip] Year ${yearState.year}, Age ${userAge}: Could not find valid RMD distribution period for age.`); // UPDATED LOG
        return { updatedYearState: yearState, rmdIncome: 0 };
    }
    const rmdDistributionPeriod = rmdRow.distributionPeriod;

    // --- Determine Previous Year's Relevant Account Balances ---
    // RMD is based on the PREVIOUS year's Dec 31 balance of pre-tax retirement accounts.
    let previousYearPreTaxBalance = 0;
    if (previousYearState && previousYearState.investments) {
        previousYearState.investments.forEach(inv => {
            if (inv.accountTaxStatus === 'pre-tax') {
                previousYearPreTaxBalance += (inv.value || 0);
            }
        });
    } else if (yearState.year === new Date().getFullYear()) { // Very first year handling
         // Use initial balances if it's the absolute first year of the overall simulation
         (yearState.investments || []).forEach(inv => {
             if (inv.accountTaxStatus === 'pre-tax') {
                 previousYearPreTaxBalance += (inv.value || 0); // Use initial value as proxy
             }
         });
    }
    
    // --- CHECK 4: Zero Pre-Tax Balance ---
    if (previousYearPreTaxBalance <= 0) {
        // No pre-tax balance from previous year, no RMD needed.
        // console.warn(`---> [RMD Skip] Year ${yearState.year}, Age ${userAge}: No previous year pre-tax balance (${previousYearPreTaxBalance.toFixed(2)}).`); // ADDED LOG
        return { updatedYearState: yearState, rmdIncome: 0 };
    }

    // --- Calculate Total RMD Amount ---
    const totalRmdAmount = previousYearPreTaxBalance / rmdDistributionPeriod; // Use the correct period
    // console.log(`Year ${yearState.year} (Age ${userAge}): Prev PreTax Balance: ${previousYearPreTaxBalance.toFixed(2)}, RMD Period: ${rmdDistributionPeriod}, Calculated RMD: ${totalRmdAmount.toFixed(2)}`);

    // --- CHECK 5: Zero Calculated RMD Amount ---
    if (totalRmdAmount <= 0) {
        // console.warn(`---> [RMD Skip] Year ${yearState.year}, Age ${userAge}: Calculated RMD amount is zero or less (${totalRmdAmount.toFixed(2)}).`); // ADDED LOG
        return { updatedYearState: yearState, rmdIncome: 0 };
    }

    // --- Perform Withdrawals ---
    let actualWithdrawnTotal = 0;
    const withdrawalsBySource = {}; // Track withdrawals per source for adding to (RMD) accounts

    // console.log(`---> [RMD Withdraw] Year ${yearState.year}: Trying to withdraw ${totalRmdAmount.toFixed(2)}. Strategy: ${JSON.stringify(rmdStrategies)}`);

    for (const sourceInvestmentName of rmdStrategies) {
        if (totalRmdAmount <= actualWithdrawnTotal) break; // Stop if RMD is met

        const sourceInv = yearState.investments.find(inv => inv.name === sourceInvestmentName);
        
        // Log source search result
        if (!sourceInv) {
            // console.log(`---> [RMD Withdraw Src] Year ${yearState.year}: Source '${sourceInvestmentName}' not found.`);
            continue;
        } 
        if (sourceInv.value <= 0) {
             // console.log(`---> [RMD Withdraw Src] Year ${yearState.year}: Source '${sourceInvestmentName}' found but has zero value.`);
             continue;
        }
        if (sourceInv.accountTaxStatus !== 'pre-tax') { // Also check if it's actually pre-tax
             // console.log(`---> [RMD Withdraw Src] Year ${yearState.year}: Source '${sourceInvestmentName}' found but is not pre-tax (Status: ${sourceInv.accountTaxStatus}). Skipping.`);
             continue;
        }

        // console.log(`---> [RMD Withdraw Src] Year ${yearState.year}: Found pre-tax source '${sourceInvestmentName}' with value ${sourceInv.value.toFixed(2)}.`);

        const amountToWithdrawFromSource = Math.min(
            sourceInv.value, // Max available
            totalRmdAmount - actualWithdrawnTotal // Amount still needed
        );

        if (amountToWithdrawFromSource > 0) {
            // Decrease source value and adjust cost basis proportionally
            const originalSourceValue = sourceInv.value;
            const originalSourceCostBasis = sourceInv.costBasis;
            sourceInv.value -= amountToWithdrawFromSource;
            if (originalSourceValue > 0) {
                sourceInv.costBasis = originalSourceCostBasis * (sourceInv.value / originalSourceValue);
            } else {
                sourceInv.costBasis = 0;
            }
            sourceInv.costBasis = Math.max(0, sourceInv.costBasis); // Ensure non-negative
            
            // Track the withdrawal amount for this source
            withdrawalsBySource[sourceInvestmentName] = (withdrawalsBySource[sourceInvestmentName] || 0) + amountToWithdrawFromSource;

            // Check if the source is pre-tax to determine income impact
            if (sourceInv.accountTaxStatus === 'pre-tax') {
                totalRmdIncomeThisYear += amountToWithdrawFromSource; // Add to taxable income
            }
            actualWithdrawnTotal += amountToWithdrawFromSource;
            // console.log(`RMD: Withdrew ${amountToWithdrawFromSource.toFixed(2)} from ${sourceInv.name}. Total withdrawn: ${actualWithdrawnTotal.toFixed(2)}`);
        }
    }
    
    // --- Deposit Withdrawn Amounts into (RMD) Accounts ---
    for (const sourceName in withdrawalsBySource) {
        const withdrawnAmount = withdrawalsBySource[sourceName];
        if (withdrawnAmount <= 0) continue;

        const sourceInv = yearState.investments.find(inv => inv.name === sourceName);
        if (!sourceInv) {
            console.warn(`RMD: Original source investment ${sourceName} not found during deposit phase?`);
            continue;
        }
        
        const rmdInvName = `${sourceName} (RMD)`;
        let rmdInv = yearState.investments.find(inv => inv.name === rmdInvName);

        if (!rmdInv) {
            // Create the new RMD investment if it doesn't exist
            rmdInv = {
                name: rmdInvName,
                investmentType: sourceInv.investmentType, // Copy reference/data
                accountTaxStatus: 'non-retirement', // CORRECTED PROPERTY NAME
                value: 0,
                costBasis: 0
            };
            yearState.investments.push(rmdInv); // Add to the investments array
            // console.log(`---> [RMD Deposit] Created new investment: ${rmdInvName} for year ${yearState.year}`); // ADDED LOG
            currentYearEventsLog.push({ 
              year: yearState.year, 
              type: 'rmd', 
              details: `Created RMD account '${rmdInvName}'.`
            });
        }

        // Increase RMD investment value and cost basis
        rmdInv.value += withdrawnAmount;
        rmdInv.costBasis += withdrawnAmount; // Cost basis is the amount moved
        // console.log(`---> [RMD Deposit] Deposited ${withdrawnAmount.toFixed(2)} into ${rmdInv.name} (New Value: ${rmdInv.value.toFixed(2)}) for year ${yearState.year}`); // ADDED LOG
        currentYearEventsLog.push({ 
          year: yearState.year, 
          type: 'rmd', 
          details: `Deposited ${withdrawnAmount.toFixed(2)} from source '${sourceName}' to '${rmdInv.name}'.`
        });
    }

    // --- Handle Shortfall (Optional) ---
    // If actualWithdrawnTotal < totalRmdAmount, it means there weren't enough funds.
    // Decide how to handle this - log a warning, potentially withdraw from cash? For now, just log.
    if (actualWithdrawnTotal < totalRmdAmount && totalRmdAmount > 0) {
         console.warn(`Year ${yearState.year} RMD Shortfall: Needed ${totalRmdAmount.toFixed(2)}, but only withdrew ${actualWithdrawnTotal.toFixed(2)} from investments.`);
        // Optionally, withdraw shortfall from cash?
        // const shortfall = totalRmdAmount - actualWithdrawnTotal;
        // if (updatedYearState.cash >= shortfall) {
        //     updatedYearState.cash -= shortfall;
        //     console.log(`RMD: Covered shortfall of ${shortfall.toFixed(2)} from cash.`);
        // } else {
        //     console.error(`Year ${updatedYearState.year} RMD Shortfall cannot be covered by cash.`);
        // }
    }

    // --- Update State ---
    yearState.curYearIncome += totalRmdIncomeThisYear; // Add any income generated from pre-tax withdrawals
    // console.log(`RMD End: Year ${yearState.year}, Total RMD Income Added: ${totalRmdIncomeThisYear.toFixed(2)}, Final Income: ${yearState.curYearIncome.toFixed(2)}`);

    // console.log(`---> [RMD] Returning for Year ${yearState.year}. RMD Income: ${totalRmdIncomeThisYear}. Investments:`, JSON.stringify(yearState.investments.map(inv => inv.name))); // ADDED RETURN LOG
    return { updatedYearState: yearState, rmdIncome: totalRmdIncomeThisYear };
}

module.exports = {
    processRequiredMinimumDistributions
};
