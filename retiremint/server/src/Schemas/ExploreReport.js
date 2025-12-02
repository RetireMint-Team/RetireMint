const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for individual simulation result at a parameter value
const ExploreResultSchema = new Schema({
  parameterValue: Number,
  parameterValue2: Number, // For 2D exploration
  resultForGraph: {
    type: Object,
    default: {}
  }
}, { _id: false });

// Main ExploreReport schema for 1D and 2D scenario exploration
const ExploreReportSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['1D', '2D'], required: true },
  createdAt: { type: Date, default: Date.now },
  userId: { type: String, required: true },
  scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: true },
  scenarioName: { type: String, required: true },
  
  // Parameter information
  parameterName: { type: String, required: true },
  parameterName2: { type: String }, // For 2D exploration
  eventName: { type: String }, // Event name if parameter is event-related
  eventName2: { type: String }, // Event name for second parameter if event-related (2D)
  parameterValues: [Number],
  parameterValues2: [Number], // For 2D exploration
  
  // Simulation settings used
  numSimulations: { type: Number, required: true },
  
  // Results array
  results: [ExploreResultSchema]
});

module.exports = mongoose.model('ExploreReport', ExploreReportSchema);

