import React, { useState } from 'react';
import Plot from 'react-plotly.js';

// Safe probability calculation
const calculateProbability = (resultForGraph) => {
  // Check if we have any yearly results
  if (!resultForGraph?.yearlyResults?.length) {
    return 0;
  }
  
  // Use the first simulation's length as reference (same approach as FiveTwoGraph)
  const lastYearIndex = resultForGraph.yearlyResults[0]?.length > 0 
    ? resultForGraph.yearlyResults[0].length - 1 
    : -1;
  
  if (lastYearIndex < 0) return 0;
  
  const total = resultForGraph.yearlyResults.length;
  const successes = resultForGraph.yearlyResults.filter(sim => 
    sim && 
    sim[lastYearIndex] && 
    sim[lastYearIndex].meetingFinancialGoal === true
  ).length;
  
  const probability = total > 0 ? successes / total : 0;
  
  // Multiply probability by 100 to scale it to percentage
  return probability * 100;
};

// Safe median investment calculation
const calculateMedianInvestments = (resultForGraph) => {
  // Check if we have any investment arrays
  if (!resultForGraph?.investmentValueArrays?.length) return 0;
  
  // Use the first simulation's length as reference
  const lastYearIndex = resultForGraph.investmentValueArrays[0]?.length > 0 
    ? resultForGraph.investmentValueArrays[0].length - 1 
    : -1;
  
  if (lastYearIndex < 0) return 0;
  
  const totals = resultForGraph.investmentValueArrays
    .map(sim => {
      if (!sim || !sim[lastYearIndex]) return 0;
      return Object.values(sim[lastYearIndex]).reduce((sum, val) => sum + (val || 0), 0);
    })
    .filter(val => val > 0);
  
  if (totals.length === 0) return 0;
  
  totals.sort((a, b) => a - b);
  const mid = Math.floor(totals.length / 2);
  return totals.length % 2 !== 0 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2;
};

const prepareSurfaceData = (exploreDatas, zType) => {
  if (!exploreDatas?.results?.length) return { x: [], y: [], z: [] };
  
  try {
    // Extract unique parameter values 
    const x = [...new Set(exploreDatas.results.map(r => r?.parameterValue))].sort((a, b) => a - b);
    const y = [...new Set(exploreDatas.results.map(r => r?.parameterValue2))].sort((a, b) => a - b);
    
    // Create z matrix by finding matching results
    const z = x.map(xVal => 
      y.map(yVal => {
        const result = exploreDatas.results.find(
          r => r?.parameterValue === xVal && r?.parameterValue2 === yVal
        );
        
        if (!result?.resultForGraph) {
          console.warn(`Missing data for ${xVal}, ${yVal}`);
          return 0;
        }
        
        try {
          return zType === 'probability' 
            ? calculateProbability(result.resultForGraph) 
            : calculateMedianInvestments(result.resultForGraph);
        } catch (e) {
          console.error(`Error calculating value for ${xVal}, ${yVal}:`, e);
          return 0;
        }
      })
    );
    
    console.log('Surface data prepared:', { x, y, z });
    return { x, y, z };
  } catch (error) {
    console.error('Error preparing surface data:', error);
    return { x: [], y: [], z: [] };
  }
};

const SurfacePlot = ({ exploreDatas }) => {
  const [zAxis, setZAxis] = useState('probability');

  // Safe data preparation with loading state
  if (!exploreDatas) {
    return <div>Loading data...</div>;
  }
  
  // Format parameter name with event name if available
  const formatParamLabel = (paramName, eventName) => {
    const formatted = paramName?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
    return eventName ? `${formatted} (${eventName})` : formatted;
  };
  
  const paramLabel1 = formatParamLabel(exploreDatas.parameterName, exploreDatas.eventName);
  const paramLabel2 = formatParamLabel(exploreDatas.parameterName2, exploreDatas.eventName2);

  const { x, y, z } = prepareSurfaceData(exploreDatas, zAxis);

  // Handle empty data case
  if (x.length === 0 || y.length === 0) {
    return <div>No valid data available for surface plot</div>;
  }

  return (
    <div className="explore-graph-container">
      <div className="explore-graph-controls">
        <h3>Surface plot of a selected quantity as a function of parameter values</h3>
        <div className="explore-radio-group">
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={zAxis === 'probability'}
              onChange={() => setZAxis('probability')}
            />
            Probability of Success
          </label>
          <label className="explore-radio-label">
            <input
              type="radio"
              checked={zAxis === 'investment'}
              onChange={() => setZAxis('investment')}
            />
            Median Investments ($)
          </label>
        </div>
      </div>

      <Plot
        data={[{
          type: 'surface',
          x: x,
          y: y,
          z: z,
          colorscale: zAxis === 'probability' ? 'Viridis' : 'Hot',
          colorbar: {
            title: zAxis === 'probability' ? 'Probability' : 'Amount ($)',
          },
          contours: {
            x: { show: true, start: Math.min(...x), end: Math.max(...x), size: (Math.max(...x) - Math.min(...x))/(x.length || 1) },
            y: { show: true, start: Math.min(...y), end: Math.max(...y), size: (Math.max(...y) - Math.min(...y))/(y.length || 1) },
          },
        }]}
        layout={{
          title: `${zAxis === 'probability' ? 'Probability of Success' : 'Median Investments'} vs. Parameters`,
          scene: {
            xaxis: { 
              title: paramLabel1 || 'Parameter 1',
              tickvals: x,
              tickmode: 'array',
            },
            yaxis: { 
              title: paramLabel2 || 'Parameter 2',
              tickvals: y,
              tickmode: 'array',
            },
            zaxis: { 
              title: zAxis === 'probability' ? 'Success Probability' : 'Median Investments ($)',
            },
          },
          margin: { t: 40, b: 40, l: 60, r: 60 },
        }}
        config={{ responsive: true }}
        style={{ width: '100%', height: '600px' }}
      />
    </div>
  );
};

export default SurfacePlot;