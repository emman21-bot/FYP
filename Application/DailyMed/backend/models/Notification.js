const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
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
    enum: [
      'appointment_request',
      'appointment_approved',
      'appointment_declined',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_completed',
      'appointment_started',
      'profile_update',
      'availability_update',
      'general',
      // Care Relationship notifications
      'care_request_received',
      'care_request_approved',
      'care_request_rejected',
      'care_relationship_ended',
      // Health & ML notifications
      'health_alert',
      'reminder_due',
      // Dosage & Treatment notifications
      'dosage_review_requested',
      'dosage_suggestion_generated',
      'dosage_suggestion_approved',
      'dosage_suggestion_rejected',
      'dosage_suggestion_applied',
      'treatment_plan_created',
      'treatment_plan_updated',
      'treatment_plan_deactivated'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }); // For auto-deletion

// Auto-delete read notifications after 7 days
notificationSchema.index({ readAt: 1 }, { 
  expireAfterSeconds: 7 * 24 * 60 * 60,
  partialFilterExpression: { readAt: { $exists: true } }
});

module.exports = mongoose.model('Notification', notificationSchema);
