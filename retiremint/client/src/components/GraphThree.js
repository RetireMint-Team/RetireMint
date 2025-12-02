import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  BarController,
  BarElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend
);

const DATA_TYPES = {
  INVESTMENT: 'investment',
  INCOME: 'income',
  EXPENSE: 'expense'
};

function GraphThree({ graphThreeInvestment, graphThreeIncome, graphThreeExpense }) {
  const [useMedian, setUseMedian] = useState(false);
  const [dataType, setDataType] = useState(DATA_TYPES.INVESTMENT);
  const [threshold, setThreshold] = useState(0);

  const getActiveDataset = () => {
    switch(dataType) {
      case DATA_TYPES.INCOME: return graphThreeIncome;
      case DATA_TYPES.EXPENSE: return graphThreeExpense;
      default: return graphThreeInvestment;
    }
  };

  const activeDataset = getActiveDataset();

  if (!activeDataset || !Array.isArray(activeDataset) || activeDataset.length === 0) {
    return <div>Loading data...</div>;
  }

  const maxYears = activeDataset.reduce((max, simulation) => {
    return Math.max(max, simulation?.length || 0);
  }, 0);

  const getItemNames = () => {
    const names = new Set();
    activeDataset.forEach(simulation => {
      simulation?.forEach(yearData => {
        if (yearData && typeof yearData === 'object') {
          Object.keys(yearData).forEach(name => names.add(name));
        }
      });
    });
    return Array.from(names);
  };

  const itemNames = getItemNames();

  const processData = () => {
    const result = [];

    for (let yearIndex = 0; yearIndex < maxYears; yearIndex++) {
      const simulationsWithData = activeDataset.filter(
        sim => sim?.length > yearIndex
      ).length;

      if (simulationsWithData > 0) {
        const yearData = {
          year: 2025 + yearIndex,
          values: {},
          hasData: simulationsWithData > 0
        };

        // First calculate all item values for this year
        const itemValues = {};
        itemNames.forEach(item => {
          const values = activeDataset
            .map(simulation => {
              if (yearIndex >= simulation?.length) return null;
              const yearData = simulation[yearIndex];
              return (yearData && yearData[item]) || 0;
            })
            .filter(val => val !== null);

          itemValues[item] = values.length > 0
            ? (useMedian ? calculateMedian(values) : calculateAverage(values))
            : 0;
        });

        // Determine which items to aggregate for this specific year
        const mainItems = [];
        const aggregatedItems = [];
        Object.entries(itemValues).forEach(([item, value]) => {
          if (threshold > 0 && value < threshold) {
            aggregatedItems.push(item);
          } else {
            mainItems.push(item);
          }
        });

        // Add main items to yearData
        mainItems.forEach(item => {
          yearData.values[item] = itemValues[item];
        });

        // Add aggregated "Other" if there are items to aggregate
        if (aggregatedItems.length > 0) {
          yearData.values['Other'] = aggregatedItems.reduce(
            (sum, item) => sum + itemValues[item], 0
          );
        }

        result.push(yearData);
      }
    }

    return result;
  };

  const calculateMedian = (values) => {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 
      ? sorted[mid] 
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const calculateAverage = (values) => {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  };

  const processedData = processData();
  const years = processedData.map(item => item.year.toString());

  // Get all unique items that appear in any year (including "Other")
  const getAllChartItems = () => {
    const items = new Set();
    processedData.forEach(yearData => {
      Object.keys(yearData.values).forEach(item => items.add(item));
    });
    return Array.from(items);
  };

  const chartItems = getAllChartItems();

  const getItemColors = () => {
    const colors = [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', 
      '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
      '#9c755f', '#bab0ac'
    ];
    
    const itemColors = {};
    let colorIndex = 0;
    
    // Assign colors to items (skip "Other" initially)
    chartItems.forEach(item => {
      if (item !== 'Other') {
        itemColors[item] = colors[colorIndex % colors.length];
        colorIndex++;
      }
    });
    
    // Assign special color to "Other" if it exists
    if (chartItems.includes('Other')) {
      itemColors['Other'] = '#cccccc';
    }
    
    return itemColors;
  };

  const itemColors = getItemColors();
  const datasets = chartItems
    .filter(name => name)
    .map(name => ({
      label: name,
      data: processedData.map(year => year.values[name] || 0),
      backgroundColor: itemColors[name],
      borderColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1,
      stack: 'stack',
    }));

  const data = {
    labels: years,
    datasets,
  };

  const getYAxisTitle = () => {
    switch(dataType) {
      case DATA_TYPES.INCOME: return 'Income Value ($)';
      case DATA_TYPES.EXPENSE: return 'Expense Value ($)';
      default: return 'Investment Value ($)';
    }
  };

  const getChartTitle = () => {
    const typeName = dataType.charAt(0).toUpperCase() + dataType.slice(1);
    return `${typeName} Composition Over Time (${useMedian ? 'Median' : 'Average'} Values)` + 
      (threshold > 0 ? ` [Threshold: $${threshold}]` : '');
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: getChartTitle(),
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const rawValue = context.raw || 0;
            const value = rawValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
            
            let total = 0;
            context.chart.data.datasets.forEach(dataset => {
              if (dataset.data[context.dataIndex] !== undefined) {
                total += dataset.data[context.dataIndex];
              }
            });
            
            const percentage = (rawValue / total * 100).toFixed(1);
            
            return `${label}: $${value} (${percentage}% of $${total.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })})`;
          },
          footer: (tooltipItems) => {
            let total = 0;
            tooltipItems.forEach(item => {
              total += item.parsed.y;
            });
            
            return `Total: $${total.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          }
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
    },
    scales: {
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Year'
        },
        grid: {
          display: false
        }
      },
      y: {
        stacked: true,
        title: {
          display: true,
          text: getYAxisTitle()
        },
        beginAtZero: true,
        ticks: {
          callback: (value) => `$${value.toLocaleString()}`
        }
      }
    },
    animation: {
      duration: 1000
    }
  };

  return (
    <div style={{ width: '95%', height: '600px', padding: '20px' }}>
      <h3>Stacked bar chart of median or average values of a selected quantity over time</h3>
      
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setDataType(DATA_TYPES.INVESTMENT)}
          style={{
            padding: '8px 16px',
            backgroundColor: dataType === DATA_TYPES.INVESTMENT ? '#4e79a7' : '#f0f0f0',
            color: dataType === DATA_TYPES.INVESTMENT ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Investments
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.INCOME)}
          style={{
            padding: '8px 16px',
            backgroundColor: dataType === DATA_TYPES.INCOME ? '#4e79a7' : '#f0f0f0',
            color: dataType === DATA_TYPES.INCOME ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Income
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.EXPENSE)}
          style={{
            padding: '8px 16px',
            backgroundColor: dataType === DATA_TYPES.EXPENSE ? '#4e79a7' : '#f0f0f0',
            color: dataType === DATA_TYPES.EXPENSE ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Expenses
        </button>
      </div>

      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px'
      }}>
        <button
          onClick={() => setUseMedian(false)}
          style={{
            padding: '8px 16px',
            backgroundColor: !useMedian ? '#4e79a7' : '#f0f0f0',
            color: !useMedian ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Average Values
        </button>
        <button
          onClick={() => setUseMedian(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: useMedian ? '#4e79a7' : '#f0f0f0',
            color: useMedian ? 'white' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Median Values
        </button>
      </div>
      
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px'
      }}>
        <label htmlFor="threshold" style={{ fontWeight: 'bold' }}>
          Aggregation Threshold ($):
        </label>
        <input
          type="number"
          id="threshold"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value) || 0)}
          min="0"
          step="100"
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '100px'
          }}
        />
      </div>
      
      <Chart 
        type="bar" 
        data={data} 
        options={options} 
        height={400}
      />
    </div>
  );
}

export default GraphThree;