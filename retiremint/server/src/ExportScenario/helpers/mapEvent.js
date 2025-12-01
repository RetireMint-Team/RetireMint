const { flattenAllocationStructure } = require('./flattenAllocationStructure');

function formatStart(start) {
    if (!start) return null;
    switch (start.method) {
      case 'fixedValue': return { type: 'fixed', value: start.fixedValue };
      case 'normalValue': return { type: 'normal', mean: start.normalValue.mean, stdev: start.normalValue.sd };
      case 'uniformValue': return { type: 'uniform', lower: start.uniformValue.lowerBound, upper: start.uniformValue.upperBound };
      case 'sameYearAsAnotherEvent': return { type: 'startWith', eventSeries: start.sameYearAsAnotherEvent };
      case 'yearAfterAnotherEventEnd': return { type: 'startAfter', eventSeries: start.yearAfterAnotherEventEnd };
      default: return null;
    }
  }
  
  function formatDuration(duration) {
    if (!duration) return null;
    switch (duration.method) {
      case 'fixedValue': return { type: 'fixed', value: duration.fixedValue };
      case 'normalValue': return { type: 'normal', mean: duration.normalValue.mean, stdev: duration.normalValue.sd };
      case 'uniformValue': return { type: 'uniform', lower: duration.uniformValue.lowerBound, upper: duration.uniformValue.upperBound };
      default: return null;
    }
  }
  
  function formatExpectedChange(change) {
    if (!change) return null;
    switch (change.method) {
      case 'fixedValue': return { type: 'fixed', value: change.fixedValue };
      case 'normalValue': return { type: 'normal', mean: change.normalValue.mean, stdev: change.normalValue.sd };
      case 'uniformValue': return { type: 'uniform', lower: change.uniformValue.lowerBound, upper: change.uniformValue.upperBound };
      default: return null;
    }
  }
  
  async function mapEventSeries(events, investmentIdToNameMap) {
    const mappedEvents = [];
    for (const e of events) {
      const base = {
        name: e.name,
        start: formatStart(e.startYear),
        duration: formatDuration(e.duration),
        type: e.type
      };
  
      if (e.type === 'income' && e.income) {
        base.initialAmount = e.income.initialAmount;
        if (e.income.expectedAnnualChange) {
           base.changeDistribution = formatExpectedChange(e.income.expectedAnnualChange);
           const method = e.income.expectedAnnualChange.method;
           if (method.includes('Value')) base.changeAmtOrPct = 'amount';
           else if (method.includes('Percentage')) base.changeAmtOrPct = 'percent';
           else base.changeAmtOrPct = 'percent';
        } else {
            base.changeAmtOrPct = 'percent';
        }
        base.inflationAdjusted = e.income.inflationAdjustment;
        base.userFraction = (e.income.marriedPercentage ?? 100) / 100;
        base.socialSecurity = e.income.isSocialSecurity;
      }
  
      if (e.type === 'expense' && e.expense) {
        base.initialAmount = e.expense.initialAmount;
        if (e.expense.expectedAnnualChange) {
             base.changeDistribution = formatExpectedChange(e.expense.expectedAnnualChange);
             const method = e.expense.expectedAnnualChange.method;
             if (method.includes('Value')) base.changeAmtOrPct = 'amount';
             else if (method.includes('Percentage')) base.changeAmtOrPct = 'percent';
             else base.changeAmtOrPct = 'percent';
         } else {
             base.changeAmtOrPct = 'percent';
         }
         base.inflationAdjusted = e.expense.inflationAdjustment;
         base.userFraction = (e.expense.marriedPercentage ?? 100) / 100;
         base.discretionary = e.expense.isDiscretionary;
      }
  
      if (e.type === 'invest' && e.invest) {
        const flatAllocation = await flattenAllocationStructure(e.invest, investmentIdToNameMap);
        if (flatAllocation) {
            base.assetAllocation = flatAllocation;
        }
        
        base.glidePath = e.invest.modifyMaximumCash === true; 
        
        if (base.glidePath) {
             const finalNested = {
                 taxStatusAllocation: e.invest.finalTaxStatusAllocation,
                 nonRetirementAllocation: e.invest.finalNonRetirementAllocation,
                 preTaxAllocation: e.invest.finalPreTaxAllocation,
                 afterTaxAllocation: e.invest.finalAfterTaxAllocation,
                 taxExemptAllocation: e.invest.finalTaxExemptAllocation
             };
             const hasFinalAllocationData = Object.values(finalNested).some(alloc => alloc && Object.keys(alloc).length > 0);
             if (hasFinalAllocationData) {
                 const flatAllocation2 = await flattenAllocationStructure(finalNested, investmentIdToNameMap);
                 if (flatAllocation2) {
                     base.assetAllocation2 = flatAllocation2;
                 }
             } else {
                  delete base.assetAllocation2; 
             }
        } else {
             delete base.assetAllocation2;
        }
        
        base.maxCash = e.invest.newMaximumCash ?? null;
      }
  
      if (e.type === 'rebalance' && e.rebalance) {
         const flatAllocation = await flattenAllocationStructure(e.rebalance, investmentIdToNameMap);
         if (flatAllocation) {
            base.assetAllocation = flatAllocation;
         }
      }
  
      mappedEvents.push(base);
    }
    return mappedEvents; 
  }
  
  module.exports = mapEventSeries;
  