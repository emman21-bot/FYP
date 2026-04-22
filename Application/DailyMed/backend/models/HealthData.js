const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  readingDate: {
    type: Date,
    required: [true, 'Reading date is required'],
    default: Date.now,
    index: true
  },
  bloodSugar: {
    fasting: {
      type: Number,
      min: 0,
      max: 600
    },
    random: {
      type: Number,
      min: 0,
      max: 600
    },
    postMeal: {
      type: Number,
      min: 0,
      max: 600
    }
  },
  mealContext: {
    type: String,
    enum: ['fasting', 'before_meal', 'after_meal', 'bedtime', 'random'],
    default: 'random'
  },
  bloodPressure: {
    systolic: {
      type: Number,
      min: 0,
      max: 300
    },
    diastolic: {
      type: Number,
      min: 0,
      max: 200
    }
  },
  bpContext: {
    type: String,
    enum: ['resting', 'after_activity', 'stressed', 'morning', 'evening'],
    default: 'resting'
  },
  heartRate: {
    type: Number,
    min: 0,
    max: 300
  },
  weight: {
    type: Number,
    min: 0,
    max: 500
  },
  // Additional context fields for ML
  insulinTaken: {
    type: Number,
    default: 0
  },
  insulinType: {
    type: String
  },
  carbsIntake: {
    type: Number,
    default: 0
  },
  medicationsTaken: [{
    type: String
  }],
  activityLevel: {
    type: String,
    enum: ['sedentary', 'light', 'moderate', 'vigorous'],
    default: 'sedentary'
  },
  stressLevel: {
    type: Number, // 1-10 scale
    min: 1,
    max: 10
  },
  sleepHours: {
    type: Number,
    min: 0,
    max: 24
  },
  deviceSource: {
    type: String,
    enum: ['manual', 'glucometer', 'cgm', 'bp_monitor', 'smart_watch', 'scale']
  },
  deviceId: {
    type: String
  },
  unit: {
    bloodSugar: { type: String, default: 'mg/dL' },
    bloodPressure: { type: String, default: 'mmHg' },
    weight: { type: String, default: 'lbs' }
  },
  tags: [{
    type: String
  }],
  notes: {
    type: String,
    maxlength: 500,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // Auto-delete after 30 days (in seconds)
  }
}, {
  timestamps: true
});

// Compound index for efficient querying by user and date
healthDataSchema.index({ userId: 1, readingDate: -1 });

// TTL index to automatically delete records older than 30 days
healthDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('HealthData', healthDataSchema);
