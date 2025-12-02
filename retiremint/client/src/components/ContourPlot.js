import React, { useState } from 'react';  
import Plot from 'react-plotly.js';


const calculateProbability = (resultForGraph) => {
  if (!resultForGraph?.yearlyResults || resultForGraph.yearlyResults.length === 0) return 0;

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

const calculateMedianInvestments = (resultForGraph) => {
  if (!resultForGraph?.investmentValueArrays || resultForGraph.investmentValueArrays.length === 0) return 0;

  // Use the first simulation's length as reference
  const lastYearIndex = resultForGraph.investmentValueArrays[0]?.length > 0 
    ? resultForGraph.investmentValueArrays[0].length - 1 
    : -1;
  
  if (lastYearIndex < 0) return 0;
  
  const totals = resultForGraph.investmentValueArrays.map(sim => {
    if (!sim || !sim[lastYearIndex]) return 0;
    return Object.values(sim[lastYearIndex]).reduce((sum, val) => sum + (val || 0), 0);
  }).filter(val => val > 0);
  
  if (totals.length === 0) return 0;
  
  totals.sort((a, b) => a - b);
  const mid = Math.floor(totals.length / 2);
  return totals.length % 2 !== 0 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2;
};

const prepareContourData = (exploreDatas, zType) => {
  // Safely get parameter values with fallbacks
  const xValues = exploreDatas?.parameterValues || [];
  const yValues = exploreDatas?.parameterValues2 || [];
  
  // Sort numerically (important for contour plots)
  const x = [...xValues].sort((a, b) => a - b);
  const y = [...yValues].sort((a, b) => a - b);

  // Initialize z-matrix with proper dimensions
  const z = Array(x.length).fill().map(() => Array(y.length).fill(0));

  // Fill the z-matrix
  x.forEach((xVal, i) => {
    y.forEach((yVal, j) => {
      const result = exploreDatas.results?.find(
        r => r?.parameterValue === xVal && r?.parameterValue2 === yVal
      );
      
      if (result?.resultForGraph) {
        try {
          z[i][j] = zType === 'probability'
            ? calculateProbability(result.resultForGraph)
            : calculateMedianInvestments(result.resultForGraph);
        } catch (error) {
          console.error(`Calculation error for (${xVal}, ${yVal}):`, error);
          z[i][j] = 0;
        }
      }
    });
  });

  console.log('Contour data:', { x, y, z }); // Debug output
  return { x, y, z };
};

const ContourPlot = ({ exploreDatas }) => {
  const [zAxis, setZAxis] = useState('probability');
  
  // Format parameter name with event name if available
  const formatParamLabel = (paramName, eventName) => {
    const formatted = paramName?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
    return eventName ? `${formatted} (${eventName})` : formatted;
  };
  
  const paramLabel1 = formatParamLabel(exploreDatas?.parameterName, exploreDatas?.eventName);
  const paramLabel2 = formatParamLabel(exploreDatas?.parameterName2, exploreDatas?.eventName2);
  
  const { x, y, z } = prepareContourData(exploreDatas, zAxis);

  return (
    <div className="explore-graph-container">
      <div className="explore-graph-controls">
        <h3>Contour plot of a selected quantity as a function of parameter values</h3>
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
        data={[
          {
            type: 'contour',
            x: x,
            y: y,
            z: z,
            colorscale: zAxis === 'probability' ? 'Viridis' : 'Hot',
            connectgaps: true,
            contours: {
              coloring: 'heatmap',
              showlabels: true,
              labelfont: {
                size: 12,
                color: 'white'
              }
            },
            colorbar: {
              title: zAxis === 'probability' ? 'Probability' : 'Amount ($)',
              titleside: 'right'
            },
            hoverinfo: 'x+y+z',
            hoverlabel: {
              bgcolor: '#333',
              font: {
                color: 'white'
              }
            }
          },
        ]}
        layout={{
          title: {
            text: `${zAxis === 'probability' 
              ? 'Probability of Success' 
              : 'Median Investments'} Contour Plot`,
            font: {
              size: 16
            }
          },
          xaxis: {
            title: paramLabel1,
            tickvals: x,
            tickmode: 'array',
            gridcolor: '#eee'
          },
          yaxis: {
            title: paramLabel2,
            tickvals: y,
            tickmode: 'array',
            gridcolor: '#eee'
          },
          margin: { t: 60, b: 60, l: 60, r: 60 },
          plot_bgcolor: '#f9f9f9',
          paper_bgcolor: '#f9f9f9',
          autosize: true
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false
        }}
        style={{ width: '100%', height: '500px', margin: '0 auto' }}
        useResizeHandler={true}
      />
    </div>
  );
};

export default ContourPlot;
