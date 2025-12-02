import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './HeaderComp';
import SurfacePlot from './SurfacePlot';
import ContourPlot from './ContourPlot';
import '../Stylesheets/SimulationResults.css';
import '../Stylesheets/Dashboard.css';


const TwoDimensionalSimulationResults = () => {
  
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
          <h1>Two-Dimensional Scenario Exploration</h1>
          <div className="graph-section graph-section-2d-first">
            <SurfacePlot exploreDatas={exploreDatas}/>
          </div>
          <div className="graph-section graph-section-last">
            <ContourPlot exploreDatas={exploreDatas}/>
          </div>
        </div>
        <footer className="dashboard-footer">
          <p>© Copyright RetireMint 2025 All Rights Reserved</p>
        </footer>
      </div>
    </>
  );
};

export default TwoDimensionalSimulationResults;