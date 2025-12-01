const ExpectedReturnOrIncome = require('../Schemas/ExpectedReturnOrIncome');
const InvestmentType = require('../Schemas/InvestmentType');
const Investment = require('../Schemas/Investments'); 

function mapReturnOrIncome(dist, amtOrPct = 'percent') {
    const stdDev = dist.stdev ?? dist.sd;
  
    if (dist.type === 'fixed') {
      return {
        method: amtOrPct === 'amount' ? 'fixedValue' : 'fixedPercentage',
        ...(amtOrPct === 'amount'
          ? { fixedValue: dist.value }
          : { fixedPercentage: dist.value })
      };
    } else if (dist.type === 'normal') {
      return {
        method: amtOrPct === 'amount' ? 'normalValue' : 'normalPercentage',
        ...(amtOrPct === 'amount'
          ? { normalValue: { mean: dist.mean, sd: stdDev } }
          : { normalPercentage: { mean: dist.mean, sd: stdDev } })
      };
    } else if (dist.type === 'uniform') {
      return {
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
      };
    } else {
      throw new Error(`Unknown distribution type: ${dist.type}`);
    }
  }  

  async function handleInvestments(yamlData, userId) {
    const nameToTypeMap = new Map();
    const investmentTypes = yamlData.investmentTypes || [];
    const investments = yamlData.investments || [];
    const savedInvestments = [];
    let totalInitialCash = 0;
    const investmentMap = new Map();
  
    // Step 1: Create investment types, skipping "cash"
    for (const type of investmentTypes) {
      if (type.name.toLowerCase() === 'cash') continue;
  
      let existingType = await InvestmentType.findOne({ name: type.name });
  
      if (!existingType) {
        const returnDist = await new ExpectedReturnOrIncome(
          mapReturnOrIncome(type.returnDistribution, type.returnAmtOrPct)
        ).save();
  
        const incomeDist = await new ExpectedReturnOrIncome(
          mapReturnOrIncome(type.incomeDistribution, type.incomeAmtOrPct)
        ).save();
  
        const taxability = type.taxability === false ? 'tax-exempt' : 'taxable';
  
        const investmentTypeDoc = new InvestmentType({
          name: type.name,
          description: type.description,
          expectedAnnualReturn: returnDist._id,
          expectedAnnualIncome: incomeDist._id,
          expenseRatio: type.expenseRatio,
          taxability
        });
  
        existingType = await investmentTypeDoc.save();
      }
  
      nameToTypeMap.set(type.name, existingType._id);
    }
  
    // Step 2: Create investments or count cash
    for (const inv of investments) {
      if (inv.investmentType.toLowerCase() === 'cash') {
        totalInitialCash += inv.value || 0;
        continue; // Don't create cash investment
      }
  
      const typeId = nameToTypeMap.get(inv.investmentType);
      if (!typeId) {
        throw new Error(`Unknown investmentType name: ${inv.investmentType}`);
      }
  
      const taxStatus = inv.taxStatus;
  
      const yamlInvestmentName = inv.id;
      if (!yamlInvestmentName) {
          console.warn("Investment found in YAML without an 'id' field. Skipping.", inv);
          continue; // Skip investments without an id/name in YAML
      }

      const investmentDoc = new Investment({
        name: yamlInvestmentName,
        investmentType: typeId,
        value: inv.value,
        accountTaxStatus: taxStatus,
        maxAnnualContribution: inv.maxAnnualContribution
      });
  
      const savedInvestment = await investmentDoc.save();
      savedInvestments.push(savedInvestment);
      
      investmentMap.set(yamlInvestmentName, { 
          _id: savedInvestment._id, 
          accountTaxStatus: savedInvestment.accountTaxStatus 
      });
    }
  
    return {
      investmentIds: savedInvestments.map(inv => inv._id),
      initialCash: totalInitialCash,
      investmentMap
    };
  }  

module.exports = handleInvestments;
