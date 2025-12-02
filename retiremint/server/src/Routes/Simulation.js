const express = require('express');
const router = express.Router();
const { runSimulations } = require('../SimulationEngine');
const Scenario = require('../Schemas/Scenario');
const Report = require('../Schemas/Report');
const ExploreReport = require('../Schemas/ExploreReport');
const Event = require('../Schemas/EventSeries');
const StartYear = require('../Schemas/StartYear');
const Duration = require('../Schemas/Duration');
const fs = require('fs');
const path = require('path');
const User = require('../Schemas/Users');

// Get a simulation report by ID
router.get('/report/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Ensure the report has the structure the client is expecting
    const transformedReport = {
      ...report.toObject(),
      // Ensure finalAssetStatistics has the expected field names
      finalAssetStatistics: {
        min: report.finalAssetStatistics?.minimum || report.finalAssetStatistics?.min || 0,
        max: report.finalAssetStatistics?.maximum || report.finalAssetStatistics?.max || 0,
        mean: report.finalAssetStatistics?.average || report.finalAssetStatistics?.mean || 0,
        median: report.finalAssetStatistics?.median || 0
      }
    };

    // Make sure simulationResults is valid
    if (!transformedReport.simulationResults || !Array.isArray(transformedReport.simulationResults) || transformedReport.simulationResults.length === 0) {
      console.warn(`Report ${req.params.id} has invalid simulationResults structure`);
      // Provide a minimal valid structure to prevent client errors
      transformedReport.simulationResults = [{
        simulationId: 1,
        success: false,
        finalTotalAssets: 0,
        yearlyResults: [{
          year: new Date().getFullYear(),
          totalAssets: 0,
          income: 0,
          expenses: 0,
          socialSecurity: 0,
          capitalGains: 0,
          inflationRate: 0.02
        }],
        finalState: {
          totalAssets: 0,
          curYearIncome: 0,
          curYearSS: 0,
          curYearGains: 0,
          inflationRate: 0.02
        }
      }];
    }

    res.json(transformedReport);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'An error occurred while fetching the report' });
  }
});

// Get scenario data for a report
router.get('/report/:id/scenario', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Fetch the scenario and populate related data
    const scenario = await Scenario.findById(report.scenarioId)
      .populate({
        path: 'simulationSettings',
        populate: {
          path: 'inflationAssumption'
        }
      })
      .populate('lifeExpectancy') // Populate user life expectancy
      .populate('spouseLifeExpectancy'); // Populate spouse life expectancy (will be null if not applicable)
      
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario from report:', error);
    res.status(500).json({ error: 'An error occurred while fetching the scenario' });
  }
});

// Get scenario data for a given scenarioId
router.post('/scenario/data', async (req, res) => {
  console.log("Received post req! for scenario");
  try {
    const {scenarioId} = req.body;
    console.log(`found scenario: ${scenarioId}`);
    // Fetch the scenario and populate related data
    const scenario = await Scenario.findById(scenarioId)
      .populate({
        path: 'simulationSettings',
        populate: {
          path: 'inflationAssumption'
        }
      })
      .populate('lifeExpectancy') // Populate user life expectancy
      .populate('spouseLifeExpectancy'); // Populate spouse life expectancy (will be null if not applicable)
      
    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }
    res.json(scenario);
  } catch (error) {
    console.error('Error fetching scenario from scenarioId:', error);
    res.status(500).json({ error: 'An error occurred while fetching the scenario' });
  }
});

// Get all reports for a user
router.get('/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find all reports where the userId matches
    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
});

