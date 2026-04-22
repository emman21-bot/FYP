const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['health_data_entry', 'medication', 'appointment', 'general'],
    required: true
  },
  metric: {
    type: String,
    enum: ['blood_sugar', 'blood_pressure', 'weight', 'heart_rate', 'all'],
    default: 'all'
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      required: true
    },
    time: {
      type: String, // HH:MM format
      required: true
    },
    daysOfWeek: [{
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6
    }],
    customInterval: {
      value: Number,
      unit: {
        type: String,
        enum: ['hours', 'days']
      }
    }
  },
  timezone: {
    type: String,
    default: 'Asia/Karachi'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    index: true
  },
  lastSentAt: {
    type: Date
  },
  nextDueAt: {
    type: Date,
    index: true
  },
  sentCount: {
    type: Number,
    default: 0
  },
  isRecurring: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound indexes
reminderSchema.index({ userId: 1, status: 1 });
reminderSchema.index({ nextDueAt: 1, status: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
