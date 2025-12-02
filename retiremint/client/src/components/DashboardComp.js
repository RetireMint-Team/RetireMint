import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from './HeaderComp';
import RunSimulation from './RunSimulation';
import '../Stylesheets/Dashboard.css';
import fileDownload from 'js-file-download';

function Dashboard() {
    const [scenarios, setScenarios] = useState([]);
    const [reports, setReports] = useState([]);
    const [sharedReportsData, setSharedReportsData] = useState([]);
    const [sharedScenariosData, setSharedScenariosData] = useState([]);

    const [ownerView, setOwnerView] = useState('users');
    const [loading, setLoading] = useState(true);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [showSimulationForm, setShowSimulationForm] = useState(false);
    const [error, setError] = useState(null);
    const [stateWarning, setStateWarning] = useState(null);
    const [shareScenario, setShareScenario] = useState(null);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [shareEmail, setShareEmail] = useState('');
    const [sharePermissions, setSharePermissions] = useState('view');
    const [shareError, setShareError] = useState(null);
    const [showImportOptions, setShowImportOptions] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);



    const navigate = useNavigate();

    // Memoize fetchUserData to prevent infinite re-renders
    const fetchUserData = useCallback(async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('userId');
            if (userId) {
                // Fetch user's scenarios
                const scenariosResponse = await axios.get(`http://localhost:8000/user/${userId}/scenarios`);
                setScenarios(scenariosResponse.data);

                // Fetch user's simulation reports
                const reportsResponse = await axios.get(`http://localhost:8000/simulation/reports/${userId}`);
                setReports(reportsResponse.data);

                // Fetch scenarios shared with user and the respective permissions
                const sharedScenariosResponse = await axios.get(`http://localhost:8000/simulation/sharedscenarios/${userId}`);
                console.log("Shared Scenarios Response: ", sharedScenariosResponse.data);
                const sharedScenarios = [];
                sharedScenariosResponse.data.map((scenario) => {
                    const userParameters = scenario.sharedUsers.find((userData) => userData.userId === userId);
                    if (userParameters != undefined) {
                        sharedScenarios.push({scenario: scenario, permissions: userParameters.permissions})
                    }
                })
                console.log("Shared Scenarios: ", sharedScenarios);
                setSharedScenariosData(sharedScenarios);
                
                // Fetch reports shared with user and the respective permissions
                const sharedReportsResponse = await axios.get(`http://localhost:8000/simulation/sharedreports/${userId}`)
                const sharedReports = [];
                sharedReportsResponse.data.map((report) => {
                    const userParameters = report.sharedUsers.find((userData) => userData.userId === userId);
                    if (userParameters != undefined) {
                        sharedReports.push({report: report, permissions: userParameters.permissions})
                    }
                })
                setSharedReportsData(sharedReports);

                // Fetch user's data
                const userResponse = await axios.get(`http://localhost:8000/user/${userId}`);
                const userData = userResponse.data;

                // Check if the user's state is in the allowed list
                const allowedStates = ['NY', 'NJ', 'CT', 'TX'];
                if (!allowedStates.includes(userData.state)) {
                    setStateWarning('Your state tax file is not available. You have to fill it out. Without it, all simulations will be done without state tax.');
                }

                // Simply log state taxes without storing in state
                try {
                    const stateTaxesResponse = await axios.get(`http://localhost:8000/user/${userId}/stateTaxes`);
                    console.log('User state taxes:', stateTaxesResponse.data);
                } catch (taxError) {
                    console.error('Error fetching state taxes:', taxError);
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Fetch user's scenarios and reports when component mounts
        fetchUserData();
    }, [fetchUserData]);

    const handleNewScenario = () => {
        navigate('/new-scenario/new');
    };

    const handleLogout = () => {
        localStorage.removeItem('userId');
        localStorage.removeItem('latestReportId');
        navigate('/login');
    };

    const handleSelectScenario = (scenario) => {
        setSelectedScenario(scenario);
        setShowSimulationForm(true);
    };

    const handleViewReport = (reportId) => {
        navigate(`/simulation-results/${reportId}`);
    };

    const handleEditReport = async (reportId) => {
        navigate(`/new-scenario/${reportId}`);
    }
    
    const handleEditScenario = async (scenarioId) => {
        console.log("SCENARIOID: ", scenarioId);
        navigate(`/new-scenario/${scenarioId}`);
    }

    const handleDeleteReport = async (reportId) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            try {
                await axios.delete(`http://localhost:8000/simulation/report/${reportId}`);
                setReports(reports.filter(report => report._id !== reportId));
            } catch (error) {
                console.error('Error deleting report:', error);
                setError('Failed to delete the report. Please try again later.');
            }
        }
    };

    const handleDeleteScenario = async (scenarioId) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            console.log("Deleting Scenario: ", scenarioId);
            try {
                await axios.delete(`http://localhost:8000/simulation/scenario/${scenarioId}`);
                setScenarios(scenarios.filter(scenario => scenario._id !== scenarioId));
                console.log("Successfully deleted scenario ", scenarioId);
            } catch (error) {
                console.error('Error deleting scenario:', error);
                setError('Failed to delete the scenario. Please try again later.');
            }
        }
    };

    // Handle opening the Share Menu on a given report.
    const handleShareReport = async (reportId) => {
        try{
            const report = await axios.get(`http://localhost:8000/simulation/report/${reportId}`);
            setShareReport(report.data);
            setShowShareMenu(true);
        }
        catch (error) { 
            console.error('Error opening share menu:', error);
            setError('Failed to open the share menu. Please try again later.');
        }
    }

    // Handle opening the Share Menu on a given report.
    const handleShareScenario = async (scenarioId) => {
        try{
            const scenario = await axios.post(`http://localhost:8000/simulation/scenario/data`, {scenarioId: scenarioId});
            setShareScenario(scenario.data)
            setShowShareMenu(true);
        }
        catch (error) { 
            console.error('Error opening share menu:', error);
            setError('Failed to open the share menu. Please try again later.');
        }
    }
    // Handle sharing a report with another user by adding it to the Scenario and Report in the DB.
    const handleShareUser = async  () => {        
        if (shareScenario) {
            try {
                // Reset any previous errors from attempting to share
                setShareError(null);
                const sharedUserId = (await axios.get(`http://localhost:8000/user/email/${shareEmail}`)).data;
                await axios.post('http://localhost:8000/scenario/shareToUser', {scenarioId: shareScenario._id, userId: sharedUserId, email: shareEmail, permissions: sharePermissions});
                await axios.post('http://localhost:8000/report/shareToUser', {scenarioId: shareScenario._id, userId: sharedUserId, email: shareEmail, permissions: sharePermissions});
                // Update shareReport on the front-end to show new shared users.
                handleShareScenario(shareScenario._id);
            }   
            catch (error) {
                console.error("Share Error");
                setShareError(error.response?.data?.error);
            }
        }
        else {
            setShareError("No proper report selected.")
        }
    }

    // Handle changing a shared user's existing permissions to a given report.
    const handleChangeSharePermissions = async (user, permissions) => {
        if (shareScenario) {
            try {
                // Reset any previous errors from attempting to share
                setShareError(null);
                await axios.post('http://localhost:8000/scenario/shareToUser', {scenarioId: shareScenario._id, userId: user.userId, email: user.email, permissions: permissions});
                await axios.post('http://localhost:8000/report/shareToUser', {scenarioId: shareScenario._id, userId: user.userId, email: user.email, permissions: permissions});
                // Update shareReport on the front-end to show new shared users.
                handleShareScenario(shareScenario._id);
            }   
            catch (error) {
                console.error("Share Error");
                setShareError(error.response?.data?.error);
            }
        }
        else {
            setShareError("No proper scenario selected.")
        }
    }

    const handleRemoveSharedUser = async (user) => {
        if (shareScenario) {
            try {
                // Reset any previous errors from attempting to share
                setShareError(null);
                await axios.post('http://localhost:8000/scenario/removeSharedUser', {scenarioId: shareScenario._id, userId: user.userId, email: user.email});
                await axios.post('http://localhost:8000/report/removeSharedUser', {scenarioId: shareScenario._id, userId: user.userId, email: user.email});
                // Update shareReport on the front-end to show new shared users.
                handleShareScenario(shareScenario._id);
            }   
            catch (error) {
                console.error("Remove Shared User Error");
                setShareError(error.response?.data?.error);
            }
        }
        else {
            setShareError("No proper report selected.")
        } 
    }

    if (loading) {
        return (
            <>
                <Header />
                <div className="page-with-sidebar">
                    <div className="dashboard-container loading">
                        <div className="loading-spinner"></div>
                        <p>Loading your financial data...</p>
                    </div>
                </div>
            </>
        );
    }

        const handleScenarioExport = async (scenarioId, scenarioName) => {
        try {
            const response = await axios.get(`http://localhost:8000/export/${scenarioId}`, {
                responseType: 'blob',
                withCredentials: true
              });

            // Clean the name to be safe for filenames (remove spaces, punctuation, etc.)
            const safeName = scenarioName
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, '_')      // Replace non-alphanumerics with _
            .replace(/_+/g, '_')              // Collapse multiple underscores
            .replace(/^_+|_+$/g, '');         // Trim leading/trailing underscores

            fileDownload(response.data, `${safeName || 'scenario'}.yaml`);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export scenario.');
        }
        };
 
      
      const handleScenarioImport = async (file) => {
        const formData = new FormData();
        formData.append("scenario", file); // this matches multer field
        formData.append("userId", localStorage.getItem("userId")); // send userId explicitly
    
        try {
            const response = await axios.post("http://localhost:8000/import/import-scenario", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
    
            alert("Scenario imported successfully!");
            console.log(response.data);
            fetchUserData(); 
        } catch (error) {
            console.error("Error importing scenario:", error);
            alert("Failed to import scenario. Check the YAML file and try again.");
        } finally {
            // Always hide the import box whether success or failure
            setShowImportOptions(false);
        }
    };    
       
      
    return (
        <>
        <Header />
        <div className="page-with-sidebar">
        <div className="dashboard-container">
            {/* Unified Toolbar Row */}
            <div className="dashboard-toolbar">
                <div className="toolbar-section toolbar-left">
                    <div className="toolbar-actions">
                        <button onClick={handleNewScenario} className="action-button">
                            Create New Scenario
                        </button>
                        
                        {!showImportOptions ? (
                            <button 
                                onClick={() => setShowImportOptions(true)} 
                                className="import-scenario-header-button"
                            >
                                Import Scenario
                            </button>
                        ) : (
                            <div className="import-options-box">
                                <label htmlFor="scenarioImportInput" className="import-button-label">
                                    <input
                                        type="file"
                                        id="scenarioImportInput"
                                        accept=".yaml"
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleScenarioImport(e.target.files[0])}
                                    />
                                    <span className="import-button">Upload YAML File</span>
                                </label>
                                <button 
                                    onClick={() => setShowImportOptions(false)} 
                                    className="cancel-import-button"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="toolbar-section toolbar-right">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-option ${ownerView === 'users' ? 'active' : ''}`}
                            onClick={() => setOwnerView('users')}
                        >
                            My Scenarios
                        </button>
                        <button 
                            className={`toggle-option ${ownerView === 'shared' ? 'active' : ''}`}
                            onClick={() => setOwnerView('shared')}
                        >
                            Shared With Me
                        </button>
                        <div className={`toggle-slider ${ownerView === 'shared' ? 'right' : 'left'}`}></div>
                    </div>
                    <button className="logout-toolbar-button" onClick={handleLogout}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Log out</span>
                    </button>
                </div>
            </div>
            
            <div className="dashboard-main-content">
            {error && <div className="error-message">{error}</div>}
            {stateWarning && <div className="warning-message">{stateWarning}</div>}
            <div className="dashboard-content">
                <div className="scenarios-section">

                    {/* User is viewing their own Reports */}
                    {ownerView === 'users' ? (
                        <>
                        <div className="scenarios-header">
                            <h2 className="scenarios-title">Your Financial Scenarios</h2>
                        </div>
                        {scenarios.length === 0 ? (
                            <div className="empty-state">
                                <p>You haven't created any scenarios yet.</p>
                                <button onClick={handleNewScenario}>Create Your First Scenario</button>
                            </div>
                        ) : (
                            <div className="scenarios-list">
                                {scenarios.map(scenario => (
                                    <div key={scenario._id} className="scenario-card">
                                        <div className="scenario-card-header">
                                            <h3 className="scenario-title">{scenario.name}</h3>
                                        </div>
                                        <div className="scenario-actions-grid">
                                            <button 
                                                className="scenario-action-button"
                                                onClick={() => handleEditScenario(scenario._id)}
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                className="scenario-action-button"
                                                onClick={() => handleScenarioExport(scenario._id, scenario.name)}
                                            >
                                                Export
                                            </button>
                                            <button 
                                                className="scenario-action-button"
                                                onClick={() => handleShareScenario(scenario._id)}
                                            >
                                                Share
                                            </button>
                                            <button 
                                                className="scenario-action-button"
                                                onClick={() => handleDeleteScenario(scenario._id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                        <div className='report-actions'>
                                            <button 
                                                onClick={() => handleSelectScenario(scenario)}
                                                className="run-simulation-button"
                                            >
                                                Run Simulation
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </>
                    ) : (
                        <>
                        <h2>Shared Financial Scenarios</h2>
                        
                        {sharedScenariosData.length === 0 ? (
                            <div className="empty-state">
                                <p>No scenarios have been shared with you yet yet.</p>
                            </div>
                        ) : (
                            <div className="scenarios-list">
                                {sharedScenariosData.map(scenarioData => {
                                    const scenario = scenarioData.scenario;
                                    return(
                                        <div key={scenario._id} className="scenario-card">
                                            <div className="scenario-card-header">
                                                <h3 className="scenario-title">{scenario.name}</h3>
                                            </div>
                                            {scenarioData.permissions === 'edit' && (
                                                <div className="scenario-actions-grid">
                                                    <button 
                                                        className="scenario-action-button"
                                                        onClick={() => handleEditScenario(scenario._id)}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                            <div className='report-actions'>
                                                <button 
                                                    onClick={() => handleSelectScenario(scenario)}
                                                    className="run-simulation-button"
                                                >
                                                    Run Simulation
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                )}
                            </div>
                        )}
                        </>
                    )}
                </div>
                
                <div className="reports-section">
                    <div>
                        <h2>Recent Simulation Reports</h2>
                    </div>
                    
                    {/* User is viewing their own Reports */}
                    {ownerView === 'users' ? (
                        <>
                        {reports.length === 0 ? (
                            <div className="empty-state">
                                <p>You haven't run any simulations yet.</p>
                                {scenarios.length > 0 && (
                                    <p>Select a scenario and run a simulation to see results.</p>
                                )}
                            </div>
                        ) : (
                            <div className="reports-list">
                                {reports.map(report => (
                                    <div key={report._id} className="report-card">
                                        <div>
                                            <h3>{report.name}</h3>
                                        </div>
                                        <div className="report-details">
                                            <p>Date: {new Date(report.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="report-actions">
                                            <button 
                                                onClick={() => handleViewReport(report._id)}
                                                className="view-report-button"
                                            >
                                                View Results
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteReport(report._id)}
                                                className="delete-report-button"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </>
                    ) : (
                        <>
                        {/* User is viewing the Reports shared with them */}
                        {sharedReportsData.length === 0 ? (
                            <div className="empty-state">
                                <p>No reports have been shared with you.</p>
                            </div>
                        ) : (
                            <div className="reports-list">
                                {sharedReportsData.map(reportData => { 
                                    const report = reportData.report;
                                    return(
                                    <div key={report._id} className="report-card">
                                        <div>
                                            <h3>{report.name}</h3>
                                        </div>
                                        <div className="report-details">
                                            <p>Author: {report.userId}</p>
                                            <p>Date: {new Date(report.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="report-actions">
                                            <button 
                                                onClick={() => handleViewReport(report._id)}
                                                className="view-report-button"
                                            >
                                                View Results
                                            </button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>
            </div>

            {showShareMenu && shareScenario && (
                <div className='share-menu-background'>
                    <div className='share-menu-box'>
                        <button 
                            className="close-share-menu"
                            onClick={() => setShowShareMenu(false)}
                        >
                            Close Share Menu
                        </button>
                        <div className='share-menu-header-container'>
                            <h3 className='share-menu-header'>Share <span className='green'>{shareScenario.name}</span></h3>
                            <p>Shared Users:</p>
                        </div>
                        <div className='shared-user-list'>
                            {shareScenario.sharedUsers.length === 0 ? (
                                <div>No shared users</div>
                            ) : (
                                shareScenario.sharedUsers.map((user) => (
                                <div key={user.userId} className='shared-user-box'>
                                    <p>{user.email}</p>
                                    <div className='shared-user-permissions'>
                                        <select value={user.permissions} onChange={(e) => handleChangeSharePermissions(user, e.target.value)}>
                                            <option value="view">View</option>
                                            <option value="edit">Edit</option>
                                        </select>
                                        <button onClick={(e) => handleRemoveSharedUser(user)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))) }
                            
                        </div>
                        <h3>Invite a User:</h3>
                        <div className='invite-user-container'>
                            <div className='invite-user-text'>                                <input 
                                    type='text'
                                    placeholder="Enter user email:" 
                                    value={shareEmail}
                                    onChange={(e) => setShareEmail(e.target.value)}
                                />
                            </div>
                            <div className='shared-user-permissions'>
                                <select name="permissions" onChange={(e) => setSharePermissions(e.target.value)}>
                                    <option value="view">View</option>   
                                    <option value="edit">Edit</option> 
                                </select>
                                <button className='add-user-button' onClick={() => handleShareUser()}>
                                    Add
                                </button>
                            </div>
                            <p>{shareError}</p>
                        </div>
                    </div>

                </div>
            )}
            
            {showSimulationForm && selectedScenario && (
                <div className="simulation-form-overlay">
                    <div className="simulation-form-container">
                        <button 
                            className="close-button"
                            onClick={() => setShowSimulationForm(false)}
                        >
                            ×
                        </button>
                        <RunSimulation 
                            scenarioId={selectedScenario._id} 
                            scenarioName={selectedScenario.name} 
                        />
                    </div>
                </div>
            )}

        </div>
        
        <footer className="dashboard-footer">
            <p>© Copyright RetireMint 2025 All Rights Reserved</p>
        </footer>
        </div>
        </>
    );
}

export default Dashboard;