// Run simulation for a scenario
router.post('/run', async (req, res) => {
  try {
    const { scenarioId, numSimulations, userId, reportName } = req.body;
    
    // --- Fetch User Data --- 
    let user = null;
    if (userId) {
        user = await User.findById(userId).lean(); // Use lean() for plain JS object
    }
    if (!user) {
        console.warn(`User not found with ID: ${userId}. Using default for logs.`);
        // Create a default user object if lookup fails
        user = { _id: userId || 'UnknownUserId', name: 'UnknownUser' }; 
    }
    // ----------------------

    console.log(`Starting simulation for scenario: ${scenarioId}, user: ${user.name} (${user._id})`);
    console.log(`Simulation parameters: ${numSimulations} simulations`);
    
    // Fetch the scenario from the database with deeper population
    const scenario = await Scenario.findById(scenarioId)
      .populate({
        path: 'simulationSettings',
        populate: {
          path: 'inflationAssumption'
        }
      })
      // Deeper and more reliable population of investmentType to ensure all fields are available
      .populate({
        path: 'investments',
        populate: {
          path: 'investmentType',
          populate: 'expectedAnnualReturn'
        }
      })
      .populate({
        path: 'events',
        populate: ['startYear', 'duration', 'income', 'expense', 'invest', 'rebalance']
      })
      .populate({
        path:'sharedUsers',
      });
    
    if (!scenario) {
      console.error(`Scenario not found with ID: ${scenarioId}`);
      return res.status(404).json({ error: 'Scenario not found' });
    }
    
    console.log(`Found scenario: ${scenario.name}`);
    
    // Validate investments before proceeding
    const validInvestments = scenario.investments.filter(inv => inv && inv.investmentType);
    const invalidInvestments = scenario.investments.filter(inv => !inv || !inv.investmentType);
    
    console.log(`Found ${validInvestments.length} valid investments and ${invalidInvestments.length} invalid investments`);
    
    // Log any invalid investments for debugging
    if (invalidInvestments.length > 0) {
      console.warn('Invalid investments detected:', invalidInvestments.map(inv => ({
        id: inv ? inv._id : 'null-investment',
        hasInvestmentType: inv ? !!inv.investmentType : false
      })));
    }
    
    if (validInvestments.length === 0) {
      console.error('No valid investments found in scenario');
      return res.status(400).json({ 
        error: 'Invalid scenario data', 
        message: 'No valid investments found in scenario'
      });
    }
    
    // The simulation engine will handle its own tax data now
    let taxData = null;
    
    // Verify data before running simulation
    const result = await runSimulations(
      scenario, 
      user,
      taxData, 
      numSimulations
    );
    
    // Check if this is just a data verification run
    if (result.status === 'data_verification_only') {
      console.log('Data verification completed successfully');
      
      // Create a simple log file for the data verification
      const logDir = path.join(__dirname, '..', '..', 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const datetime = new Date().toISOString().replace(/[:.]/g, '-');
      const username = scenario.userId || 'anonymous';
      const logFile = path.join(logDir, `data_verification_${username}_${datetime}.log`);
      
      let logContent = `Data Verification for Scenario: ${scenario.name}\n`;
      logContent += `User ID: ${scenario.userId}\n`;
      logContent += `Scenario ID: ${scenarioId}\n`;
      logContent += `Timestamp: ${new Date().toISOString()}\n\n`;
      logContent += `Verification Status: ${result.dataVerified ? 'SUCCESS' : 'FAILED'}\n`;
      logContent += `Message: ${result.message}\n`;
      
      fs.writeFileSync(logFile, logContent);
      
      // Return a simplified result to the client
      return res.json({
        success: true,
        status: 'data_verification_only',
        message: result.message,
        scenarioId: scenarioId,
        // Mock a report for the frontend to display
        mockReport: {
          _id: `mock_${new Date().getTime()}`,
          name: `Data Verification for ${scenario.name}`,
          userId: scenario.userId,
          scenarioId: scenarioId,
          numSimulations: numSimulations,
          numYears: result.numYears,
          createdAt: new Date().toISOString(),
          // Default statistics to avoid frontend errors
          successRate: 0,
          financialGoal: scenario.financialGoal || 0,
          finalAssetStatistics: {
            min: 0,
            max: 0,
            mean: 0,
            median: 0
          },
          // Empty simulation results - frontend should handle this gracefully
          simulationResults: []
        }
      });
    }
    
    // For the regular simulation case, continue with existing code
    // Create log files for debugging
    const logDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const datetime = new Date().toISOString().replace(/[:.]/g, '-');
    const username = scenario.userId || 'anonymous';
    
    // Log first simulation to CSV
    const csvFile = path.join(logDir, `${username}_${datetime}.csv`);
    let csvContent = 'Year,';
    
    // Add column headers for each investment
    if (result.simulationResults && result.simulationResults[0]) {
      const firstSimulation = result.simulationResults[0];
      
      // Convert to CSV
      csvContent += 'Total Assets,Income,Social Security,Capital Gains,Inflation Rate\n';
      
      // Add rows for each year
      firstSimulation.yearlyResults.forEach(yearResult => {
        csvContent += `${yearResult.year},${yearResult.totalAssets},${yearResult.income},${yearResult.socialSecurity},${yearResult.capitalGains},${yearResult.inflationRate}\n`;
      });
      
      fs.writeFileSync(csvFile, csvContent);
    }
    
    // Log detailed events
    const logFile = path.join(logDir, `${username}_${datetime}.log`);
    let logContent = `Simulation Report for ${scenario.name}\n`;
    logContent += `User ID: ${scenario.userId}\n`;
    logContent += `Number of Simulations: ${numSimulations}\n`;
    logContent += `Number of Years: ${result.numYears}\n`;
    
    // Ensure successRate is a valid number for toFixed
    const safeSuccessRate = typeof result.successRate === 'number' && !isNaN(result.successRate) 
      ? result.successRate 
      : 0;
    logContent += `Success Rate: ${safeSuccessRate.toFixed(2)}%\n`;
    
    // Log simulation results
    if (result.simulationResults) {
      logContent += `\nSimulation Results:\n`;
      result.simulationResults.forEach((simulation, index) => {
        logContent += `Simulation ${index + 1}:\n`;
        logContent += `Final Asset Statistics: ${JSON.stringify(simulation.finalAssetStatistics)}\n`;
        // Add safety check for successRate
        const simSuccessRate = typeof simulation.successRate === 'number' && !isNaN(simulation.successRate) 
          ? simulation.successRate 
          : 0;
        logContent += `Success Rate: ${simSuccessRate.toFixed(2)}%\n`;
        logContent += `\nYearly Results:\n`;
        simulation.yearlyResults.forEach(yearResult => {
          logContent += `Year: ${yearResult.year}, Total Assets: ${yearResult.totalAssets}, Income: ${yearResult.income}, Social Security: ${yearResult.socialSecurity}, Capital Gains: ${yearResult.capitalGains}, Inflation Rate: ${yearResult.inflationRate}\n`;
        });
        logContent += `\n`;
      });
    }
    
    fs.writeFileSync(logFile, logContent);

    // Save the report to the database
    console.log(`Creating and saving report for scenario: ${scenario.name}`);
    
    // Create a report document with possibly reduced data to avoid MongoDB document size limits
    const report = new Report({
      name: reportName,
      resultForGraph: result.aggregatedResults,
      userId: scenario.userId,
      scenarioId: scenarioId,
      sharedUsers: scenario.sharedUsers,
      numSimulations: numSimulations,
      successRate: result.successRate,
      financialGoal: scenario.financialGoal || 0,
      finalAssetStatistics: {
        // Use consistent property names with the calculation
        min: result.finalAssetStatistics?.min || 0,
        max: result.finalAssetStatistics?.max || 0,
        mean: result.finalAssetStatistics?.mean || 0,
        median: result.finalAssetStatistics?.median || 0,
        // Keep legacy names for backward compatibility
        minimum: result.finalAssetStatistics?.min || 0,
        maximum: result.finalAssetStatistics?.max || 0,
        average: result.finalAssetStatistics?.mean || 0
      },
      // Limit the number of simulations stored to avoid MongoDB document size limits
      // Keep only 10 simulations for visualization purposes - this helps with performance
      simulationResults: Array.isArray(result.simulationResults) 
        ? result.simulationResults.slice(0, 10).map(sim => ({
            simulationId: sim.simulationId,
            success: sim.success,
            finalTotalAssets: sim.finalTotalAssets,
            finalState: sim.finalState,
            // Reduce yearlyResults data size by keeping only essential fields
            yearlyResults: sim.yearlyResults.map(yr => ({
              year: yr.year,
              totalAssets: yr.totalAssets,
              income: yr.income,
              socialSecurity: yr.socialSecurity || 0,
              capitalGains: yr.capitalGains || 0,
              inflationRate: yr.inflationRate || 0.02
            }))
          }))
        : [], // Default to empty array if undefined or not an array
      createdAt: new Date()
    });
    
    try {
      await report.save();
      console.log(`Report saved with ID: ${report._id}`);
    } catch (saveError) {
      console.error('Error saving report to MongoDB:', saveError);
      // If saving fails due to document size, try with even more reduced data
      if (saveError.name === 'MongoError' && saveError.code === 10334) {
        console.log('Document too large, trying with less data...');
        report.simulationResults = result.simulationResults.slice(0, 5).map(sim => ({
          simulationId: sim.simulationId,
          success: sim.success,
          finalTotalAssets: sim.finalTotalAssets,
          finalState: sim.finalState,
          yearlyResults: sim.yearlyResults.map((yr, i) => 
            // Only include every other year to reduce size
            i % 2 === 0 ? {
              year: yr.year,
              totalAssets: yr.totalAssets,
              income: yr.income,
              inflationRate: yr.inflationRate || 0.02
            } : null
          ).filter(Boolean)
        }));
        await report.save();
        console.log(`Reduced report saved with ID: ${report._id}`);
      } else {
        throw saveError; // Re-throw if it's not a document size issue
      }
    }
    
    // Return the result to the client
    return res.json({
      success: true,
      status: 'simulation_completed',
      message: 'Simulation completed successfully',
      scenarioId: scenarioId,
      reportId: report._id,
      report: {
        _id: report._id,
        userId: scenario.userId,
        scenarioId: scenarioId,
        numSimulations: numSimulations,
        successRate: result.successRate,
        finalAssetStatistics: result.finalAssetStatistics,
        // Send a small subset of simulation results to the client for immediate visualization
        simulationResults: Array.isArray(result.simulationResults)
          ? result.simulationResults.slice(0, 10).map(sim => ({
              simulationId: sim.simulationId,
              success: sim.success,
              finalTotalAssets: sim.finalTotalAssets,
              finalState: sim.finalState,
              yearlyResults: sim.yearlyResults
            }))
          : [], // Default to empty array if undefined or not an array
        createdAt: report.createdAt
      },
      results: result.aggregatedResults
    });
  } catch (error) {
    console.error('Error running simulation:', error);
    return res.status(500).json({ error: 'An error occurred while running the simulation' });
  }
});

// Delete a report
router.delete('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    await Report.findByIdAndDelete(reportId);
    return (res.json({ success: true }));
  } catch (error) {
    console.error('Error deleting report:' , error);
    res.status(500).json({ error: 'Error deleting report' });
  }
});

