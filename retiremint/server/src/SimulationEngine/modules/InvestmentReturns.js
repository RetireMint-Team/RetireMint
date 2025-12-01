/**
 * InvestmentReturns.js - Module for processing investment returns
 * 
 * This module handles:
 * 1. Calculating investment income based on expected returns
 * 2. Updating investment values
 * 3. Calculating and deducting investment expenses
 * 4. Tracking taxable income
 */

const { sampleNormal, sampleUniform } = require('../Utils/CalculationUtils');

/**
 * Sample a return value from a probability distribution
 * @param {Object} expectedReturn - The expected return configuration
 * @returns {Number} - The sampled return value as a decimal (e.g., 0.07 for 7%)
 */
function sampleReturnRate(expectedReturn) {
  if (!expectedReturn) return 0;
  
  const { method } = expectedReturn;
  
  switch (method) {
    case 'fixedValue':
      return expectedReturn.fixedValue / 100;
      
    case 'fixedPercentage':
      return expectedReturn.fixedPercentage / 100;
      
    case 'normalValue':
      // Sample from normal distribution
      const nvMean = expectedReturn.normalValue.mean;
      const nvSd = expectedReturn.normalValue.sd;
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return (z0 * nvSd + nvMean) / 100;
      
    case 'normalPercentage':
      // Sample from normal distribution
      const npMean = expectedReturn.normalPercentage.mean;
      const npSd = expectedReturn.normalPercentage.sd;
      const u3 = Math.random();
      const u4 = Math.random();
      const z1 = Math.sqrt(-2.0 * Math.log(u3)) * Math.cos(2.0 * Math.PI * u4);
      return (z1 * npSd + npMean) / 100;
      
    default:
      return 0;
  }
}

/**
 * Update an investment's value based on its returns and expenses
 * @param {Object} investment - The investment to update
 * @param {Object} yearState - Current state of the simulation year
 * @returns {Object} - Updated investment and income information
 */
function updateInvestmentValue(investment/*, yearState*/) {
  // Skip if investment has no value or no investment type
  if (!investment || !investment.value || !investment.investmentType) {
    return {
      investment,
      generatedIncome: 0,
      valueChange: 0,
      expenses: 0
    };
  }
  
  const startValue = investment.value;
  let generatedIncome = 0;
  let valueChange = 0;
  
  // Calculate income generated (if any)
  if (investment.investmentType.expectedAnnualIncome) {
    const incomeRate = sampleReturnRate(investment.investmentType.expectedAnnualIncome);
    generatedIncome = startValue * incomeRate;
    
    // Add the income to the investment's value (reinvestment)
    investment.value += generatedIncome;
    // Also add the reinvested income to the cost basis
    if (investment.costBasis !== undefined && investment.costBasis !== null) {
        investment.costBasis += generatedIncome;
    }
  }
  
  // Calculate value change (appreciation/depreciation)
  if (investment.investmentType.expectedAnnualReturn) {
    const changeRate = sampleReturnRate(investment.investmentType.expectedAnnualReturn);
    valueChange = startValue * changeRate;
    
    // Update investment value
    investment.value += valueChange;
  }
  
  // Calculate expenses (expense ratio)
  let expenses = 0;
  if (investment.investmentType.expenseRatio) {
    // Expense ratio is applied to the average value over the year
    const averageValue = (startValue + investment.value) / 2;
    expenses = averageValue * (investment.investmentType.expenseRatio / 100);
    
    // Deduct expenses from the investment value
    investment.value -= expenses;
  }
  
  return {
    investment,
    generatedIncome,
    valueChange,
    expenses
  };
}

/**
 * Process all investments to update values and track income
 * @param {Function} [prng=Math.random] - Optional seeded random number generator.
 * @param {Object} yearState - The current state of the simulation year (will be modified).
 * @returns {Object} - Object containing the updated year state and a breakdown of investment income.
 *                     { updatedYearState: Object, investmentIncomeBreakdown: Object }
 */
