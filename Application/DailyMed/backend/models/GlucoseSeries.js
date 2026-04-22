const mongoose = require('mongoose');

const glucoseSeriesSchema = new mongoose.Schema({
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
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  // 5-minute interval data aligned to BrisT1D format
  bloodGlucose: {
    type: Number,
    required: true
  },
  insulin: {
    type: Number,
    default: 0
  },
  carbs: {
    type: Number,
    default: 0
  },
  heartRate: {
    type: Number
  },
  steps: {
    type: Number,
    default: 0
  },
  calories: {
    type: Number,
    default: 0
  },
  activityIntensity: {
    type: Number, // 0-10 scale
    default: 0
  },
  source: {
    type: String,
    enum: ['manual', 'device', 'cgm', 'computed'],
    default: 'manual'
  },
  deviceId: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Compound indexes for time series queries
glucoseSeriesSchema.index({ userId: 1, timestamp: -1 });
glucoseSeriesSchema.index({ userId: 1, timestamp: 1, source: 1 });

// TTL index - keep 90 days of raw data
glucoseSeriesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('GlucoseSeries', glucoseSeriesSchema);
