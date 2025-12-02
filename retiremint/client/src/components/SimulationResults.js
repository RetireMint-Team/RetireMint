import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import '../Stylesheets/SimulationResults.css';
import '../Stylesheets/Dashboard.css';
import Header from './HeaderComp';
import Graph from './Graph';
import GraphTwo from './GraphTwo';
import GraphThree from './GraphThree';

const SimulationResults = () => {
  const { reportId } = useParams();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [graphOne, setGraphOne] = useState(null);
  const [financialGoal, setFinancialGoal] = useState(null);
  const [graphTwoInvestment, setGraphTwoInvestment] = useState(null);
  const [graphTwoExpense, setGraphTwoExpense] = useState(null); 
  const [graphTwoEarlyWithdrawalTax, setGraphTwoEarlyWithdrawalTax] = useState(null); 
  const [graphTwoIncome, setGraphTwoIncome] = useState(null); 
  const [graphTwoDiscretionary, setGraphTwoDiscretionary] = useState(null); 
  const [graphThreeInvestment, setGraphThreeInvestment]= useState(null);
  const [graphThreeIncome, setGraphThreeIncome]= useState(null);
  const [graphThreeExpense, setGraphThreeExpense]= useState(null);
  

  useEffect(() => {
    axios.get(`http://localhost:8000/simulation/report/${reportId}`)
      .then(res => {
        setReportData(res.data);
        console.log('Full report data:', res.data);

        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load report:', err);
        setLoading(false);
      });
  }, [reportId]);

  useEffect(() => {
    if (!loading && reportData) {

      setFinancialGoal(reportData.financialGoal);

      const simulations = reportData.resultForGraph?.yearlyResults || [];

      const goalCounts = [];
      const yearSuccessCounts = [];
      const yearTotalCounts = [];

      simulations.forEach(simulation => {
        simulation.forEach((yearData, yearIndex) => {
          yearTotalCounts[yearIndex] = (yearTotalCounts[yearIndex] || 0) + 1;
          if (yearData.meetingFinancialGoal) {
            yearSuccessCounts[yearIndex] = (yearSuccessCounts[yearIndex] || 0) + 1;
            goalCounts[yearIndex] = (goalCounts[yearIndex] || 0) + 1;
          } else {
            yearSuccessCounts[yearIndex] = yearSuccessCounts[yearIndex] || 0;
            goalCounts[yearIndex] = goalCounts[yearIndex] || 0;
          }
        });
      });

      const probabilities = yearSuccessCounts.map((successCount, i) => {
        const rawProbability = successCount / yearTotalCounts[i];
        return Math.round(rawProbability * 10000) / 100;
      });

      setGraphOne(probabilities);

      // Helper function to compute percentiles from a 1D array
      const computePercentilesOne = (valueArrays) => {
        const percentilesData = [];
        const maxLength = Math.max(...valueArrays.map(arr => arr.length));

        for (let yearIndex = 0; yearIndex < maxLength; yearIndex++) {
          const yearValues = valueArrays.map(sim => sim[yearIndex] || null).filter(v => v !== null);
          const sorted = yearValues.sort((a, b) => a - b);

          const yearPercentiles = [];
          for (let i = 1; i <= 9; i++) {
            const index = Math.floor((i / 10) * sorted.length);
            yearPercentiles.push({ percentile: i * 10, value: sorted[index] });
          }

          percentilesData.push(yearPercentiles);
        }

        return percentilesData;
      };

      // Helper function to compute percentiles from a 2D array
      const computePercentilesTwo = (valueArrays) => {
        const percentilesData = [];
        const maxLength = Math.max(...valueArrays.map(arr => arr.length));
      
        for (let yearIndex = 0; yearIndex < maxLength; yearIndex++) {
          const yearSums = valueArrays
            .map(sim => sim[yearIndex])
            .filter(obj => obj !== null && obj !== undefined)
            .map(obj => Object.values(obj).reduce((sum, val) => sum + val, 0)); // sum each year's object
      
          const sorted = yearSums.sort((a, b) => a - b);
      
          const yearPercentiles = [];
          for (let i = 1; i <= 9; i++) {
            const index = Math.floor((i / 10) * sorted.length);
            yearPercentiles.push({ percentile: i * 10, value: sorted[index] });
          }
      
          percentilesData.push(yearPercentiles);
        }
      
        return percentilesData;
      };
      
      const investmentValueArrays = reportData.resultForGraph?.investmentValueArrays || [];
      const expensesArrays = reportData.resultForGraph?.expensesArrays || [];
      const earlyWithdrawalArrays = reportData.resultForGraph?.earlyWithdrawalArrays || []; 
      const incomeArrays = reportData.resultForGraph?.incomeArrays || [];
      const discretionaryArrays = reportData.resultForGraph?.discretionaryRatioArrays || [];

      setGraphTwoInvestment(computePercentilesTwo(investmentValueArrays));
      setGraphTwoExpense(computePercentilesTwo(expensesArrays)); 
      setGraphTwoIncome(computePercentilesTwo(incomeArrays));
      setGraphTwoEarlyWithdrawalTax(computePercentilesOne(earlyWithdrawalArrays)); 
      setGraphTwoDiscretionary(
        computePercentilesOne(discretionaryArrays).map(year =>
          year.map(p => ({ ...p, value: p.value * 100 }))
        )
      );

      setGraphThreeInvestment(investmentValueArrays);
      setGraphThreeIncome(incomeArrays)
      setGraphThreeExpense(expensesArrays)
      
      
    }
  }, [loading, reportData]);

  return (
    <>
      <Header />
      <div className="page-with-sidebar">
        <div className="simulation-results-container">
          {loading ? (
            <div className="loading">
              <p>Loading your simulation results...</p>
            </div>
          ) : reportData ? (
            <>
              <h1>{reportData.name}</h1>
              <div className="graph-section">
                <Graph graphOne={graphOne} />
              </div>
              <div className="graph-section">
                <GraphTwo 
                  graphTwoInvestment={graphTwoInvestment} 
                  financialGoal={financialGoal} 
                  graphTwoExpense={graphTwoExpense} 
                  graphTwoEarlyWithdrawalTax={graphTwoEarlyWithdrawalTax}
                  graphTwoIncome={graphTwoIncome}
                  graphTwoDiscretionary={graphTwoDiscretionary}
                />
              </div>
              <div className="graph-section graph-section-last">
                <GraphThree graphThreeInvestment={graphThreeInvestment} graphThreeIncome={graphThreeIncome} graphThreeExpense={graphThreeExpense} />
              </div>
            </>
          ) : (
            <div className="error">
              <p>Failed to load simulation results. Please try again.</p>
            </div>
          )}
        </div>
        <footer className="dashboard-footer">
          <p>© Copyright RetireMint 2025 All Rights Reserved</p>
        </footer>
      </div>
    </>
  );
};

export default SimulationResults;
