const formatLifeExpectancy = require('./helpers/formatLifeExpectancy');
const formatInvestmentTypes = require('./helpers/formatInvestmentTypes');
const formatInvestments = require('./helpers/formatInvestments');
const mapSimulationSettings = require('./helpers/mapSimulationSettings');
const mapEventSeries = require('./helpers/mapEvent');

async function scenarioToYaml(scenario) {
  // Create a map from Investment DB _id to the YAML name (inv.id)
  const investmentIdToNameMap = new Map();
  if (scenario.investments && Array.isArray(scenario.investments)) {
      scenario.investments.forEach(inv => {
          if (inv && inv._id && inv.name) { // Ensure we have necessary fields
             investmentIdToNameMap.set(inv._id.toString(), inv.name);
          }
      });
  }

  // Map events asynchronously
  const mappedEvents = await mapEventSeries(scenario.events, investmentIdToNameMap);

  const result = {
    name: scenario.name,
    maritalStatus: scenario.scenarioType === 'married' ? 'couple' : 'individual',
    birthYears: scenario.scenarioType === 'married'
      ? [scenario.birthYear, scenario.spouseBirthYear]
      : [scenario.birthYear],
    lifeExpectancy: scenario.scenarioType === 'married'
      ? [
          formatLifeExpectancy(scenario.lifeExpectancy),
          formatLifeExpectancy(scenario.spouseLifeExpectancy)
        ]
      : [formatLifeExpectancy(scenario.lifeExpectancy)],
    investmentTypes: formatInvestmentTypes(scenario.investments),
    investments: formatInvestments(scenario.investments),

    eventSeries: mappedEvents,

    ...mapSimulationSettings(scenario.simulationSettings, scenario.investments),
    financialGoal: scenario.financialGoal,
    residenceState: scenario.stateOfResidence
  };

  return result;
}

  
  // Helper: Format distributions (fixed or normal)
  function formatDistribution(dist) {
    if (!dist) return null;
    if (dist.type === 'normal') {
      return {
        type: 'normal',
        mean: dist.mean,
        stddev: dist.stddev
      };
    }
    return {
      type: 'fixed',
      value: dist.value
    };
  }
  
  // Helper: Format events
  function mapEvent(e) {
    const base = {
      name: e.name,
      description: e.description,
      start: formatStartOrDuration(e.start),
      duration: formatStartOrDuration(e.duration),
      type: e.type
    };
  
    if (e.type === 'income' || e.type === 'expense') {
      base.initialAmount = e.initialAmount;
      base.expectedAnnualChange = formatDistribution(e.expectedAnnualChange);
      base.adjustForInflation = e.adjustForInflation;
      if (e.type === 'income') {
        base.socialSecurity = e.socialSecurity;
      } else {
        base.discretionary = e.discretionary;
      }
    }
  
    if (e.type === 'invest' || e.type === 'rebalance') {
      base.assetAllocation = e.assetAllocation;
      if (e.type === 'invest') {
        base.maximumCash = e.maximumCash;
      }
    }
  
    return base;
  }
  
  // Helper: Format start or duration (fixed or distribution)
  function formatStartOrDuration(obj) {
    if (!obj) return null;
    if (obj.type === 'normal' || obj.type === 'uniform') {
      return {
        type: obj.type,
        min: obj.min,
        max: obj.max,
        mean: obj.mean,
        stddev: obj.stddev
      };
    } else if (obj.type === 'relative') {
      return {
        type: 'relative',
        relation: obj.relation,
        event: obj.event
      };
    } else {
      return {
        type: 'fixed',
        value: obj.value
      };
    }
  }

  module.exports = scenarioToYaml;
  