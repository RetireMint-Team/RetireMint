const StartYear = require('../Schemas/StartYear');
const Duration = require('../Schemas/Duration');
const ExpectedAnnualChange = require('../Schemas/ExpectedAnnualChange');
const Income = require('../Schemas/Income');
const Expense = require('../Schemas/Expense');
const Invest = require('../Schemas/Invest');
const Rebalance = require('../Schemas/Rebalance');
const EventSeries = require('../Schemas/EventSeries');
const Allocation = require('../Schemas/Allocation');
const { buildAllocationStructure } = require('./buildAllocationFromYaml');

async function mapStart(start) {
  const stdDev = start.stdev ?? start.sd;

  let startDoc;

  switch (start.type) {
    case 'fixed':
      startDoc = new StartYear({
        method: 'fixedValue',
        fixedValue: start.value
      });
      break;

    case 'normal':
      startDoc = new StartYear({
        method: 'normalValue',
        normalValue: {
          mean: start.mean,
          sd: stdDev
        }
      });
      break;

    case 'uniform':
      startDoc = new StartYear({
        method: 'uniformValue',
        uniformValue: {
          lowerBound: start.lower,
          upperBound: start.upper
        }
      });
      break;

    case 'startWith':
      startDoc = new StartYear({
        method: 'sameYearAsAnotherEvent',
        sameYearAsAnotherEvent: start.eventSeries
      });
      break;

    case 'startAfter':
      startDoc = new StartYear({
        method: 'yearAfterAnotherEventEnd',
        yearAfterAnotherEventEnd: start.eventSeries
      });
      break;

    default:
      throw new Error(`Unsupported start type: ${start.type}`);
  }

  return await startDoc.save();
}

async function mapDuration(duration) {
  const stdDev = duration.stdev ?? duration.sd;

  let durationDoc;

  switch (duration.type) {
    case 'fixed':
      durationDoc = new Duration({
        method: 'fixedValue',
        fixedValue: duration.value
      });
      break;

    case 'normal':
      durationDoc = new Duration({
        method: 'normalValue',
        normalValue: {
          mean: duration.mean,
          sd: stdDev
        }
      });
      break;

    case 'uniform':
      durationDoc = new Duration({
        method: 'uniformValue',
        uniformValue: {
          lowerBound: duration.lower,
          upperBound: duration.upper
        }
      });
      break;

    default:
      throw new Error(`Unsupported duration type: ${duration.type}`);
  }

  return await durationDoc.save();
}

async function mapExpectedAnnualChange(dist, amtOrPct = 'percent') {
  const stdDev = dist.stdev ?? dist.sd;

  let changeDoc;

  if (dist.type === 'fixed') {
    changeDoc = new ExpectedAnnualChange({
      method: amtOrPct === 'amount' ? 'fixedValue' : 'fixedPercentage',
      ...(amtOrPct === 'amount'
        ? { fixedValue: dist.value }
        : { fixedPercentage: dist.value })
    });
  } else if (dist.type === 'normal') {
    changeDoc = new ExpectedAnnualChange({
      method: amtOrPct === 'amount' ? 'normalValue' : 'normalPercentage',
      ...(amtOrPct === 'amount'
        ? { normalValue: { mean: dist.mean, sd: stdDev } }
        : { normalPercentage: { mean: dist.mean, sd: stdDev } })
    });
  } else if (dist.type === 'uniform') {
    changeDoc = new ExpectedAnnualChange({
      method: amtOrPct === 'amount' ? 'uniformValue' : 'uniformPercentage',
      ...(amtOrPct === 'amount'
        ? {
            uniformValue: {
              lowerBound: dist.lower,
              upperBound: dist.upper
            }
          }
        : {
            uniformPercentage: {
              lowerBound: dist.lower,
              upperBound: dist.upper
            }
          })
    });
  } else {
    throw new Error(`Unknown distribution type: ${dist.type}`);
  }

  return await changeDoc.save();
}

async function mapIncomeEvent(event) {
  const changeDist = await mapExpectedAnnualChange(event.changeDistribution, event.changeAmtOrPct);

  const incomeDoc = new Income({
    initialAmount: event.initialAmount,
    expectedAnnualChange: changeDist._id,
    inflationAdjustment: event.inflationAdjusted ?? false,
    marriedPercentage: Math.round((event.userFraction ?? 1.0) * 100),
    isSocialSecurity: event.socialSecurity ?? false
  });

  return await incomeDoc.save();
}

async function mapExpenseEvent(event) {
  const changeDist = await mapExpectedAnnualChange(event.changeDistribution, event.changeAmtOrPct);

  const expenseDoc = new Expense({
    initialAmount: event.initialAmount,
    expectedAnnualChange: changeDist._id,
    inflationAdjustment: event.inflationAdjusted ?? false,
    marriedPercentage: Math.round((event.userFraction ?? 1.0) * 100),
    isDiscretionary: event.discretionary ?? false
  });

  return await expenseDoc.save();
}

