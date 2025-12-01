const fs = require('fs');
const yaml = require('js-yaml');
const LifeExpectancy = require('../Schemas/LifeExpectancy');
const Scenario = require('../Schemas/Scenario');
const mapToScenarioModel = require('./mapToScenarioModel');
const convertLE = require('./convertYamlToLifeExpectancyDocs');
const mapToSimulationSettingsModel = require('./mapToSimulationSettingsModel');
const handleInvestments = require('./handleInvestments'); 
const handleEvents = require('./handleEvents');

exports.importScenario = async (req, res) => {
  try {
    console.log("Received request:", req.file?.originalname);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.body.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'Missing user ID' });
    }

    // Step 1: Parse YAML
    const yamlText = fs.readFileSync(req.file.path, 'utf8');
    const parsedData = yaml.load(yamlText);

    // Step 2: Convert and save life expectancy
    let leDoc, sleDoc;

    if (parsedData.maritalStatus === 'couple') {
      if (!Array.isArray(parsedData.lifeExpectancy) || parsedData.lifeExpectancy.length !== 2) {
        throw new Error('Expected two life expectancy entries for couple.');
      }

      const [userLE, spouseLE] = parsedData.lifeExpectancy;
      leDoc = await new LifeExpectancy(convertLE([userLE])[0]).save();
      sleDoc = await new LifeExpectancy(convertLE([spouseLE])[0]).save();
    } else {
      if (!Array.isArray(parsedData.lifeExpectancy) || parsedData.lifeExpectancy.length !== 1) {
        throw new Error('Expected one life expectancy entry for individual.');
      }

      leDoc = await new LifeExpectancy(convertLE([parsedData.lifeExpectancy[0]])[0]).save();
    }

    // Step 3: Map to scenario
    const simulationSettingsDoc = await mapToSimulationSettingsModel(parsedData);

    const scenarioData = mapToScenarioModel(parsedData, userId, {
      user: leDoc?._id,
      spouse: sleDoc?._id
    });    
    scenarioData.simulationSettings = simulationSettingsDoc._id;

    // Step 4: Handle investments
    const { investmentIds, initialCash, investmentMap } = await handleInvestments(parsedData, userId);
    scenarioData.investments = investmentIds;
    scenarioData.initialCash = initialCash;

    // Step 5: Handle events
    const eventIds = await handleEvents(parsedData, investmentMap);
    scenarioData.events = eventIds;       

    // Step 5: Save scenario
    const newScenario = new Scenario(scenarioData);
    await newScenario.save();
    console.log("Scenario saved!");

    return res.status(200).json({ message: 'Scenario imported successfully', scenario: newScenario });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: 'Failed to import scenario' });
  }
};
