const mongoose = require('mongoose');

const treatmentPlanSchema = new mongoose.Schema({
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
    required: true
  },
  doctorEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  insulinRegimen: [{
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
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  targetGlucose: {
    fasting: {
      min: { type: Number, default: 70 },
      max: { type: Number, default: 130 }
    },
    postMeal: {
      min: { type: Number, default: 90 },
      max: { type: Number, default: 180 }
    },
    bedtime: {
      min: { type: Number, default: 90 },
      max: { type: Number, default: 150 }
    }
  },
  carbRatio: {
    type: Number, // grams of carbs per unit of insulin
    default: 15
  },
  correctionFactor: {
    type: Number, // mg/dL drop per unit of insulin
    default: 50
  },
  rules: {
    maxDailyDose: Number,
    minTimeBetweenDoses: Number, // minutes
    hypoglycemiaThreshold: { type: Number, default: 70 },
    hyperglycemiaThreshold: { type: Number, default: 250 }
  },
  notes: {
    type: String,
    maxlength: 2000
  },
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastReviewedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index
treatmentPlanSchema.index({ patientId: 1, isActive: 1 });

module.exports = mongoose.model('TreatmentPlan', treatmentPlanSchema);
