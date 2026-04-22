const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
    trim: true,
  },
  dosage: {
    value: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      enum: ['mg', 'tspn'],
      required: true,
    },
  },
  frequency: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
  },
  reminderTimings: [{
    time: {
      type: String,
      required: true,
    },
    period: {
      type: String,
      enum: ['AM', 'PM'],
      required: true,
    },
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Index for faster queries
medicationSchema.index({ userId: 1, status: 1 });
medicationSchema.index({ userEmail: 1 });

module.exports = mongoose.model('Medication', medicationSchema);
