import React, { useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Filler,
  Tooltip
);

const DATA_TYPES = {
  INVESTMENT: 'investment',
  INCOME: 'income',
  EXPENSE: 'expense',
  TAX: 'earlyWithdrawalTax',
  DISCRETIONARY: 'discretionary'
};

function GraphTwo({ 
  graphTwoInvestment, 
  financialGoal, 
  graphTwoExpense, 
  graphTwoEarlyWithdrawalTax,
  graphTwoIncome,
  graphTwoDiscretionary 
}) {
  const [dataType, setDataType] = useState(DATA_TYPES.INVESTMENT);
  const startYear = 2025;

  if (!Array.isArray(graphTwoInvestment)) {
    return <div>Loading graph...</div>;
  }

  const years = graphTwoInvestment.map((_, index) => startYear + index);

  // Get the active dataset based on selected type
  const getActiveDataset = () => {
    switch(dataType) {
      case DATA_TYPES.INCOME: return graphTwoIncome;
      case DATA_TYPES.EXPENSE: return graphTwoExpense;
      case DATA_TYPES.TAX: return graphTwoEarlyWithdrawalTax;
      case DATA_TYPES.DISCRETIONARY: return graphTwoDiscretionary;
      default: return graphTwoInvestment;
    }
  };

  const activeDataset = getActiveDataset();

  const getPercentileValues = (percentile) =>
    activeDataset.map(
      (yearData) => yearData.find((d) => d.percentile === percentile)?.value || 0
    );

  const p50 = getPercentileValues(50);
  const p10 = getPercentileValues(10);
  const p90 = getPercentileValues(90);
  const p20 = getPercentileValues(20);
  const p80 = getPercentileValues(80);
  const p30 = getPercentileValues(30);
  const p70 = getPercentileValues(70);
  const p40 = getPercentileValues(40);
  const p60 = getPercentileValues(60);

  // Create array with financial goal value for each year
  const goalLineData = years.map(() => financialGoal);

  // Only include financial goal line for investment dataset
  const datasets = [
    // Percentile ranges
    {
      label: '10-90 Percentile Range',
      data: p10,
      backgroundColor: 'rgba(136, 132, 216, 0.1)',
      borderColor: 'transparent',
      fill: '+1',
      pointRadius: 0,
    },
    {
      label: '',
      data: p90,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      pointRadius: 0,
    },
    {
      label: '20-80 Percentile Range',
      data: p20,
      backgroundColor: 'rgba(130, 202, 157, 0.2)',
      borderColor: 'transparent',
      fill: '+1',
      pointRadius: 0,
    },
    {
      label: '',
      data: p80,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      pointRadius: 0,
    },
    {
      label: '30-70 Percentile Range',
      data: p30,
      backgroundColor: 'rgba(255, 198, 88, 0.3)',
      borderColor: 'transparent',
      fill: '+1',
      pointRadius: 0,
    },
    {
      label: '',
      data: p70,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      pointRadius: 0,
    },
    {
      label: '40-60 Percentile Range',
      data: p40,
      backgroundColor: 'rgba(255, 128, 66, 0.4)',
      borderColor: 'transparent',
      fill: '+1',
      pointRadius: 0,
    },
    {
      label: '',
      data: p60,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      pointRadius: 0,
    },
    {
      label: 'Median (50th Percentile)',
      data: p50,
      borderColor: '#8884d8',
      borderWidth: 2,
      backgroundColor: 'transparent',
      pointRadius: 0,
      fill: false,
    },
    // Conditionally add financial goal line
    ...(dataType === DATA_TYPES.INVESTMENT ? [{
      label: 'Financial Goal',
      data: goalLineData,
      borderColor: '#ff0000',
      borderWidth: 2,
      borderDash: [5, 5],
      backgroundColor: 'transparent',
      pointRadius: 0,
      fill: false,
    }] : []),
  ];

  const getYAxisTitle = () => {
    switch(dataType) {
      case DATA_TYPES.INCOME: return 'Income Value';
      case DATA_TYPES.EXPENSE: return 'Expense Value';
      case DATA_TYPES.TAX: return 'Early Withdrawal Tax Value';
      case DATA_TYPES.DISCRETIONARY: return 'Discretionary Expenses (%)';
      default: return 'Investment Value';
    }
  };

  const options = {
    responsive: true,
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
            label: function (context) {
                const rawValue = context.parsed.y;
                const formattedValue = dataType === DATA_TYPES.DISCRETIONARY
                  ? `${rawValue.toFixed(2)}%`
                  : `$${rawValue.toFixed(2)}`;
                return `${context.dataset.label || ''}: ${formattedValue}`;
              }
              
        },
      },
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Year',
        },
      },
      y: {
        title: {
          display: true,
          text: getYAxisTitle(),
        },
        ...(dataType === DATA_TYPES.DISCRETIONARY ? {
          ticks: {
            callback: function(value) {
              return `${value}%`;
            }
          }
        } : {}),
      },
    },
  };

  return (
    <div style={{ marginTop: '40px', paddingBottom: '40px' }}>
      <h3>Shaded line chart of probability ranges for a selected quantity over time</h3>

      <div style={{ 
        marginBottom: '1rem', 
        display: 'flex', 
        gap: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setDataType(DATA_TYPES.INVESTMENT)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: dataType === DATA_TYPES.INVESTMENT ? '#8884d8' : '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: dataType === DATA_TYPES.INVESTMENT ? 'white' : 'black',
          }}
        >
          Investment
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.INCOME)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: dataType === DATA_TYPES.INCOME ? '#8884d8' : '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: dataType === DATA_TYPES.INCOME ? 'white' : 'black',
          }}
        >
          Income
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.EXPENSE)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: dataType === DATA_TYPES.EXPENSE ? '#8884d8' : '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: dataType === DATA_TYPES.EXPENSE ? 'white' : 'black',
          }}
        >
          Expense
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.TAX)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: dataType === DATA_TYPES.TAX ? '#8884d8' : '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: dataType === DATA_TYPES.TAX ? 'white' : 'black',
          }}
        >
          Early Withdrawal Tax
        </button>
        <button
          onClick={() => setDataType(DATA_TYPES.DISCRETIONARY)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: dataType === DATA_TYPES.DISCRETIONARY ? '#8884d8' : '#eee',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            color: dataType === DATA_TYPES.DISCRETIONARY ? 'white' : 'black',
          }}
        >
          Discretionary Expenses
        </button>
      </div>
      
      <Chart type="line" data={{ labels: years, datasets }} options={options} />
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
        <LegendItem color="rgba(136, 132, 216, 0.1)" label="10–90 Percentile Range" />
        <LegendItem color="rgba(130, 202, 157, 0.2)" label="20–80 Percentile Range" />
        <LegendItem color="rgba(255, 198, 88, 0.3)" label="30–70 Percentile Range" />
        <LegendItem color="rgba(255, 128, 66, 0.4)" label="40–60 Percentile Range" />
        <LegendItem color="#8884d8" label="Median (50th Percentile)" isLine />
        {dataType === DATA_TYPES.INVESTMENT && (
          <LegendItem color="#ff0000" label="Financial Goal" isLine isDashed />
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, isLine, isDashed }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          width: 20,
          height: isLine ? 2 : 14,
          backgroundColor: color,
          border: isLine ? `2px solid ${color}` : 'none',
          borderStyle: isDashed ? 'dashed' : 'solid',
          marginRight: 8,
        }}
      ></div>
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );
}

export default GraphTwo;