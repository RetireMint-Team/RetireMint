/**
 * RothConversion.js - Module for processing Roth conversions
 * 
 * This module handles:
 * 1. Calculating the optimal amount for Roth conversion based on tax brackets
 * 2. Converting pre-tax investments to after-tax (Roth) investments
 * 3. Updating taxable income to reflect conversions
 */

/**
 * Process Roth conversions for the current year
 * @param {Array} rothConversionSourceAccounts - List of investment names to consider for conversion
 * @param {Object} adjustedIncomeTaxBrackets - Inflation-adjusted federal income tax brackets
 * @param {Number} adjustedStandardDeduction - Inflation-adjusted standard deduction
 * @param {Number} curYearIncome - Current year's income
 * @param {Number} curYearSS - Current year's Social Security income
 * @param {Array} investments - Array of investment objects
 * @param {Number} currentYear - The current year being simulated
 * @param {Boolean} rothOptimizerEnable - Whether Roth optimization is enabled
 * @param {Number} rothOptimizerStartYear - Year to start optimizing Roth conversions
 * @param {Number} rothOptimizerEndYear - Year to end optimizing Roth conversions
 * @param {Array} currentYearEventsLog - Array to push log entries into.
 * @param {Function} [prng=Math.random] - Optional seeded random number generator (unused in Roth, but accepted for consistency).
 * @returns {Object} - An object containing the updated investments array, the updated taxable income, and the amount converted.
 *                     { investments: Array, curYearIncome: Number, conversionAmount: Number }
 */