// Delete a Scenario
router.delete('/scenario/:scenarioId', async (req, res) => {
  try {
    const { scenarioId } = req.params;
    await Scenario.findByIdAndDelete(scenarioId);
    return (res.json({ success: true }));
  } catch (error) {
    console.error('Error deleting scenario:' , error);
    res.status(500).json({ error: 'Error deleting scenario' });
  }
});

// Get all shared reports for a user
router.get('/sharedreports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await Report.find({ 'sharedUsers.userId' : userId}).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Error fetching reports' });
  }
});

// Get all scenarios shared with a given user
router.get('/sharedscenarios/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const scenarios = await Scenario.find({ 'sharedUsers.userId' : userId}).sort({ createdAt: -1 });
    res.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({ error: 'Error fetching scenarios' });
  }
});

// ==================== EXPLORE REPORT ROUTES ====================

// Save a 1D or 2D exploration report
router.post('/explore-report/save', async (req, res) => {
  try {
    const { 
      name, 
      type, 
      userId, 
      scenarioId, 
      scenarioName,
      parameterName, 
      parameterName2,
      eventName,
      eventName2,
      parameterValues, 
      parameterValues2,
      numSimulations,
      results 
    } = req.body;

    const exploreReport = new ExploreReport({
      name,
      type,
      userId,
      scenarioId,
      scenarioName,
      parameterName,
      parameterName2,
      eventName,
      eventName2,
      parameterValues,
      parameterValues2,
      numSimulations,
      results,
      createdAt: new Date()
    });

    await exploreReport.save();
    console.log(`Explore report saved with ID: ${exploreReport._id}`);

    res.json({
      success: true,
      reportId: exploreReport._id,
      message: 'Exploration report saved successfully'
    });
  } catch (error) {
    console.error('Error saving explore report:', error);
    res.status(500).json({ error: 'Failed to save exploration report' });
  }
});

