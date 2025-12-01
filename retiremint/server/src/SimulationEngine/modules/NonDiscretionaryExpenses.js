/**
 * NonDiscretionaryExpenses.js - Module for processing non-discretionary expense payments and withdrawals.
 */
const { performWithdrawal } = require('../Utils/WithdrawalUtils'); // Import the utility

/**
 * Pays non-discretionary expenses and previous year's taxes.
 * Uses the performWithdrawal utility.
 * 
 * @param {number} totalPaymentNeeded - Total amount needed (Current NonDisc Expenses + Previous Year Taxes).
 * @param {Object} yearState - The current state object for the year.
 * @param {Array<string>} withdrawalStrategy - Ordered list of investment names to withdraw from.
 * @param {number|null} userAge - User's age for checking early withdrawal penalty.
 * @param {Function} [prng=Math.random] - Optional seeded random number generator (unused here, but accepted for consistency).
 * @returns {Object} - The updated yearState object.
 */
function processNonDiscretionaryExpenses(totalPaymentNeeded, yearState, withdrawalStrategy, userAge, prng = Math.random) {
    
    // console.log(`Year ${yearState.year}: Starting Non-Discretionary Payments. Need: ${totalPaymentNeeded.toFixed(2)}`);

    if (totalPaymentNeeded <= 0) {
        // console.log(`Year ${yearState.year}: No non-discretionary payment needed.`);
        return yearState; // Nothing to pay
    }

    // Call the utility to handle payment/withdrawal
    // performWithdrawal mutates yearState directly
    const { totalPaid } = performWithdrawal(totalPaymentNeeded, yearState, withdrawalStrategy, userAge);

    // Update the total expenses paid this year in the state
    // Note: We add totalPaid, which might be less than totalPaymentNeeded if funds were insufficient
    yearState.curYearExpenses += totalPaid;

    // console.log(`Year ${yearState.year}: Finished Non-Discretionary Payments. Amount Paid: ${totalPaid.toFixed(2)}`);

    // The yearState object was modified in place by performWithdrawal
    return yearState; 
}

module.exports = {
    processNonDiscretionaryExpenses
};
