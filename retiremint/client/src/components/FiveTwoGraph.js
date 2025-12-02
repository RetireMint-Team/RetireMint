// MockTwo.js
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const FiveTwoGraph = ({exploreDatas}) => {

  if (!exploreDatas || !exploreDatas.results) {
    return <div>Loading data...</div>;
  }
  const [selectedQuantity, setSelectedQuantity] = useState('probabilityOfSuccess');
  
  // Format parameter name with event name if available
  const formatParamLabel = (paramName, eventName) => {
    const formatted = paramName?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
    return eventName ? `${formatted} (${eventName})` : formatted;
  };
  
  const paramLabel = formatParamLabel(exploreDatas.parameterName, exploreDatas.eventName);
  
  // Process the data to get final values for each parameter value
  const processData = () => {
    return exploreDatas.results.map(result => {
      const { parameterValue, resultForGraph } = result;
      
      // Safely get last year index
      const lastYearIndex = resultForGraph?.yearlyResults?.[0]?.length > 0 
        ? resultForGraph.yearlyResults[0].length - 1 
        : -1;
  
      if (selectedQuantity === 'probabilityOfSuccess') {
        // Safe probability calculation
        const totalScenarios = resultForGraph?.yearlyResults?.length || 0;
        const successfulScenarios = resultForGraph.yearlyResults?.filter(scenario => 
          scenario && 
          scenario[lastYearIndex] && 
          scenario[lastYearIndex].meetingFinancialGoal === true
        ).length || 0;
        
        const finalProbability = totalScenarios > 0 ? successfulScenarios / totalScenarios : 0;
        
        return {
          parameterValue,
          value: finalProbability * 100,
          name: `${parameterValue} ${paramLabel}`
        };
      } else {
        // Safe median calculation
        const investmentTotals = (resultForGraph?.investmentValueArrays || [])
          .map(scenario => {
            const lastYearData = scenario && scenario[lastYearIndex];
            return lastYearData ? Object.values(lastYearData).reduce((sum, val) => sum + (val || 0), 0) : 0;
          })
          .filter(val => val !== null && val !== undefined);
        
        // Calculate median only if we have data
        if (investmentTotals.length === 0) {
          return {
            parameterValue,
            value: null, // Will be skipped by Line chart
            name: `${parameterValue} ${paramLabel}`
          };
        }
        
        investmentTotals.sort((a, b) => a - b);
        const mid = Math.floor(investmentTotals.length / 2);
        const finalMedian = investmentTotals.length % 2 !== 0 
          ? investmentTotals[mid] 
          : (investmentTotals[mid - 1] + investmentTotals[mid]) / 2;
        
        return {
          parameterValue,
          value: finalMedian,
          name: `${parameterValue} ${paramLabel}`
        };
      }
    }).sort((a, b) => a.parameterValue - b.parameterValue);
  };
  
  const chartData = processData();

  return (
    <div className="explore-graph-container">
      <div className="explore-graph-controls">
        <h3>Line chart of a selected quantity as a function of parameter value</h3>
        <div className="explore-radio-group">
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={selectedQuantity === 'probabilityOfSuccess'}
              onChange={() => setSelectedQuantity('probabilityOfSuccess')}
            />
            Final Probability of Success (%)
          </label>
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={selectedQuantity === 'medianInvestments'}
              onChange={() => setSelectedQuantity('medianInvestments')}
            />
            Final Median Total Investments ($)
          </label>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 50,
            bottom: 35,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="parameterValue"
            label={{
                value: paramLabel,
                position: 'insideBottom',
                offset: -10
              }}
          />
          <YAxis 
            label={{
              value: selectedQuantity === 'probabilityOfSuccess' 
                ? 'Probability (%)' 
                : 'Investment Value ($)',
              angle: -90,
              position: 'insideLeft',
              offset: -25
            }}
          />
          <Tooltip 
            formatter={(value) => selectedQuantity === 'probabilityOfSuccess' 
              ? [`${value}%`, 'Probability'] 
              : [`$${value.toLocaleString()}`, 'Investment Value']}
            labelFormatter={(paramValue) => `${paramLabel}: ${paramValue}`}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px'  // Adds space between legend and x-axis
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={`Final ${selectedQuantity === 'probabilityOfSuccess' ? 'Probability' : 'Median Investment'}`}
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FiveTwoGraph;