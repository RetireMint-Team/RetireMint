const Investment = require('../Schemas/Investments');
// Allocation schema is no longer needed here
// const Allocation = require('../Schemas/Allocation');

/**
 * Converts a flat allocation map from YAML into a nested structure suitable for the database schema.
 * Calculates taxStatusAllocation percentages and renormalizes percentages within each status.
 * 
 * @param {Object} flatAllocation - The flat allocation map from YAML (e.g., { 'invName1': 0.6, 'invName2': 0.4 }).
 * @param {Map<string, { _id: ObjectId, accountTaxStatus: string }>} investmentMap - A map where keys are investment names from YAML 
 *                                                                                    and values are objects containing the corresponding Mongoose _id and accountTaxStatus.
 * @returns {Object} - An object containing the nested allocation structure: 
 *                     { taxStatusAllocation, nonRetirementAllocation, preTaxAllocation, afterTaxAllocation, taxExemptAllocation }
 *                     Returns null if flatAllocation is empty or invalid.
 */
function buildAllocationStructure(flatAllocation, investmentMap) {
  if (!flatAllocation || Object.keys(flatAllocation).length === 0) {
    return null; // No allocation to build
  }

  const nestedAllocation = {
    taxStatusAllocation: {
        'non-retirement': 0,
        'pre-tax': 0,
        'after-tax': 0,
        'tax-exempt': 0
    },
    nonRetirementAllocation: {},
    preTaxAllocation: {},
    afterTaxAllocation: {},
    taxExemptAllocation: {}
  };

  const statusTotals = { // Temporary totals for renormalization
    'non-retirement': 0,
    'pre-tax': 0,
    'after-tax': 0,
    'tax-exempt': 0
  };

  // First pass: Calculate totals for each tax status
  for (const [yamlInvName, yamlPercentDecimal] of Object.entries(flatAllocation)) {
    const investmentInfo = investmentMap.get(yamlInvName);
    if (!investmentInfo) {
        console.warn(`Import Warning: Investment "${yamlInvName}" found in allocation but not in the processed investment list. Skipping.`);
        continue;
    }
    const status = investmentInfo.accountTaxStatus;
    // Ensure yamlPercentDecimal is treated as a number, default to 0 if not.
    const percentage = (Number(yamlPercentDecimal) || 0) * 100; 

    if (status && statusTotals.hasOwnProperty(status)) {
        nestedAllocation.taxStatusAllocation[status] += percentage;
        statusTotals[status] += percentage;
    } else {
         // Log a warning if the status is unexpected but still proceed if possible
         if(status) console.warn(`Import Warning: Investment "${yamlInvName}" has an unexpected tax status: "${status}".`);
         else console.warn(`Import Warning: Investment "${yamlInvName}" has a missing tax status. Skipping allocation.`);
    }
  }
  
  // Round the top-level percentages to avoid floating point issues
  for (const status in nestedAllocation.taxStatusAllocation) {
    nestedAllocation.taxStatusAllocation[status] = Math.round(nestedAllocation.taxStatusAllocation[status] * 100) / 100; // Round to 2 decimal places
  }
  for (const status in statusTotals) {
      statusTotals[status] = Math.round(statusTotals[status] * 100) / 100;
  }


  // Second pass: Calculate within-status percentages and populate sub-allocation maps
  for (const [yamlInvName, yamlPercentDecimal] of Object.entries(flatAllocation)) {
    const investmentInfo = investmentMap.get(yamlInvName);
    if (!investmentInfo || !investmentInfo.accountTaxStatus) continue; // Skip if no info or status
    
    const status = investmentInfo.accountTaxStatus;
    const percentage = (Number(yamlPercentDecimal) || 0) * 100; 
    const totalForStatus = statusTotals[status];
    // Use the actual DB ID as the key in the sub-allocation maps
    const dbInvestmentId = investmentInfo._id.toString(); 

    if (status && totalForStatus > 0) {
        // Avoid division by zero and handle rounding
        const withinStatusPercent = Math.round((percentage / totalForStatus) * 100 * 100) / 100; // Calculate and round to 2 decimal places
        
        switch (status) {
            case 'non-retirement':
                nestedAllocation.nonRetirementAllocation[dbInvestmentId] = withinStatusPercent;
                break;
            case 'pre-tax':
                nestedAllocation.preTaxAllocation[dbInvestmentId] = withinStatusPercent;
                break;
            case 'after-tax':
                nestedAllocation.afterTaxAllocation[dbInvestmentId] = withinStatusPercent;
                break;
            case 'tax-exempt':
                nestedAllocation.taxExemptAllocation[dbInvestmentId] = withinStatusPercent;
                break;
            // No default needed as status is checked
        }
    } else if (status && totalForStatus === 0 && percentage > 0) {
        // This case indicates an issue, either bad input YAML or logic error in first pass
        console.warn(`Import Warning: Investment "${yamlInvName}" has non-zero allocation (${percentage}%) but its status total (${status}) is zero. This percentage will be ignored.`);
    } else if (status && totalForStatus < 0) {
        // This case indicates negative percentages in YAML, which is invalid
         console.warn(`Import Warning: Investment "${yamlInvName}" contributed to a negative status total (${status}: ${totalForStatus}). This percentage will be ignored.`);
    }
  }

  return nestedAllocation;
}

// Remove helper functions no longer needed
/*
function extractTaxStatus(investmentName) { ... }
function statusToField(status) { ... }
*/

module.exports = { buildAllocationStructure }; // Export the refactored function

