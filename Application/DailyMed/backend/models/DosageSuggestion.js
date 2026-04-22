const mongoose = require('mongoose');

const dosageSuggestionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  doctorEmail: {
    type: String,
    lowercase: true
  },
  suggestion: {
    insulinType: {
      type: String,
      required: true
    },
    dosageAmount: {
      type: Number,
      required: true
    },
    dosageUnit: {
      type: String,
      default: 'units'
    },
    timing: {
      type: String,
      enum: ['before_breakfast', 'before_lunch', 'before_dinner', 'bedtime', 'as_needed'],
      required: true
    },
    action: {
      type: String,
      enum: ['increase', 'decrease', 'maintain', 'new'],
      required: true
    },
    changeAmount: {
      type: Number
    }
  },
  context: {
    avgGlucose7d: Number,
    avgGlucose24h: Number,
    recentLow: Number,
    recentHigh: Number,
    trendDirection: String,
    mealContext: String,
    features: mongoose.Schema.Types.Mixed
  },
  modelVersion: {
    type: String,
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  explanation: {
    type: String,
    required: true,
    maxlength: 1000
  },
  warnings: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'applied', 'expired'],
    default: 'pending',
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    maxlength: 1000
  },
  appliedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes
dosageSuggestionSchema.index({ patientId: 1, status: 1, createdAt: -1 });
dosageSuggestionSchema.index({ doctorId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('DosageSuggestion', dosageSuggestionSchema);
