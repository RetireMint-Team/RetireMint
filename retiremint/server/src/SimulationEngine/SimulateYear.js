/**
 * SimulateYear.js - Main module for simulating a single year in the financial model
 * 
 * This module integrates all simulation components to process a single year of financial activity:
 * 1. Process preliminary calculations (inflation, tax brackets)
 * 2. Process income events
 * 3. Handle Required Minimum Distributions (RMDs)
 * 4. Update investment values
 * 5. Process Roth conversions
 * 6. Pay non-discretionary expenses and taxes
 * 7. Pay discretionary expenses
 * 8. Process invest events
 * 9. Process rebalance events
 */

// Import all component modules
const { runIncomeEvents } = require('./modules/IncomeEvents');
const { processRequiredMinimumDistributions } = require('./modules/RequiredMinimumDistributions');
const { processInvestmentReturns } = require('./modules/InvestmentReturns');
const { processRothConversion } = require('./modules/RothConversion');
const { processNonDiscretionaryExpenses } = require('./modules/NonDiscretionaryExpenses');
const { calculateCurrentNonDiscExpenses } = require('./modules/NonDiscretionaryExpenseEvents'); // Import new expense calculator
const { processDiscretionaryExpenses } = require('./modules/DiscretionaryExpenses'); // Import new discretionary expense processor
const { processInvestEvents } = require('./modules/InvestEvents'); // Import Invest processor
const { processRebalanceEvents } = require('./modules/RebalanceEvents'); // Import Rebalance processor
const { calculateAdjustedTaxData } = require('./modules/Preliminaries'); // Import the tax data adjuster
const { calculateIncomeTax, calculateCapitalGainsTax } = require('./Utils/TaxCalculators'); // Import tax calculators
const { performWithdrawal } = require('./Utils/WithdrawalUtils'); // Import withdrawal utility

/**
 * Simulate a single year of financial activity
 * @param {Object} modelData - Contains scenario, taxData, etc.
 * @param {Array} investArray - Yearly investment strategy info or null
 * @param {Array} eventsByYear - Array of active event names per year
 * @param {Array} rebalanceArray - Yearly rebalance info or null
 * @param {Array} inflationArray - Yearly compounded inflation factor
 * @param {Array} maritalStatusArray - Yearly marital status ('single' or 'married')
 * @param {Number} currentYearIndex - The index (0 to numYears-1) of the year being simulated
 * @param {Object} previousYearState - State object from the previous year's simulation
 * @param {Function} [prng=Math.random] - Optional seeded random number generator.
 * @returns {Object} - Final state for the current year
 */
