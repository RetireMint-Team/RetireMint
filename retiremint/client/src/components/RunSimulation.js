import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Stylesheets/RunSimulation.css';

const RunSimulation = ({ scenarioId, scenarioName }) => {
  const [numSimulations, setNumSimulations] = useState(100);
  const [reportName, setReportName] = useState(`Simulation Report for ${scenarioName}`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [scenario, setScenario] = useState(null);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [exploreMode, setExploreMode] = useState('none');

  const [scenarioParameter, setScenarioParameter] = useState('');
  const [scenarioParameter2, setScenarioParameter2] = useState('');

  const [lowerBound, setLowerBound] = useState('');
  const [upperBound, setUpperBound] = useState('');
  const [stepSize, setStepSize] = useState('');
  
  const [lowerBound2, setLowerBound2] = useState('');
  const [upperBound2, setUpperBound2] = useState('');
  const [stepSize2, setStepSize2] = useState('');

  const [parameterId, setParameterId] = useState('');
  const [parameterId2, setParameterId2] = useState('');


  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  // Fetch Scenario Data (to fetch events/investments data for Scenario Exploration)
  useEffect(() => {
    try{
      const fetchScenario = async () => {
        const response = await axios.post(`http://localhost:8000/simulation/scenario/data`, {scenarioId: scenarioId});  
        setScenario(response.data);
        const responseEvents = await axios.post(`http://localhost:8000/simulation/scenario/events`, {scenarioId: response.data._id});
        setEvents(responseEvents.data.events); 
        const responseSettings = await axios.post(`http://localhost:8000/simulation/scenario/settings`, {scenarioId: response.data._id});
        setSettings(responseSettings.data.settings);
      }
      fetchScenario();
    }
    catch(error) {
      console.error('Error fetching scenario:', error);
      setError('Error loading scenario');
    }

  }, [scenarioId])

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!scenarioId) {
      setError('No scenario selected. Please select a scenario first.');
      return;
    }
    
    if (exploreMode === 'none') {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.post('http://localhost:8000/simulation/run', {
          scenarioId,
          numSimulations,
          userId,
          reportName,
          exploreMode
        });
        
        // Store the reportId in localStorage for easy access
        localStorage.setItem('latestReportId', response.data.reportId);
        
        // Navigate to the results page
        navigate(`/simulation-results/${response.data.reportId}`);
      } catch (err) {
        console.error('Error running simulation:', err);
        setError('Error running simulation. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    else if (exploreMode === 'one-dimensional') {
      try {
        setLoading(true);
        setError(null);

        if (scenarioParameter === '') {
          setError('Invalid Scenario Parameter')
          setLoading(false);
        }
        else if (lowerBound === NaN || upperBound === NaN || stepSize === NaN){
          setError('Invalid set of values (among Upper Bound, Lower Bound, or Step Size')
          setLoading(false);
        }
        else if (lowerBound >= upperBound) {
          setError('Lower Bound cannot be greater than or equal to the lower Bound');
          setLoading(false);
        }
        else {
          const simResults = [];
          const parameterValues = [];
          for (let i = lowerBound; i < upperBound; i += stepSize) {
            parameterValues.push(i);
            // Create a temporary scenario that has the scenario parameter changed. 
            const tempScenarioResponse = await axios.post('http://localhost:8000/simulation/explore-scenario/create', {
              scenarioId: scenarioId,
              scenarioParameter: scenarioParameter,
              scenarioParameter2: null,
              parameterId: parameterId,
              parameterId2: null,
              changedValue: i,
              changedValue2: null,
            });

            // Run Simulations on Temporary Adjusted Scenario:
            const simulationResponse = await axios.post('http://localhost:8000/simulation/run', {
              scenarioId: tempScenarioResponse.data.scenarioId,
              numSimulations,
              userId,
              reportName,
            });

            simResults.push({parameterValue: i ,resultForGraph: simulationResponse.data.results});

            // Delete temporary Scenarios and Reports
            

          }
          const exploreResults = {parameterName: scenarioParameter, parameterValues: parameterValues, results: simResults}
          console.log(exploreResults);
          navigate(`/one-dimensional-simulation-results`, { state: { exploreResults: exploreResults }})
        }
        
      } catch (err) {
        console.error('Error running simulation:', err);
        setError('Error running simulation. Please try again later.');
      } finally {
        setLoading(false);
      }
    }


    else if (exploreMode === 'two-dimensional') {
      try {
        setLoading(true);
        setError(null);

        if (scenarioParameter === '' || scenarioParameter2 === '') {
          setError('Invalid Scenario Parameter')
          setLoading(false);
        }
        else if (isNaN(lowerBound) ||  isNaN(upperBound) || isNaN(stepSize) || isNaN(lowerBound2) ||  isNaN(upperBound2) || isNaN(stepSize2)){
          setError('Invalid set of values (among Upper Bound, Lower Bound, or Step Size')
          setLoading(false);
        }
        else if (lowerBound >= upperBound || lowerBound2 >= upperBound2) {
          setError('Lower Bound cannot be greater than or equal to the lower Bound');
          setLoading(false);
        }
        else {
          const simResults = [];
          const parameterValues = [];
          const parameterValues2 = [];
          /* Populate Parameter Values 2 here rather than in inner loop to avoid repeats of values */
          for (let j = lowerBound2; j < upperBound2; j += stepSize2) {
            parameterValues2.push(j);
          }

          for (let i = lowerBound; i < upperBound; i += stepSize) {
            parameterValues.push(i);
            for (let j = lowerBound2; j < upperBound2; j += stepSize2) {
              // Create a temporary scenario that has the 2 scenario parameters changed. 
              const tempScenarioResponse = await axios.post('http://localhost:8000/simulation/explore-scenario/create', {
                scenarioId: scenarioId,
                scenarioParameter: scenarioParameter,
                scenarioParameter2: scenarioParameter2,
                parameterId: parameterId,
                parameterId2: parameterId2,
                changedValue: i,
                changedValue2: j,
              });

              // Run Simulations on Temporary Adjusted Scenario:
              const simulationResponse = await axios.post('http://localhost:8000/simulation/run', {
                scenarioId: tempScenarioResponse.data.scenarioId,
                numSimulations,
                userId,
                reportName,
              }); 
              simResults.push({parameterValue: i, parameterValue2: j, resultForGraph: simulationResponse.data.results});
            }


            // Delete temporary Scenarios and Reports
            

          }
          const exploreResults = {parameterName: scenarioParameter, parameterName2: scenarioParameter2, parameterValues: parameterValues, parameterValues2: parameterValues2, results: simResults}
          console.log(exploreResults);
          navigate(`/two-dimensional-simulation-results`, { state: { exploreResults: exploreResults }})
        }
        
      } catch (err) {
        console.error('Error running simulation:', err);
        setError('Error running simulation. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="run-simulation-container">
      <h2>Run Simulation for {scenarioName}</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <select value={exploreMode} onChange={(e) => setExploreMode(e.target.value)}>
        <option value={'none'}>Run Simulations</option>
        <option value={'one-dimensional'}>One-Dimensional Scenario Exploration</option>
        <option value={'two-dimensional'}>Two-Dimensional Scenario Exploration</option>
      </select>

      {exploreMode === 'none' ? 
        <>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div>
              <label>Report Name:</label>
              <input 
                type='text' 
                id='reportName' 
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="numSimulations">Number of Simulations:</label>
              <input
                type="number"
                id="numSimulations"
                value={numSimulations}
                onChange={(e) => setNumSimulations(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="1000"
                required
              />
              <p className="help-text">More simulations provide more accurate results but take longer to run. Recommended: 100-500.</p>
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </form>
        </> 
      : exploreMode === 'one-dimensional' || exploreMode === 'two-dimensional' ? 
      <>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div>
            <label>Report Name:</label>
            <input 
              type='text' 
              id='reportName' 
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="numSimulations">Number of Simulations:</label>
            <input
              type="number"
              id="numSimulations"
              value={numSimulations}
              onChange={(e) => setNumSimulations(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="1000"
              required
            />
            <p className="help-text">More simulations provide more accurate results but take longer to run. Recommended: 100-500.</p>
          </div>
          <div>
            <label>Scenario Parameter</label>
            <select value={scenarioParameter} onChange={(e) => setScenarioParameter(e.target.value)}>
              <option value={''}>--Choose a Scenario Parameter--</option>
              {settings !== null && settings.rothOptimizerEnable === true && (
                <option value={"roth-optimizer"}>Roth Optimizer</option>
              )}
              <option value={"event-start-year"}>Event Series Start Year</option>
              <option value={"event-duration"}>Event Series Duration</option>
              <option value={"event-initial-amount"}>Event Series Initial Amount</option>
              <option value={"investment-allocation"}>Investment Allocation Percentage</option>
            </select>
          </div>
          <div>
            {(scenarioParameter === 'roth-optimizer') ? 
              <div>
                <input
                  type='checkbox'
                />
                <label>Roth Optimizer Enabled</label>
              </div>
              : (scenarioParameter !== '') && (
                <>
                <label>Lower Bound</label>
                <input type='number' value={lowerBound} onChange={(e) => setLowerBound(parseInt(e.target.value))}/>

                <label>Upper Bound</label>
                <input type='number' value={upperBound} onChange={(e) => setUpperBound(parseInt(e.target.value))}/>

                <label>Step Size</label>
                <input type='number' value={stepSize} onChange={(e) => setStepSize(parseInt(e.target.value))}/>
                
                {(scenarioParameter === 'event-start-year' || scenarioParameter === 'event-duration') && (
                  <>
                    <label>Choose Event Series</label>
                    <select value={parameterId} onChange={(e) => {setParameterId(e.target.value); console.log(parameterId);}}>
                      <option value={''}>-- Choose --</option>
                      {events.map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                    </select>
                  </>
                )}

                {(scenarioParameter === 'event-initial-amount') && (
                  <>
                    <label>Choose Income / Expense Event Series</label>
                    <select>
                      <option value={''}>-- Choose --</option>
                      {(events.filter((event) => (event.type === 'income' || event.type === 'expense'))).map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                    </select>
                  </>
                )}

                {(scenarioParameter === 'investment-allocation') && (
                  <>
                    <label>Choose Invest Event</label>
                    <select>
                      <option value={''}>-- Choose --</option>
                      {(events.filter((event) => (event.type === 'invest'))).map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                      {/* Return to this */}
                    </select>
                  </>
                )}
                </>
              )
            }
          </div>

          {(exploreMode === 'two-dimensional') && (
            <>
            <div>
              <label>Second Scenario Parameter</label>
              <select value={scenarioParameter2} onChange={(e) => setScenarioParameter2(e.target.value)}>
                <option value={''}>--Choose a Second Scenario Parameter--</option>
                {settings !== null && settings.rothOptimizerEnable === true && (
                  <option value={"roth-optimizer"}>Roth Optimizer</option>
                )}
                <option value={"event-start-year"}>Event Series Start Year</option>
                <option value={"event-duration"}>Event Series Duration</option>
                <option value={"event-initial-amount"}>Event Series Initial Amount</option>
                <option value={"investment-allocation"}>Investment Allocation Percentage</option>
              </select>
            </div>

            <div>
            {(scenarioParameter2 === 'roth-optimizer') ? 
              <div>
                <input
                  type='checkbox'
                />
                <label>Roth Optimizer Enabled</label>
              </div>
              : (scenarioParameter2 !== '') && (
                <>
                  <label>Second Lower Bound</label>
                  <input type='number' value={lowerBound2} onChange={(e) => setLowerBound2(parseInt(e.target.value))}/>

                  <label>Second Upper Bound</label>
                  <input type='number' value={upperBound2} onChange={(e) => setUpperBound2(parseInt(e.target.value))}/>

                  <label>Second Step Size</label>
                  <input type='number' value={stepSize2} onChange={(e) => setStepSize2(parseInt(e.target.value))}/>
                  
                  {(scenarioParameter2 === 'event-start-year' || scenarioParameter2 === 'event-duration') && (
                    <>
                      <label>Choose Event Series</label>
                      <select value={parameterId2} onChange={(e) => {setParameterId2(e.target.value); console.log(parameterId);}}>
                        <option value={''}>-- Choose --</option>
                        {events.map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                      </select>
                    </>
                  )}

                  {(scenarioParameter2 === 'event-initial-amount') && (
                    <>
                      <label>Choose Income / Expense Event Series</label>
                      <select>
                        <option value={''}>-- Choose --</option>
                        {(events.filter((event) => (event.type === 'income' || event.type === 'expense'))).map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                      </select>
                    </>
                  )}

                  {(scenarioParameter2 === 'investment-allocation') && (
                    <>
                      <label>Choose Invest Event</label>
                      <select>
                        <option value={''}>-- Choose --</option>
                        {(events.filter((event) => (event.type === 'invest'))).map((event,index) => (<option key={index} value={event._id}>{event.name}</option>))}
                        {/* Return to this */}
                      </select>
                    </>
                  )}
                  </>
                )
              }
            </div>
            </>



          )}

        </div>
        
        
        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </form>
      </> 
      : 
        <>
          
        </>
      }
      
      
      {loading && (
        <div className="loading-message">
          <p>Running Monte Carlo simulations... This may take a moment.</p>
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default RunSimulation; 