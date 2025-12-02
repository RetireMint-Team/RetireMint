import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MutipleLine = ({exploreDatas}) => {

  if (!exploreDatas || !exploreDatas.results) {
    return <div>Loading data...</div>;
  }
  
  const [selectedQuantity, setSelectedQuantity] = useState('probabilityOfSuccess');
  const baseYear = 2025;
  
  // Format parameter name with event name if available
  const formatParamLabel = (paramName, eventName) => {
    const formatted = paramName?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
    return eventName ? `${formatted} (${eventName})` : formatted;
  };
  
  const paramLabel = formatParamLabel(exploreDatas.parameterName, exploreDatas.eventName);
  
  
  // Process the data based on selected quantity
  const processData = () => {
    return exploreDatas.results.map(result => {
      const { parameterValue, resultForGraph } = result;
      
      if (selectedQuantity === 'probabilityOfSuccess') {
        // Find maximum number of years across all scenarios
        const maxYears = Math.max(...resultForGraph.yearlyResults.map(scenario => scenario.length));
        
        const yearlyProbabilities = Array(maxYears).fill(0).map((_, yearIndex) => {
          const totalScenarios = resultForGraph.yearlyResults.length;
          const successfulScenarios = resultForGraph.yearlyResults.filter(scenario => 
            yearIndex < scenario.length && 
            scenario[yearIndex] && 
            scenario[yearIndex].meetingFinancialGoal
          ).length;
          
          return totalScenarios > 0 ? successfulScenarios / totalScenarios : 0;
        });
        
        return {
          parameterValue,
          data: yearlyProbabilities.map((probability, yearIndex) => ({
            year: baseYear + yearIndex,
            value: probability * 100,
            name: `${parameterValue} ${paramLabel}`
          }))
        };
      } else {
        // Similar approach for investments
        const maxYears = Math.max(...resultForGraph.investmentValueArrays.map(scenario => scenario.length));
        
        const yearlyMedians = Array(maxYears).fill(0).map((_, yearIndex) => {
          const investmentTotals = resultForGraph.investmentValueArrays
            .filter(scenario => yearIndex < scenario.length)
            .map(scenario => {
              const yearInvestments = scenario[yearIndex] || {};
              return Object.values(yearInvestments).reduce((sum, val) => sum + val, 0);
            });
            
          if (investmentTotals.length === 0) return 0;
          
          investmentTotals.sort((a, b) => a - b);
          const mid = Math.floor(investmentTotals.length / 2);
          return investmentTotals.length % 2 !== 0 
            ? investmentTotals[mid] 
            : (investmentTotals[mid - 1] + investmentTotals[mid]) / 2;
        });
        
        return {
          parameterValue,
          data: yearlyMedians.map((median, yearIndex) => ({
            year: baseYear + yearIndex,
            value: median,
            name: `${parameterValue} ${paramLabel}`
          }))
        };
      }
    });
  };
  
  const chartData = processData();
  
  // Find the maximum year across all simulations to set the x-axis domain
  const maxYear = Math.max(...chartData.flatMap(paramData => 
    paramData.data.map(item => item.year)
  ));
  
  // Combine all data for the chart
  const combinedData = [];
  for (let year = baseYear; year <= maxYear; year++) {
    const yearData = { year };
    chartData.forEach(paramData => {
      const dataPoint = paramData.data.find(item => item.year === year);
      if (dataPoint) {
        yearData[`${paramData.parameterValue}`] = dataPoint.value;
      }
    });
    combinedData.push(yearData);
  }

  return (
    <div className="explore-graph-container">
      <div className="explore-graph-controls">
        <h3>Multi-line chart of the value of a selected quantity over time</h3>
        <div className="explore-radio-group">
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={selectedQuantity === 'probabilityOfSuccess'}
              onChange={() => setSelectedQuantity('probabilityOfSuccess')}
            />
            Probability of Success (%)
          </label>
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={selectedQuantity === 'medianInvestments'}
              onChange={() => setSelectedQuantity('medianInvestments')}
            />
            Median Total Investments ($)
          </label>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={combinedData}
          margin={{
            top: 5,
            right: 30,
            left: 50,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="year"
            domain={[baseYear, maxYear]}
            tickFormatter={(year) => year.toString()}
            label={{
              value: 'Year',
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
            labelFormatter={(year) => `Year: ${year}`}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px'  // Adds space between legend and x-axis
            }}
          />
          {chartData.map((paramData) => (
            <Line
              key={paramData.parameterValue}
              type="monotone"
              dataKey={`${paramData.parameterValue}`}
              name={`${paramData.parameterValue} ${paramLabel}`}
              stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`}
              activeDot={{ r: 8 }}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MutipleLine;