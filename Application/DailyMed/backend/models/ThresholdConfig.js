const mongoose = require('mongoose');

const thresholdConfigSchema = new mongoose.Schema({
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
  metric: {
    type: String,
    enum: ['blood_sugar_fasting', 'blood_sugar_random', 'blood_sugar_postmeal', 'systolic_bp', 'diastolic_bp', 'heart_rate', 'weight'],
    required: true
  },
  minThreshold: {
    type: Number
  },
  maxThreshold: {
    type: Number
  },
  unit: {
    type: String,
    required: true
  },
  alertEnabled: {
    type: Boolean,
    default: true
  },
  alertSeverity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  notifyDoctor: {
    type: Boolean,
    default: false
  },
  cooldownMinutes: {
    type: Number, // Minutes before next alert for same metric
    default: 120
  },
  lastAlertAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index
thresholdConfigSchema.index({ userId: 1, metric: 1 }, { unique: true });

module.exports = mongoose.model('ThresholdConfig', thresholdConfigSchema);
