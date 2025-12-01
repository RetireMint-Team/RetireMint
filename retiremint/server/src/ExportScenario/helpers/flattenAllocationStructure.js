const Investment = require('../../Schemas/Investments'); // Adjust path as needed

/**
 * Flattens the nested allocation structure from the database into 
 * a flat map suitable for YAML export.
 * 
 * @param {Object} nestedAllocation - The nested allocation object from Invest/Rebalance subdocument 
 *                                    (containing taxStatusAllocation, sub-allocation maps, etc.).
 * @param {Map<string, string>} investmentIdToNameMap - A map where keys are DB Investment _id strings 
 *                                                       and values are the corresponding names used in YAML.
 * @returns {Object|null} - A flat allocation map { yamlInvestmentName: percentageDecimal } or null.
 */
async function flattenAllocationStructure(nestedAllocation, investmentIdToNameMap) {
    if (!nestedAllocation) return null;

    const flatAllocation = {};
    const subAllocationMaps = [
        nestedAllocation.nonRetirementAllocation,
        nestedAllocation.preTaxAllocation,
        nestedAllocation.afterTaxAllocation,
        nestedAllocation.taxExemptAllocation
    ];

    // Use the sub-allocation maps as the source of truth for investments and their percentages
    for (const subMap of subAllocationMaps) {
        if (!subMap || typeof subMap !== 'object') continue;

        for (const [dbInvestmentId, withinStatusPercent] of Object.entries(subMap)) {
            if (withinStatusPercent == null || typeof withinStatusPercent !== 'number' || withinStatusPercent <= 0) continue; // Skip null/undefined/non-positive percentages
            
            const yamlInvestmentName = investmentIdToNameMap.get(dbInvestmentId);
            
            if (!yamlInvestmentName) {
                console.warn(`Export Warning: Investment ID "${dbInvestmentId}" found in sub-allocation but not in ID-to-Name map. Skipping.`);
                continue;
            }
            
            // We need the taxStatusAllocation percentage for this investment's status.
            // Fetch the investment doc to get its status reliably, UNLESS the nestedAllocation also includes it.
            let status = null;
            // Optimization: If nestedAllocation includes status info per ID, use that instead of DB call.
            // This requires modifying how nestedAllocation is structured or passed.
            // Assuming for now we NEED to fetch:
            let investmentDoc; 
            try {
                 investmentDoc = await Investment.findById(dbInvestmentId).lean(); 
            } catch (error) {
                 console.warn(`Export Warning: Error fetching Investment ${dbInvestmentId}:`, error);
            }

            if (!investmentDoc || !investmentDoc.accountTaxStatus) {
                console.warn(`Export Warning: Could not find investment or accountTaxStatus for ID "${dbInvestmentId}" referenced in allocation. Skipping.`);
                continue;
            }
            
            status = investmentDoc.accountTaxStatus;
            const statusPercent = nestedAllocation.taxStatusAllocation ? (nestedAllocation.taxStatusAllocation[status] || 0) : 0;
            
            if (statusPercent > 0) {
                // Calculate overall percentage: (percentage_within_status / 100) * (status_percentage / 100)
                const overallDecimal = (withinStatusPercent / 100) * (statusPercent / 100);
                 // Round to avoid floating point inaccuracies (e.g., 4 decimal places for 0.xxxx)
                flatAllocation[yamlInvestmentName] = Math.round(overallDecimal * 10000) / 10000; 
            } else {
                 // If statusPercent is 0, but withinStatusPercent > 0, this indicates inconsistent data.
                 console.warn(`Export Warning: Investment "${yamlInvestmentName}" (ID: ${dbInvestmentId}) has within-status allocation (${withinStatusPercent}%) but its status (${status}) has 0% in taxStatusAllocation. Skipping export for this item.`);
            }
        }
    }

    return Object.keys(flatAllocation).length > 0 ? flatAllocation : null;
}

module.exports = { flattenAllocationStructure }; 