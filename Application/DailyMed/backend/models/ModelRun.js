const mongoose = require('mongoose');

const modelRunSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  modelName: {
    type: String,
    enum: ['hypertension_svm', 'glucose_lstm', 'dosage_adjustment'],
    required: true,
    index: true
  },
  modelVersion: {
    type: String,
    required: true
  },
  inputSummary: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  featuresHash: {
    type: String
  },
  output: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued',
    index: true
  },
  error: {
    type: String
  },
  latencyMs: {
    type: Number
  },
  runAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes
modelRunSchema.index({ userId: 1, modelName: 1, runAt: -1 });
modelRunSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('ModelRun', modelRunSchema);