function processInvestmentReturns(prng = Math.random, yearState) {
    
    let totalTaxableIncomeFromInvestments = 0;
    let totalNonTaxableIncomeFromInvestments = 0; // E.g., tax-exempt interest
    let investmentIncomeBreakdown = {}; // Initialize breakdown
    
    if (!yearState || !yearState.investments) {
        console.warn(`Year ${yearState?.year}: Missing yearState or investments for return calculation.`);
        return { updatedYearState: yearState, investmentIncomeBreakdown };
  }
  
    // Process each investment account
    yearState.investments.forEach(investment => {
        if (!investment || typeof investment.value !== 'number' || !investment.investmentType) {
            console.warn(`Year ${yearState.year}: Skipping investment due to missing data:`, investment);
            return; // Skip if data is incomplete
        }

        const investmentType = investment.investmentType;
        const currentInvestmentValue = investment.value;
        let capitalGrowth = 0;
        let incomeGenerated = 0;

        // --- Calculate Capital Growth (Expected Return) ---
        const returnConfig = investmentType.expectedAnnualReturn;
        if (returnConfig && returnConfig.method) {
            let expectedReturnRate = 0;
            switch (returnConfig.method) {
                case 'fixedValue':
                    // Fixed dollar amount return (not percentage)
                    capitalGrowth = returnConfig.fixedValue ?? 0;
                    expectedReturnRate = -1; // Flag to skip percentage-based calculation
                    break;
                case 'fixedPercentage':
                    expectedReturnRate = (returnConfig.fixedPercentage ?? 0) / 100;
                    break;
                case 'normalValue':
                    // Normal distribution of dollar amounts
                    const meanReturnVal = returnConfig.normalValue?.mean ?? 0;
                    const sdReturnVal = returnConfig.normalValue?.sd ?? 0;
                    if (sdReturnVal < 0) {
                         console.warn(`Year ${yearState.year}: Negative SD for return on ${investment.name}. Using mean.`);
                         capitalGrowth = meanReturnVal;
                    } else {
                        capitalGrowth = sampleNormal(meanReturnVal, sdReturnVal, prng);
                    }
                    expectedReturnRate = -1; // Flag to skip percentage-based calculation
                    break;
                case 'normalPercentage':
                    const meanReturn = returnConfig.normalPercentage?.mean ?? 0;
                    const sdReturn = returnConfig.normalPercentage?.sd ?? 0;
                    if (sdReturn < 0) {
                         console.warn(`Year ${yearState.year}: Negative SD for return on ${investment.name}. Using 0.`);
                         expectedReturnRate = sampleNormal(meanReturn / 100, 0, prng);
                    } else {
                        expectedReturnRate = sampleNormal(meanReturn / 100, sdReturn / 100, prng);
                    }
                    break;
                case 'uniformValue':
                    // Uniform distribution of dollar amounts
                    const lowerReturnVal = returnConfig.uniformValue?.lowerBound ?? 0;
                    const upperReturnVal = returnConfig.uniformValue?.upperBound ?? 0;
                    if (lowerReturnVal > upperReturnVal) {
                        console.warn(`Year ${yearState.year}: Lower bound > upper bound for return on ${investment.name}. Using lower bound.`);
                        capitalGrowth = lowerReturnVal;
                    } else {
                        capitalGrowth = sampleUniform(lowerReturnVal, upperReturnVal, prng);
                    }
                    expectedReturnRate = -1; // Flag to skip percentage-based calculation
                    break;
                case 'uniformPercentage':
                    const lowerReturn = returnConfig.uniformPercentage?.lowerBound ?? 0;
                    const upperReturn = returnConfig.uniformPercentage?.upperBound ?? 0;
                    if (lowerReturn > upperReturn) {
                        console.warn(`Year ${yearState.year}: Lower bound > upper bound for return on ${investment.name}. Using lower bound.`);
                         expectedReturnRate = lowerReturn / 100;
                    } else {
                        expectedReturnRate = sampleUniform(lowerReturn / 100, upperReturn / 100, prng);
                    }
                    break;
                default:
                    console.warn(`Year ${yearState.year}: Unknown return method ${returnConfig.method} for ${investment.name}. Using 0%.`);
                    expectedReturnRate = 0;
            }
            // Calculate growth amount based on the *current* value (only if using percentage)
            if (expectedReturnRate !== -1) {
                capitalGrowth = currentInvestmentValue * expectedReturnRate;
            }
        } else {
            // console.log(`Year ${yearState.year}: No return config found for ${investment.name}. Assuming 0% capital growth.`);
        }

        // --- Calculate Income Generated (Expected Income) ---
        const incomeConfig = investmentType.expectedAnnualIncome;
        if (incomeConfig && incomeConfig.method) {
            let expectedIncomeRate = 0;
            switch (incomeConfig.method) {
                case 'fixedValue':
                   // Income is a fixed amount, not a rate based on current value
                   incomeGenerated = incomeConfig.fixedValue ?? 0;
                   expectedIncomeRate = -1; // Use a flag to skip rate-based calculation below
                   break;
                case 'fixedPercentage':
                    expectedIncomeRate = (incomeConfig.fixedPercentage ?? 0) / 100;
                    break;
                case 'normalValue':
                    // Normal distribution of dollar amounts for income
                    const meanIncomeVal = incomeConfig.normalValue?.mean ?? 0;
                    const sdIncomeVal = incomeConfig.normalValue?.sd ?? 0;
                    if (sdIncomeVal < 0) {
                         console.warn(`Year ${yearState.year}: Negative SD for income on ${investment.name}. Using mean.`);
                         incomeGenerated = meanIncomeVal;
                    } else {
                         incomeGenerated = sampleNormal(meanIncomeVal, sdIncomeVal, prng);
                    }
                    expectedIncomeRate = -1; // Flag to skip percentage-based calculation
                    break;
                case 'normalPercentage':
                    const meanIncome = incomeConfig.normalPercentage?.mean ?? 0;
                    const sdIncome = incomeConfig.normalPercentage?.sd ?? 0;
                    if (sdIncome < 0) {
                         console.warn(`Year ${yearState.year}: Negative SD for income on ${investment.name}. Using 0.`);
                         expectedIncomeRate = sampleNormal(meanIncome / 100, 0, prng);
                    } else {
                         expectedIncomeRate = sampleNormal(meanIncome / 100, sdIncome / 100, prng);
                    }
                    break;
                case 'uniformValue':
                    // Uniform distribution of dollar amounts for income
                    const lowerIncomeVal = incomeConfig.uniformValue?.lowerBound ?? 0;
                    const upperIncomeVal = incomeConfig.uniformValue?.upperBound ?? 0;
                    if (lowerIncomeVal > upperIncomeVal) {
                        console.warn(`Year ${yearState.year}: Lower bound > upper bound for income on ${investment.name}. Using lower bound.`);
                        incomeGenerated = lowerIncomeVal;
                    } else {
                        incomeGenerated = sampleUniform(lowerIncomeVal, upperIncomeVal, prng);
                    }
                    expectedIncomeRate = -1; // Flag to skip percentage-based calculation
                    break;
                case 'uniformPercentage':
                     const lowerIncome = incomeConfig.uniformPercentage?.lowerBound ?? 0;
                     const upperIncome = incomeConfig.uniformPercentage?.upperBound ?? 0;
                     if (lowerIncome > upperIncome) {
                         console.warn(`Year ${yearState.year}: Lower bound > upper bound for income on ${investment.name}. Using lower bound.`);
                         expectedIncomeRate = lowerIncome / 100;
                     } else {
                         expectedIncomeRate = sampleUniform(lowerIncome / 100, upperIncome / 100, prng);
                     }
                    break;
                default:
                     console.warn(`Year ${yearState.year}: Unknown income method ${incomeConfig.method} for ${investment.name}. Using 0%.`);
                    expectedIncomeRate = 0;
            }
            // Calculate income amount based on the *current* value (before growth this year)
            // Skip if method was 'fixedValue', 'normalValue', or 'uniformValue' as incomeGenerated is already set
            if (expectedIncomeRate !== -1) { 
                incomeGenerated = currentInvestmentValue * expectedIncomeRate;
            }
        } else {
            // console.log(`Year ${yearState.year}: No income config found for ${investment.name}. Assuming 0% income generation.`);
        }
        
        // --- Update Investment Value --- 
        // Apply capital growth first, then add income generated (which goes to cash)
        investment.value += capitalGrowth;
        
        // --- Update Cash and Income Totals ---
        if (incomeGenerated > 0) {
            yearState.cash = (yearState.cash || 0) + incomeGenerated;
    
            // Determine if income is taxable based on account type
            const taxStatus = investment.taxStatus; // Use the field from the investment instance
            const incomeType = investmentType.incomeType || 'dividend'; // e.g., 'dividend', 'interest', 'tax-exempt-interest'
            const breakdownKey = `Income - ${incomeType} (${investment.name})`;
            
            if (taxStatus === 'non-retirement' || taxStatus === 'pre-tax' || taxStatus === 'after-tax') {
                // Income from these accounts is generally taxable in the year received
                // (Pre-tax/After-tax income generation might be complex, often reinvested internally,
                // but if modeled as payouts, they are taxable. Simplification: assume payout.)
                // EXCEPT for specifically tax-exempt income types
                if (incomeType !== 'tax-exempt-interest') { 
                    totalTaxableIncomeFromInvestments += incomeGenerated;
                    investmentIncomeBreakdown[breakdownKey] = (investmentIncomeBreakdown[breakdownKey] || 0) + incomeGenerated;
                } else {
                    totalNonTaxableIncomeFromInvestments += incomeGenerated;
                    // Optionally track tax-exempt income in breakdown too
                    investmentIncomeBreakdown[`Income - ${incomeType} (${investment.name}) (Non-Taxable)`] = (investmentIncomeBreakdown[`Income - ${incomeType} (${investment.name}) (Non-Taxable)`] || 0) + incomeGenerated;
                }
            } else if (taxStatus === 'tax-exempt') {
                // Income generated within tax-exempt accounts (like Roth) is not taxed upon receipt
                totalNonTaxableIncomeFromInvestments += incomeGenerated;
                // Optionally track in breakdown
                investmentIncomeBreakdown[`Income - ${incomeType} (${investment.name}) (Non-Taxable)`] = (investmentIncomeBreakdown[`Income - ${incomeType} (${investment.name}) (Non-Taxable)`] || 0) + incomeGenerated;
            }
            
            // console.log(`Year ${yearState.year}: Investment ${investment.name} - Growth: ${capitalGrowth.toFixed(2)}, Income: ${incomeGenerated.toFixed(2)}, Taxable: ${taxStatus !== 'tax-exempt' && incomeType !== 'tax-exempt-interest'}`);
        }
    });
    
    // Add the total taxable income from investments to the year's running total
    yearState.curYearIncome = (yearState.curYearIncome || 0) + totalTaxableIncomeFromInvestments;

    // Return the updated state and the income breakdown
    return { updatedYearState: yearState, investmentIncomeBreakdown };
}

module.exports = {
  processInvestmentReturns,
  updateInvestmentValue,
  sampleReturnRate
}; 