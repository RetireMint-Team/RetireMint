/**
 * DiscretionaryExpenses.js - Module for processing discretionary expense payments.
 */
const { performWithdrawal } = require('../Utils/WithdrawalUtils'); // Import the utility
// Import shared calculation functions - Re-add for state tracking
const { calculateCurrentBaseAmount, sampleNormal, sampleUniform } = require('../Utils/CalculationUtils'); 

// --- Helper functions for random sampling --- 
// Removed - Moved to CalculationUtils.js
// function sampleNormal(mean, stdDev) {
//   ...
// }
// function sampleUniform(min, max) {
//   ...
// }
// --- End Helper functions ---

/**
 * Calculates and pays discretionary expenses based on spending strategy and financial goal.
 * Updates yearState by potentially calling performWithdrawal.
 * 
 * @param {Object} modelData - Contains scenario, events, financialGoal.
 * @param {Array} eventsActiveThisYear - Array of active event names for the current year.
 * @param {Array<string>} spendingStrategy - Ordered list of discretionary expense event names.
 * @param {Array<string>} withdrawalStrategy - Ordered list of investment names for withdrawals.
 * @param {number} financialGoal - The minimum total assets to maintain.
 * @param {number|null} userAge - User's age for penalty checks.
 * @param {string} maritalStatusThisYear - 'single' or 'married'.
 * @param {number} currentInflationFactor - The cumulative inflation factor for the year.
 * @param {Object} yearState - The current year's state object (will be modified).
 * @param {Object} previousExpenseStates - State of discretionary expense events from the previous year.
 * @param {Function} [prng=Math.random] - Optional seeded random number generator.
 * @returns {Object} - { updatedYearState: Object, paidDiscExpenses: Object, expenseEventStates: Object }
 */
function processDiscretionaryExpenses(
    modelData,
    eventsActiveThisYear,
    spendingStrategy,
    withdrawalStrategy,
    financialGoal,
    userAge,
    maritalStatusThisYear,
    currentInflationFactor,
    yearState,
    previousExpenseStates = {},
    prng = Math.random
) {
    const scenario = modelData.scenario;
    const paidDiscExpenses = {}; // Track expenses actually paid
    const updatedDiscExpenseEventStates = {}; // Track state for next year's events

    if (!spendingStrategy || spendingStrategy.length === 0) {
        // console.log(`Year ${yearState.year}: No discretionary spending strategy defined.`);
        // yearState.discExpenseEventStates = {}; // State will be updated below if expenses run
        return { updatedYearState: yearState, paidDiscExpenses, expenseEventStates: updatedDiscExpenseEventStates };
    }
    if (!scenario || !scenario.events) {
        console.error(`DiscretionaryExpenses Error: Invalid modelData structure. Missing scenario or scenario.events.`);
        // yearState.discExpenseEventStates = {};
        return { updatedYearState: yearState, paidDiscExpenses, expenseEventStates: updatedDiscExpenseEventStates };
    }

    // console.log(`Year ${yearState.year}: Starting Discretionary Expense Processing. Goal: ${financialGoal.toFixed(2)}, Current Assets: ${yearState.totalAssets.toFixed(2)}`);

    // --- Calculate Potential Discretionary Spending and Prepare Next Year's State --- 
    const allEvents = modelData.scenario.events;
    const potentialSpendingMap = new Map(); // Store potential amount per expense name
    
    eventsActiveThisYear.forEach(eventName => {
        const event = allEvents.find(e => e.name === eventName);
        if (event && event.type === 'expense' && event.expense?.isDiscretionary) {
            const expenseDetails = event.expense;
            const previousState = previousExpenseStates[eventName] || null;
            const previousBaseAmount = previousState ? previousState.baseAmount : expenseDetails.initialAmount; 
            
            // Calculate the current year's uninflated base amount using the utility
            const currentBaseAmount = calculateCurrentBaseAmount(expenseDetails.expectedAnnualChange, previousBaseAmount, prng); // Pass prng
            
            let inflatedCurrentAmount = 0;

            // Inflate if necessary
            if (expenseDetails.inflationAdjustment) {
                inflatedCurrentAmount = currentBaseAmount * currentInflationFactor;
            } else {
                inflatedCurrentAmount = currentBaseAmount;
            }
            
            // Adjust for marital status if applicable
            if (maritalStatusThisYear === 'married' && expenseDetails.marriedPercentage != null) {
                 inflatedCurrentAmount *= (expenseDetails.marriedPercentage / 100);
            } // If single, use 100%
            
            potentialSpendingMap.set(eventName, inflatedCurrentAmount); // Store the calculated potential amount
            
            // Update state for next year (store uninflated base)
            if (!updatedDiscExpenseEventStates[eventName]) {
                updatedDiscExpenseEventStates[eventName] = {};
            }
            updatedDiscExpenseEventStates[eventName].baseAmount = currentBaseAmount; // Store the uninflated base
        }
    });

    // --- Determine Spending Limit based on Strategy and Pay Expenses --- 
    for (const expenseName of spendingStrategy) {
        if (!potentialSpendingMap.has(expenseName)) continue;

        // Retrieve the pre-calculated potential amount
        const potentialAmountThisYear = potentialSpendingMap.get(expenseName);
        
        // Check affordability against financial goal
        const maxAffordable = Math.max(0, yearState.totalAssets - financialGoal);
        const amountToPay = Math.min(potentialAmountThisYear, maxAffordable);

        if (amountToPay <= 0.01) {
            break; 
        }

        const { totalPaid } = performWithdrawal(amountToPay, yearState, withdrawalStrategy, userAge); 

        yearState.curYearExpenses += totalPaid;

        if (totalPaid > 0) {
            paidDiscExpenses[expenseName] = totalPaid;
        }

        if (totalPaid < amountToPay) {
             console.warn(`Year ${yearState.year}: Could only pay ${totalPaid.toFixed(2)} / ${amountToPay.toFixed(2)} for '${expenseName}' due to insufficient funds after withdrawal attempt.`);
             if (yearState.totalAssets < financialGoal) { 
                console.warn(`    Assets dropped below goal after partial payment of ${expenseName}. Stopping discretionary spending.`);
                break;
             }
        }
        
         if (totalPaid < potentialAmountThisYear && totalPaid >= amountToPay) {
             break;
         }
    }
    
    // Note: yearState.discExpenseEventStates is NOT updated here anymore.
    // It will be updated in SimulateYear.js using the returned updatedDiscExpenseEventStates.

    // --- Return Updated State, Paid Expenses, and State for Next Year --- 
    return {
        updatedYearState: yearState,
        paidDiscExpenses,
        expenseEventStates: updatedDiscExpenseEventStates // Return the calculated state for next year
    };
}

module.exports = {
    processDiscretionaryExpenses
};