function simulateYear(modelData, investArray, eventsByYear, rebalanceArray, inflationArray, maritalStatusArray, currentYearIndex, previousYearState = null, prng = Math.random) {
  
  const currentYearEventsLog = []; // <-- Initialize log array for this year

  // --- Extract Core Data from modelData --- 
  const scenario = modelData.scenario;
  const taxData = modelData.taxData;
  if (!scenario || !taxData) {
      throw new Error(`SimulateYear Error: Missing scenario or taxData in modelData for year index ${currentYearIndex}.`);
  }
  const currentYear = new Date().getFullYear() + currentYearIndex;
  
  // --- Extract Data Specific to This Year --- 
   
  const currentInflationFactor = inflationArray[currentYearIndex]; 
  const eventsActiveThisYear = eventsByYear[currentYearIndex];     
  const maritalStatusThisYear = maritalStatusArray[currentYearIndex]; // Get status for the current year

  // --- User/Spouse Ages & Status (derive from scenario and index) --- 
  const userAge = scenario.birthYear ? (currentYear - scenario.birthYear) : null;
  const spouseAge = (scenario.scenarioType === 'married' && scenario.spouseBirthYear) ? (currentYear - scenario.spouseBirthYear) : null;
  
  // --- Extract Other Necessary Parameters --- 
  const financialGoal = scenario.financialGoal;
  // Extract strategies from simulationSettings within scenario
  const simulationSettings = scenario.simulationSettings || {}; 
  const spendingStrategy = simulationSettings.spendingStrategy;
  const expenseWithdrawalStrategies = simulationSettings.expenseWithdrawalStrategies;
  const rmdStrategies = simulationSettings.rmdStrategies;
  const rothConversionStrategies = simulationSettings.rothConversionStrategies;
  const rothOptimizerEnable = simulationSettings.rothOptimizerEnable;
  const rothOptimizerStartYear = simulationSettings.rothOptimizerStartYear;
  const rothOptimizerEndYear = simulationSettings.rothOptimizerEndYear;

  // 1) preliminaries.js
  
  // --- Calculate Adjusted Tax Data using Preliminaries module --- 
  const {
      adjustedStandardDeduction,
      adjustedIncomeTaxBrackets,
      adjustedStateTaxBrackets,
      adjustedCapitalGainsBrackets
  } = calculateAdjustedTaxData(
      taxData, 
      maritalStatusThisYear, 
      currentYear, 
      currentYearIndex, 
      currentInflationFactor, 
      modelData  // Pass full modelData, not just userState
  );

  // Initialize the state for this year based on the previous state
  let yearState = {
    year: currentYear,
    userAge,
    spouseAge,
    scenarioType: maritalStatusThisYear,
    cash: previousYearState?.cash ?? (scenario.initialCash || 0), // Initialize cash correctly
    totalAssets: 0, // Will be calculated later
    // Initialize investments: carry over if exists, otherwise map from scenario adding costBasis
    investments: previousYearState?.investments 
        ? JSON.parse(JSON.stringify(previousYearState.investments)) 
        : (scenario.investments 
            ? JSON.parse(JSON.stringify(scenario.investments)).map(inv => ({ ...inv, costBasis: inv.value || 0 })) 
            : []),
    incomeEventStates: previousYearState?.incomeEventStates || {},
    curYearIncome: 0, // Initialize yearly totals
    curYearExpenses: 0, // This will track the SUM of expenses paid
    curYearTaxes: 0,
    curYearSS: 0,
    curYearGains: 0,
    curYearEarlyWithdrawals: 0,
    totalInvestmentValue: 0, // Placeholder
    nonDiscExpenseEventStates: previousYearState?.nonDiscExpenseEventStates || {}, // Initialize expense states
    discExpenseEventStates: previousYearState?.discExpenseEventStates || {}, // Initialize disc expense states
    expenseBreakdown: {}, // NEW: Initialize breakdown object
    incomeBreakdown: {} // NEW: Initialize income breakdown object
  };

  // Initial asset calculation if first year
   if (currentYearIndex === 0) {
       // Cost basis is initialized above when mapping scenario.investments
       yearState.totalInvestmentValue = calculateTotalAssets(yearState.investments); // Calculate initial investment value
       yearState.totalAssets = yearState.totalInvestmentValue + yearState.cash; // Initial total assets
   } else if (previousYearState) {
       // Carry over total assets from previous year before modifications THIS YEAR
       yearState.totalAssets = previousYearState.totalAssets;
       yearState.totalInvestmentValue = previousYearState.totalInvestmentValue;
       // Cash, investments (including costBasis), and expense states are carried over
   }

  // --- Pre-computation for Expenses/Taxes --- 
  let previousYearTaxes = 0;
  let nonDiscExpenseDetails = {}; // Store details from calculation
  let currentNonDiscExpensesTotal = 0; // Store the sum

  // Calculate Previous Year's Taxes (if not the first year)
  if (currentYearIndex > 0 && previousYearState) {
      // Recalculate the PREVIOUS year's adjusted tax data
      const prevYearIndex = currentYearIndex - 1;
      const prevYearMaritalStatus = maritalStatusArray[prevYearIndex];
      const prevYearInflationFactor = inflationArray[prevYearIndex];
      const prevYear = currentYear - 1;
      
      const {
          adjustedStandardDeduction: prevAdjStdDed, 
          adjustedIncomeTaxBrackets: prevAdjFedBrackets, 
          adjustedStateTaxBrackets: prevAdjStateBrackets, 
          adjustedCapitalGainsBrackets: prevAdjCapGainsBrackets
      } = calculateAdjustedTaxData(
          taxData, 
          prevYearMaritalStatus, 
          prevYear, 
          prevYearIndex, 
          prevYearInflationFactor, 
          modelData  // Pass full modelData, not just userState
      );

      const prevData = previousYearState;
    
      // a. Previous Federal Income Tax
      const prevFedTaxableIncomeGross = prevData.curYearIncome - (0.15 * prevData.curYearSS);
      const prevFedTaxableIncomeNet = Math.max(0, prevFedTaxableIncomeGross - prevAdjStdDed);
      const prevFedIncomeTax = calculateIncomeTax(prevFedTaxableIncomeNet, prevAdjFedBrackets);
      
      // a. Previous State Income Tax (Simplified)
      const prevStateTaxableIncomeNet = prevFedTaxableIncomeNet; // Simplification
      const prevStateIncomeTax = calculateIncomeTax(prevStateTaxableIncomeNet, prevAdjStateBrackets);
      
      // b. Previous Capital Gains Tax
      const prevCapGainsTax = calculateCapitalGainsTax(prevData.curYearGains, prevFedTaxableIncomeNet, prevAdjCapGainsBrackets);
      
      // Log individual previous year taxes paid (if > 0)
      if (prevFedIncomeTax > 0) currentYearEventsLog.push({ year: currentYear, type: 'tax', details: `Paid previous year Federal Income Tax: ${prevFedIncomeTax.toFixed(2)}` });
      if (prevStateIncomeTax > 0) currentYearEventsLog.push({ year: currentYear, type: 'tax', details: `Paid previous year State Income Tax: ${prevStateIncomeTax.toFixed(2)}` });
      if (prevCapGainsTax > 0) currentYearEventsLog.push({ year: currentYear, type: 'tax', details: `Paid previous year Capital Gains Tax: ${prevCapGainsTax.toFixed(2)}` });
      
      // c. Previous Early Withdrawal Tax (10% penalty)
      const prevEarlyWithdrawalPenalty = 0.10 * prevData.curYearEarlyWithdrawals;
      if (prevEarlyWithdrawalPenalty > 0) currentYearEventsLog.push({ year: currentYear, type: 'tax', details: `Paid previous year Early Withdrawal Penalty: ${prevEarlyWithdrawalPenalty.toFixed(2)}` });
      
      previousYearTaxes = prevFedIncomeTax + prevStateIncomeTax + prevCapGainsTax + prevEarlyWithdrawalPenalty;

      // Add individual taxes to the breakdown for THIS year's state
      if (prevFedIncomeTax > 0) yearState.expenseBreakdown['Federal Income Tax (Previous Year)'] = prevFedIncomeTax;
      if (prevStateIncomeTax > 0) yearState.expenseBreakdown['State Income Tax (Previous Year)'] = prevStateIncomeTax;
      if (prevCapGainsTax > 0) yearState.expenseBreakdown['Capital Gains Tax (Previous Year)'] = prevCapGainsTax;
      if (prevEarlyWithdrawalPenalty > 0) yearState.expenseBreakdown['Early Withdrawal Penalty (Previous Year)'] = prevEarlyWithdrawalPenalty;
      
      // console.log(`Year ${currentYear}: Calculated Previous Year (${prevYear}) Taxes: Fed=${prevFedIncomeTax.toFixed(2)}, State=${prevStateIncomeTax.toFixed(2)}, CapGains=${prevCapGainsTax.toFixed(2)}, EarlyPenalty=${prevEarlyWithdrawalPenalty.toFixed(2)}, Total=${previousYearTaxes.toFixed(2)}`);
  } else if (currentYearIndex === 0) {
      //  console.log(`Year ${currentYear}: First year, no previous taxes to calculate.`);
  } else if (currentYearIndex > 0 && !previousYearState) {
      // Add a specific warning if previousYearState is unexpectedly null/undefined after year 0
      console.warn(`Year ${currentYear}: Cannot calculate previous year's taxes. Missing previousYearState data.`);
  }

  // Calculate Current Year's Non-Discretionary Expenses
  try {
      const expenseResult = calculateCurrentNonDiscExpenses(
          modelData,
          eventsActiveThisYear,
          maritalStatusThisYear,
          currentInflationFactor,
          previousYearState?.nonDiscExpenseEventStates,
          prng
      );
      nonDiscExpenseDetails = expenseResult.nonDiscExpenseDetails;
      yearState.nonDiscExpenseEventStates = expenseResult.expenseEventStates;
      // Add these calculated amounts to the breakdown
      yearState.expenseBreakdown = { ...yearState.expenseBreakdown, ...nonDiscExpenseDetails };
      // Calculate the total for payment step
      currentNonDiscExpensesTotal = Object.values(nonDiscExpenseDetails).reduce((sum, val) => sum + val, 0);
      // console.log(`Year ${currentYear}: Calculated Current Non-Discretionary Expenses: ${currentNonDiscExpensesTotal.toFixed(2)}`);
  } catch (error) {
      console.error(`Year ${currentYear}: Error calculating current non-discretionary expenses:`, error);
      currentNonDiscExpensesTotal = 0; 
  }

  // Log individual non-discretionary expenses *before* payment step
  for (const [expenseName, amount] of Object.entries(nonDiscExpenseDetails || {})) {
      if (amount > 0) {
          currentYearEventsLog.push({ 
              year: currentYear, 
              type: 'expense', // Log as type 'expense'
              details: `Calculated non-discretionary expense '${expenseName}': ${amount.toFixed(2)} (Scheduled for payment)` 
          });
      }
  }

  // Total Payment Amount Needed for Step 6 (Non-Discretionary + Taxes)
  const totalPaymentNeededForStep6 = previousYearTaxes + currentNonDiscExpensesTotal;

  // 2) Run Income Events
  // console.log(`--- Year ${currentYear} (Idx ${currentYearIndex}): Processing Income Events ---`);
  try {
      const initialCashForYear = yearState.cash; // Cash before income is added
      // console.log(`[SimYear Log] Year ${currentYear}: Calling runIncomeEvents. Current Log Length: ${currentYearEventsLog.length}`);
      // Expect incomeResult to include an incomeBreakdown object
      const incomeResult = runIncomeEvents(
          modelData,                // Pass full model data (contains events)
          eventsActiveThisYear,     // Pass active event names
          maritalStatusThisYear,
          currentInflationFactor,
          previousYearState?.incomeEventStates, // Pass the income states from the *previous* year
          initialCashForYear,       // Pass cash *before* income processing
          currentYearEventsLog,      // Pass the log array for event logging
          currentYear,              // Pass the current year for logging
          prng                      // Pass prng
      );

      // Update yearState with the results from runIncomeEvents
      yearState.cash = incomeResult.cash;
      yearState.curYearIncome = incomeResult.curYearIncome;
      yearState.curYearSS = incomeResult.curYearSS;
      // Store the calculated states for the *next* year's previous state
      yearState.incomeEventStates = incomeResult.incomeEventStates;
      // Merge income breakdown from events
      yearState.incomeBreakdown = { ...yearState.incomeBreakdown, ...(incomeResult.incomeBreakdown || {}) }; 

      // Log the returned values
      // console.log(`Year ${currentYear}: Income Processed. Returned -> Cash: ${incomeResult.cash}, Taxable Income: ${incomeResult.curYearIncome}, SS Income: ${incomeResult.curYearSS}`);

  } catch (error) {
       console.error(`Year ${currentYear}: Error processing income events:`, error);
       // Decide how to handle error - stop simulation? Continue with 0 income impact?
       // Resetting calculated income for safety in case of partial processing
       yearState.curYearIncome = 0;
       yearState.curYearSS = 0;
       // Cash might be inconsistent if error occurred mid-way. Revert or use last known good?
       yearState.cash = previousYearState?.cash ?? (scenario.initialCash || 0); // Revert cash to previous state
       yearState.incomeEventStates = previousYearState?.incomeEventStates || {}; // Revert states
  }
  // console.log(`[SimYear Log] Year ${currentYear}: After runIncomeEvents. Current Log Length: ${currentYearEventsLog.length}`);

  // 3) Required Minimum Distributions
  // console.log(`--- Year ${currentYear} (Idx ${currentYearIndex}): Processing RMDs ---`);
  try {
      // Pass necessary data: strategies, tables, age, current state, previous state
      // Expect the function to return the updated state and the RMD amount added to income
      // console.log(`[SimYear Log] Year ${currentYear}: Calling processRequiredMinimumDistributions. Current Log Length: ${currentYearEventsLog.length}`);
      const rmdResult = processRequiredMinimumDistributions(
          rmdStrategies, 
          taxData.rmdTables, // Pass the raw RMD tables 
          userAge, 
          yearState, 
          previousYearState,
          currentYearEventsLog, // Pass the log array for event logging
          prng                      // Pass prng
      );
      
      // Update the main yearState object
      yearState = rmdResult.updatedYearState;
      
      // Add RMD income to the breakdown if any occurred
      if (rmdResult.rmdIncome > 0) {
          yearState.incomeBreakdown['Required Minimum Distribution'] = (yearState.incomeBreakdown['Required Minimum Distribution'] || 0) + rmdResult.rmdIncome;
      }
      
      // console.log(`Year ${currentYear}: RMDs processed. curYearIncome: ${yearState.curYearIncome}`);
  } catch (error) {
       console.error(`Year ${currentYear}: Error processing RMDs:`, error);
       // Decide how to handle error
  }
  // console.log(`[SimYear Log] Year ${currentYear}: After processRequiredMinimumDistributions. Current Log Length: ${currentYearEventsLog.length}`);

  // 4) Process Investment Returns
  // console.log(`--- Year ${currentYear} (Idx ${currentYearIndex}): Processing Investment Returns ---`);
  try {
      // Expect the function to return the updated state and a breakdown of investment income
      const investmentResult = processInvestmentReturns(prng, yearState);
      
      // Update the main yearState object
      yearState = investmentResult.updatedYearState;
      
      // Merge investment income breakdown
      yearState.incomeBreakdown = { ...yearState.incomeBreakdown, ...(investmentResult.investmentIncomeBreakdown || {}) };
      
      // After investment returns, update total investment value and total assets
      yearState.totalInvestmentValue = calculateTotalAssets(yearState.investments);
      yearState.totalAssets = yearState.totalInvestmentValue + yearState.cash;
      
      // console.log(`Year ${currentYear}: Investment Returns processed. curYearIncome: ${yearState.curYearIncome.toFixed(2)}, totalAssets: ${yearState.totalAssets.toFixed(2)}`); 

  } catch (error) {
       console.error(`Year ${currentYear}: Error processing investment returns:`, error);
       // Decide how to handle error - potentially revert investment changes?
  }

  // 5) Process Roth Conversions
  // console.log(`--- Year ${currentYear} (Idx ${currentYearIndex}): Processing Roth Conversions ---`); // Optional: Keep for debugging which step it is
  try {
      // ADDED LOG: Inspect state before Roth conversion
      // console.log(`---> [SimYear Roth Check] Year ${currentYear}: Checking Roth. Sources=${JSON.stringify(rothConversionStrategies)}. Current Investments (Name/Status):`, JSON.stringify(yearState.investments.map(inv => ({ name: inv.name, status: inv.accountTaxStatus })))); // CORRECTED PROPERTY NAME

      // Skip if no Roth conversion strategies defined
      if (rothConversionStrategies && rothConversionStrategies.length > 0) {
          // console.log(`[SimYear Log] Year ${currentYear}: Calling processRothConversion. Current Log Length: ${currentYearEventsLog.length}`);
          // Store income before potential conversion for comparison
          const incomeBeforeConversion = yearState.curYearIncome; 
          
          const rothResult = processRothConversion(
              rothConversionStrategies,
              adjustedIncomeTaxBrackets, // Pass the adjusted brackets
              adjustedStandardDeduction,
              yearState.curYearIncome,
              yearState.curYearSS,
              yearState.investments,
              currentYear,
              rothOptimizerEnable,
              rothOptimizerStartYear,
              rothOptimizerEndYear,
              currentYearEventsLog, // Pass the log array for event logging
              prng                      // Pass prng
          );
          
          // Update year state with conversion results
          yearState.investments = rothResult.investments;
          yearState.curYearIncome = rothResult.curYearIncome;
          // yearState.rothConversionAmount = rothResult.conversionAmount; // Store if needed elsewhere, otherwise just use for breakdown
          
          // Add Roth conversion amount to income breakdown
          if (rothResult.conversionAmount > 0) {
              yearState.incomeBreakdown['Roth Conversion'] = (yearState.incomeBreakdown['Roth Conversion'] || 0) + rothResult.conversionAmount;
              // Log Roth conversion
              currentYearEventsLog.push({
                year: currentYear,
                type: 'roth',
                details: `Converted ${rothResult.conversionAmount.toFixed(2)} from pre-tax to Roth accounts.`
              });
              // console.log(`--- Year ${currentYear} (Idx ${currentYearIndex}): Roth Conversion Occurred ---`);
              // console.log(`    Before: curYearIncome=${incomeBeforeConversion.toFixed(2)}, curYearSS=${yearState.curYearSS.toFixed(2)}, adjStdDed=${adjustedStandardDeduction.toFixed(2)}`);
              // console.log(`    After:  conversionAmount=${rothResult.conversionAmount.toFixed(2)}, newCurYearIncome=${yearState.curYearIncome.toFixed(2)}`);
          }
          
          // Recalculate total investment value after conversions
          yearState.totalInvestmentValue = calculateTotalAssets(yearState.investments);
      }
  } catch (error) {
      console.error(`Year ${currentYear}: Error processing Roth conversions:`, error);
      // Continue with simulation, no Roth conversions applied
  }
  // console.log(`[SimYear Log] Year ${currentYear}: After processRothConversion block. Current Log Length: ${currentYearEventsLog.length}`);

  // 6) Pay Non-Discretionary Expenses and Previous Year's Taxes
  try {
      yearState = processNonDiscretionaryExpenses(
          totalPaymentNeededForStep6,
          yearState,
          expenseWithdrawalStrategies, 
          userAge,
          prng
      );
      yearState.curYearTaxes = previousYearTaxes; // Still store total tax paid
      // Log Tax Payment
      /* // REMOVED Aggregated Tax Log
      if (previousYearTaxes > 0) {
        currentYearEventsLog.push({ 
          year: currentYear, 
          type: 'tax', 
          details: `Paid previous year's total taxes: ${previousYearTaxes.toFixed(2)}` 
        });
      }
      */
      // Log Non-Disc Expense Payment (aggregate)
      /* // REMOVED Aggregated Non-Disc Expense Log
      if (currentNonDiscExpensesTotal > 0) {
          currentYearEventsLog.push({ 
              year: currentYear, 
              type: 'expense', 
              details: `Paid current year non-discretionary expenses total: ${currentNonDiscExpensesTotal.toFixed(2)}` 
          });
      }
      */
  } catch (error) {
       console.error(`Year ${currentYear}: Error processing non-discretionary expenses/withdrawals:`, error);
  }

  // 7) Pay Discretionary Expenses 
  try {
      const discResult = processDiscretionaryExpenses(
          modelData, 
          eventsActiveThisYear,
          spendingStrategy, 
          expenseWithdrawalStrategies, 
          financialGoal,
          userAge,
          maritalStatusThisYear,
          currentInflationFactor,
          yearState, // Pass current state 
          previousYearState?.discExpenseEventStates,
          prng
      );
      yearState = discResult.updatedYearState; // Get mutated state back
      // Add the details of *actually paid* discretionary expenses to the breakdown
      yearState.expenseBreakdown = { ...yearState.expenseBreakdown, ...discResult.paidDiscExpenses }; 
      // Log Discretionary Expenses Paid
      for (const [expenseName, amountPaid] of Object.entries(discResult.paidDiscExpenses || {})) {
          if (amountPaid > 0) {
              currentYearEventsLog.push({ 
                  year: currentYear, 
                  type: 'expense', 
                  details: `Paid discretionary expense '${expenseName}': ${amountPaid.toFixed(2)}` 
              });
          }
      }
      // Store the expense states calculated by the module for the *next* year
      yearState.discExpenseEventStates = discResult.expenseEventStates; 
      // Note: curYearExpenses sum was updated inside processDiscretionaryExpenses/performWithdrawal
  } catch (error) {
      console.error(`Year ${currentYear}: Error processing discretionary expenses:`, error);
  }

  // 8) Process Invest Events
  try {
    // Get the strategy info for the current year from the pre-calculated array
    // console.log(`[SimYear Log] Year ${currentYear}: Calling processInvestEvents. Current Log Length: ${currentYearEventsLog.length}`);
    const currentInvestStrategyInfo = investArray[currentYearIndex];
    yearState = processInvestEvents(
        currentYearEventsLog, // Pass log array
        currentInvestStrategyInfo, 
        yearState, 
        currentInflationFactor,
        modelData, // Pass full modelData to access initial investment definitions
        prng
    );
  } catch (error) {
      console.error(`Year ${currentYear}: Error processing invest events:`, error);
  }
  // console.log(`[SimYear Log] Year ${currentYear}: After processInvestEvents. Current Log Length: ${currentYearEventsLog.length}`);

  // 9) Process Rebalance Events
  try {
    // console.log(`[SimYear Log] Year ${currentYear}: Calling processRebalanceEvents. Current Log Length: ${currentYearEventsLog.length}`);
    const currentRebalanceInfo = rebalanceArray[currentYearIndex];
    yearState = processRebalanceEvents(currentYearEventsLog, currentRebalanceInfo, yearState); // Pass log array
  } catch (error) {
      console.error(`Year ${currentYear}: Error processing rebalance events:`, error);
  }
  // console.log(`[SimYear Log] Year ${currentYear}: After processRebalanceEvents. Current Log Length: ${currentYearEventsLog.length}`);

  // Check if financial goal is met
  yearState.financialGoalMet = yearState.totalAssets >= financialGoal;

  return { ...yearState, currentYearEventsLog }; // <-- Return log array with state
}

function calculateTotalAssets(investments) {
    let total = 0;
    (investments || []).forEach(inv => { total += inv?.value || 0 });
    return total;
}

module.exports = {
  simulateYear,
}; 