function processRothConversion(
  rothConversionSourceAccounts,
  adjustedIncomeTaxBrackets,
  adjustedStandardDeduction,
  curYearIncome,
  curYearSS,
  investments,
  currentYear,
  rothOptimizerEnable = false,
  rothOptimizerStartYear = null,
  rothOptimizerEndYear = null,
  currentYearEventsLog = [],
  prng = Math.random
) {
  // console.log(`---> [Roth] Entering for Year ${currentYear}`);
  let totalAmountConverted = 0;
  let updatedInvestments = JSON.parse(JSON.stringify(investments)); // Deep clone
  let updatedTaxableIncome = curYearIncome;

  if (!rothConversionSourceAccounts || rothConversionSourceAccounts.length === 0) {
    return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
  }
  
  // --- Check if optimizer is active AND if current year is outside its window ---
  if (rothOptimizerEnable) {
    const isOptimizerActiveYear = 
      (!rothOptimizerStartYear || currentYear >= rothOptimizerStartYear) && 
      (!rothOptimizerEndYear || currentYear <= rothOptimizerEndYear);
      
    if (!isOptimizerActiveYear) {
      // Optimizer is enabled, but we are outside the active years, so do nothing.
      // console.log(`Year ${currentYear}: Skipping Roth conversion (Optimizer enabled but outside active window [${rothOptimizerStartYear}-${rothOptimizerEndYear}])`);
      return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
    }
    // If we are here, optimizer is enabled AND it's an active year.
  } else {
    // Optimizer is not enabled, skip conversion
    // console.log(`Year ${currentYear}: Skipping Roth conversion (Optimizer not enabled).`);
    return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
  }
  // --- If optimizer is enabled and within the active year window, proceed ---
  
  // --- Calculate Target Conversion Amount (rc) based on filling current tax bracket --- 
  
  // a. Calculate federal taxable income before conversion (considering SS taxation and standard deduction)
  const curYearFedTaxableIncomeBeforeConv = curYearIncome - 0.15 * curYearSS; 
  const netTaxableIncomeBeforeConv = Math.max(0, curYearFedTaxableIncomeBeforeConv - adjustedStandardDeduction);
  
  // console.log(`---> [Roth Calc] Year ${currentYear}: curYearIncome=${curYearIncome.toFixed(2)}, curYearSS=${curYearSS.toFixed(2)}, adjStdDed=${adjustedStandardDeduction.toFixed(2)}, netTaxableIncomeBeforeConv=${netTaxableIncomeBeforeConv.toFixed(2)}`);
  
  // Find the user's current tax bracket upper limit (u)
  let upperLimit = 0;
  if (!adjustedIncomeTaxBrackets || adjustedIncomeTaxBrackets.length === 0) {
    console.error(`Roth Conversion Error Year ${currentYear}: No adjusted income tax brackets provided.`);
    return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
  }
  const sortedBrackets = [...adjustedIncomeTaxBrackets].sort((a, b) => a.adjustedMinIncome - b.adjustedMinIncome);
  
  let foundBracket = false;
  for (let i = 0; i < sortedBrackets.length; i++) {
    const bracket = sortedBrackets[i];
    if (netTaxableIncomeBeforeConv >= bracket.adjustedMinIncome && netTaxableIncomeBeforeConv < bracket.adjustedMaxIncome) {
      upperLimit = bracket.adjustedMaxIncome; 
      foundBracket = true;
      break; 
    }
    if (i === sortedBrackets.length - 1 && netTaxableIncomeBeforeConv >= bracket.adjustedMinIncome) {
      upperLimit = bracket.adjustedMaxIncome; // Infinity for the top bracket
      foundBracket = true;
      break;
    }
  }
  
  if (!foundBracket) {
    console.error(`Roth Conversion Error Year ${currentYear}: Unable to determine tax bracket for net income ${netTaxableIncomeBeforeConv.toFixed(2)}`);
    return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
  }

  // b. Calculate amount of Roth conversion (rc) needed to fill the bracket
  // rc = u - netTaxableIncomeBeforeConv
  let targetConversionAmount = 0;
  if (upperLimit === Infinity) { 
      // console.log(`---> [Roth Calc] Year ${currentYear}: In highest bracket.`);
    // If in the highest bracket, maybe convert a fixed amount or based on another rule?
    // For now, assume no conversion if already in the highest bracket.
    // console.log(`Year ${currentYear}: Skipping Roth conversion (already in highest bracket).`);
    targetConversionAmount = 0;
  } else {
    targetConversionAmount = Math.max(0, upperLimit - netTaxableIncomeBeforeConv);
  }
  
  // console.log(`---> [Roth Calc] Year ${currentYear}: Found upperLimit=${upperLimit === Infinity ? 'Infinity' : upperLimit.toFixed(2)}, Calculated targetConversionAmount=${targetConversionAmount.toFixed(2)}`);
  
  // console.log(`Year ${currentYear}: Roth Optimizer - Net Income Before: ${netTaxableIncomeBeforeConv.toFixed(2)}, Bracket Upper Limit: ${upperLimit === Infinity ? 'Inf' : upperLimit.toFixed(2)}, Target Conversion (rc): ${targetConversionAmount.toFixed(2)}`);
  
  if (targetConversionAmount <= 0.01) { // Use threshold for floating point
    // console.log(`Year ${currentYear}: Skipping Roth conversion (target amount is zero or negligible).`);
    return { investments: updatedInvestments, curYearIncome: updatedTaxableIncome, conversionAmount: 0 };
  }

  // --- c. Iterate over source accounts and perform conversion --- 
  let amountRemainingToConvert = targetConversionAmount;
  let totalConvertedThisYear = 0; // Define totalConvertedThisYear here

  for (const sourceAccountName of rothConversionSourceAccounts) {
    if (amountRemainingToConvert <= 0.01) break; // Target met

    // Find the source pre-tax investment account
    const sourceInv = updatedInvestments.find(inv => 
      inv.name === sourceAccountName && 
      inv.accountTaxStatus === 'pre-tax'
    );

    // Log source account search results
    if (sourceInv) {
        // console.log(`---> [Roth Src] Year ${currentYear}: Found source '${sourceAccountName}'. Status: ${sourceInv.accountTaxStatus}, Value: ${sourceInv.value.toFixed(2)}`);
    } else {
        // console.log(`---> [Roth Src] Year ${currentYear}: Did NOT find pre-tax source '${sourceAccountName}'.`);
    }

    if (!sourceInv) {
      // console.log(`Year ${currentYear}: Roth source account '${sourceAccountName}' not found or not pre-tax.`);
      continue; // Try next source account
    }
    
    if (sourceInv.value <= 0) {
      // console.log(`Year ${currentYear}: Roth source account '${sourceAccountName}' has zero value.`);
      continue; // Try next source account
    }

    // Determine amount to convert from this specific source
    const amountToConvertFromThisSource = Math.min(amountRemainingToConvert, sourceInv.value);

    // --- Perform Conversion ---
    if (amountToConvertFromThisSource > 0 && sourceInv && sourceInv.value >= amountToConvertFromThisSource) { // Check added for clarity
        // Find or create the corresponding Roth investment
        const rothInvName = `${sourceInv.name} (Roth)`;
        let rothInv = updatedInvestments.find(inv => inv.name === rothInvName);

        if (!rothInv) {
            // Create the new Roth investment if it doesn't exist
            rothInv = {
                name: rothInvName,
                investmentType: sourceInv.investmentType, // Copy reference/data
                accountTaxStatus: 'after-tax',
                value: 0,
                costBasis: 0,
                 _id: `temp-roth-${sourceInv.name}-${Date.now()}` // Generate a unique-ish temp ID
            };
            updatedInvestments.push(rothInv); // Add to the investments array
            // console.log(`RothConversion: Created new investment: ${rothInvName}`);
            currentYearEventsLog.push({ 
              year: currentYear, 
              type: 'roth', 
              details: `Created Roth account '${rothInvName}'.`
            });
        }

        // Decrease source investment value (adjust cost basis proportionally)
        const originalSourceValue = sourceInv.value;
        const originalSourceCostBasis = sourceInv.costBasis || 0; // Get original cost basis, default to 0
        sourceInv.value -= amountToConvertFromThisSource;
        if (originalSourceValue > 0) {
          // Calculate the new cost basis proportionally
          sourceInv.costBasis = originalSourceCostBasis * (sourceInv.value / originalSourceValue); 
        } else {
          sourceInv.costBasis = 0; // Avoid division by zero if source was already 0
        }
        sourceInv.costBasis = Math.max(0, sourceInv.costBasis); // Ensure cost basis doesn't go negative


        // Increase Roth investment value and cost basis
        rothInv.value = (rothInv.value || 0) + amountToConvertFromThisSource; // Ensure value exists before adding
        rothInv.costBasis = (rothInv.costBasis || 0) + amountToConvertFromThisSource; // Cost basis of converted amount is the amount itself, ensure exists before adding

        // Update tracking variables - MOVED inside the successful conversion block
        totalAmountConverted += amountToConvertFromThisSource;
        amountRemainingToConvert -= amountToConvertFromThisSource;
        
        currentYearEventsLog.push({ 
          year: currentYear, 
          type: 'roth', 
          details: `Converted ${amountToConvertFromThisSource.toFixed(2)} from source '${sourceAccountName}' to '${rothInv.name}'.`
        });
        
        // console.log(`Year ${currentYear}: Converted ${amountToConvertFromThisSource.toFixed(2)} from '${sourceAccountName}' to '${rothInv.name}'. Total converted: ${totalAmountConverted.toFixed(2)}. Remaining target: ${amountRemainingToConvert.toFixed(2)}`);

    } // End of conversion logic block

  } // End of loop through source accounts
  
  // --- d. Update overall taxable income --- 
  updatedTaxableIncome += totalAmountConverted;

  // console.log(`---> [Roth] Returning for Year ${currentYear}. Converted: ${totalAmountConverted}. Investments:`, JSON.stringify(updatedInvestments.map(inv => ({name: inv.name, status: inv.accountTaxStatus}))));
  return { 
    investments: updatedInvestments, 
    curYearIncome: updatedTaxableIncome, 
    conversionAmount: totalAmountConverted 
  };
}

module.exports = {
  processRothConversion
};
