import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MutipleLine from './MutipleLine';
import FiveTwoGraph from './FiveTwoGraph';
import Header from './HeaderComp';
import '../Stylesheets/SimulationResults.css';
import '../Stylesheets/Dashboard.css';

const OneDimensionalSimulationResults = () => {
  const location = useLocation();
  const [exploreDatas, setExploreDatas] = useState(() => location.state?.exploreResults || {});

  useEffect(() => {
    console.log('Explore Data:', exploreDatas);
  }, [exploreDatas]);

  return (
    <>
      <Header />
      <div className="page-with-sidebar">
        <div className="simulation-results-container">
          <h1>One-Dimensional Scenario Exploration</h1>
          <div className="graph-section">
            <MutipleLine exploreDatas={exploreDatas}/>
          </div>
          <div className="graph-section graph-section-last">
            <FiveTwoGraph exploreDatas={exploreDatas}/>
          </div>
        </div>
        <footer className="dashboard-footer">
          <p>© Copyright RetireMint 2025 All Rights Reserved</p>
        </footer>
      </div>
    </>
  );
};

export default OneDimensionalSimulationResults;