async function mapInvestEvent(event, investmentMap) {
  const nestedInvestmentStrategy = buildAllocationStructure(event.assetAllocation, investmentMap);
  if (!nestedInvestmentStrategy) {
    console.warn(`Could not build initial allocation structure for invest event: ${event.name}. Allocation data might be missing or invalid in YAML.`);
  }
  
  let nestedFinalInvestmentStrategy = null;
  const isGlide = event.glidePath === true;
  if (isGlide && event.assetAllocation2) {
      nestedFinalInvestmentStrategy = buildAllocationStructure(event.assetAllocation2, investmentMap);
      if (!nestedFinalInvestmentStrategy) {
           console.warn(`Could not build final glide path allocation structure for invest event: ${event.name}.`);
           nestedFinalInvestmentStrategy = null;
      }
  }

  const allocationMethod = isGlide ? 'glidePath' : 'fixedAllocation';
  const allocationDoc = await new Allocation({ method: allocationMethod }).save();
  const allocationDocId = allocationDoc._id;

  const investData = {
    allocations: allocationDocId,
    modifyMaximumCash: event.maxCash != null,
    newMaximumCash: event.maxCash ?? undefined,
    ...(nestedInvestmentStrategy && { 
        taxStatusAllocation: nestedInvestmentStrategy.taxStatusAllocation,
        preTaxAllocation: nestedInvestmentStrategy.preTaxAllocation,
        afterTaxAllocation: nestedInvestmentStrategy.afterTaxAllocation,
        nonRetirementAllocation: nestedInvestmentStrategy.nonRetirementAllocation,
        taxExemptAllocation: nestedInvestmentStrategy.taxExemptAllocation
    }),
    ...(isGlide && nestedFinalInvestmentStrategy && {
        finalTaxStatusAllocation: nestedFinalInvestmentStrategy.taxStatusAllocation,
        finalPreTaxAllocation: nestedFinalInvestmentStrategy.preTaxAllocation,
        finalAfterTaxAllocation: nestedFinalInvestmentStrategy.afterTaxAllocation,
        finalNonRetirementAllocation: nestedFinalInvestmentStrategy.nonRetirementAllocation,
        finalTaxExemptAllocation: nestedFinalInvestmentStrategy.taxExemptAllocation
    })
  };
  
  const investDoc = new Invest(investData);
  return await investDoc.save();
}

async function mapRebalanceEvent(event, investmentMap) {
  const nestedRebalanceStrategy = buildAllocationStructure(event.assetAllocation, investmentMap);
  if (!nestedRebalanceStrategy) {
    console.warn(`Could not build allocation structure for rebalance event: ${event.name}. Allocation data might be missing or invalid in YAML.`);
  }

  const allocationDoc = await new Allocation({ method: 'fixedAllocation' }).save();
  const allocationDocId = allocationDoc._id;

  const rebalanceData = {
    allocations: allocationDocId,
    ...(nestedRebalanceStrategy && { 
        taxStatusAllocation: nestedRebalanceStrategy.taxStatusAllocation,
        preTaxAllocation: nestedRebalanceStrategy.preTaxAllocation,
        afterTaxAllocation: nestedRebalanceStrategy.afterTaxAllocation,
        nonRetirementAllocation: nestedRebalanceStrategy.nonRetirementAllocation,
        taxExemptAllocation: nestedRebalanceStrategy.taxExemptAllocation
    })
  };

  const rebalanceDoc = new Rebalance(rebalanceData);
  return await rebalanceDoc.save();
}

async function createEvent(event, investmentMap) {
  const start = await mapStart(event.start);
  const duration = await mapDuration(event.duration);

  let incomeId = null;
  let expenseId = null;
  let investId = null;
  let rebalanceId = null;

  try {
  switch (event.type) {
    case 'income':
      incomeId = (await mapIncomeEvent(event))._id;
      break;
    case 'expense':
      expenseId = (await mapExpenseEvent(event))._id;
      break;
    case 'invest':
        investId = (await mapInvestEvent(event, investmentMap))._id;
      break;
    case 'rebalance':
        rebalanceId = (await mapRebalanceEvent(event, investmentMap))._id;
      break;
    default:
        console.warn(`Unknown event type during import: ${event.type} for event named "${event.name}". Skipping.`);
        return null;
    }
  } catch (mappingError) {
       console.error(`Error mapping event "${event.name}" (type: ${event.type}):`, mappingError);
       return null;
  }

  const eventDoc = new EventSeries({
    name: event.name,
    description: event.description ?? '',
    startYear: start._id,
    duration: duration._id,
    type: event.type,
    income: incomeId,
    expense: expenseId,
    invest: investId,
    rebalance: rebalanceId
  });

  return await eventDoc.save();
}

async function handleEvents(parsedData, investmentMap) {
  const savedEventIds = [];

  if (!parsedData.eventSeries || !Array.isArray(parsedData.eventSeries)) {
      console.warn("No eventSeries array found in parsed YAML data.");
      return savedEventIds;
  }

  for (const event of parsedData.eventSeries) {
    if (!event || !event.type) {
        console.warn("Skipping invalid event object in eventSeries:", event);
        continue;
    }
    try {
        const savedEvent = await createEvent(event, investmentMap);
        if (savedEvent) {
    savedEventIds.push(savedEvent._id);
        }
    } catch (error) {
        console.error(`Failed to create or save event "${event.name}":`, error);
    }
  }

  return savedEventIds;
}

module.exports = handleEvents;