// Get all 1D exploration reports for a user
router.get('/explore-reports/1d/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await ExploreReport.find({ userId, type: '1D' }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching 1D explore reports:', error);
    res.status(500).json({ error: 'Failed to fetch 1D exploration reports' });
  }
});

// Get all 2D exploration reports for a user
router.get('/explore-reports/2d/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await ExploreReport.find({ userId, type: '2D' }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching 2D explore reports:', error);
    res.status(500).json({ error: 'Failed to fetch 2D exploration reports' });
  }
});

// Get a single exploration report by ID
router.get('/explore-report/:id', async (req, res) => {
  try {
    const report = await ExploreReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Exploration report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching explore report:', error);
    res.status(500).json({ error: 'Failed to fetch exploration report' });
  }
});

// Delete an exploration report
router.delete('/explore-report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    await ExploreReport.findByIdAndDelete(reportId);
    res.json({ success: true, message: 'Exploration report deleted successfully' });
  } catch (error) {
    console.error('Error deleting explore report:', error);
    res.status(500).json({ error: 'Failed to delete exploration report' });
  }
});

// Cleanup temporary scenarios and reports after exploration
router.post('/explore-cleanup', async (req, res) => {
  try {
    const { tempScenarioIds, tempReportIds, tempEventIds, tempStartYearIds, tempDurationIds } = req.body;
    
    let deletedEvents = 0;
    let deletedStartYears = 0;
    let deletedDurations = 0;

    // Delete temporary StartYear documents
    if (tempStartYearIds && tempStartYearIds.length > 0) {
      await StartYear.deleteMany({ _id: { $in: tempStartYearIds } });
      deletedStartYears = tempStartYearIds.length;
      console.log(`Deleted ${deletedStartYears} temporary StartYear documents`);
    }

    // Delete temporary Duration documents
    if (tempDurationIds && tempDurationIds.length > 0) {
      await Duration.deleteMany({ _id: { $in: tempDurationIds } });
      deletedDurations = tempDurationIds.length;
      console.log(`Deleted ${deletedDurations} temporary Duration documents`);
    }

    // Delete temporary Event documents
    if (tempEventIds && tempEventIds.length > 0) {
      await Event.deleteMany({ _id: { $in: tempEventIds } });
      deletedEvents = tempEventIds.length;
      console.log(`Deleted ${deletedEvents} temporary Event documents`);
    }

    // Delete temporary scenarios
    if (tempScenarioIds && tempScenarioIds.length > 0) {
      await Scenario.deleteMany({ _id: { $in: tempScenarioIds } });
      console.log(`Deleted ${tempScenarioIds.length} temporary scenarios`);
    }

    // Delete temporary reports
    if (tempReportIds && tempReportIds.length > 0) {
      await Report.deleteMany({ _id: { $in: tempReportIds } });
      console.log(`Deleted ${tempReportIds.length} temporary reports`);
    }

    console.log(`Cleanup complete: ${deletedEvents} events, ${deletedStartYears} startYears, ${deletedDurations} durations`);

    res.json({ 
      success: true, 
      message: 'Cleanup completed successfully',
      deletedReports: tempReportIds?.length || 0,
      deletedScenarios: tempScenarioIds?.length || 0,
      deletedEvents,
      deletedStartYears,
      deletedDurations
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup temporary data' });
  }
});

module.exports = router;