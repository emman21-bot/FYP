const mongoose = require('mongoose');

const careRelationshipSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  patientName: {
    type: String,
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  doctorEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  doctorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['requested', 'active', 'suspended', 'terminated'],
    default: 'requested',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  terminatedAt: {
    type: Date
  },
  consentScopes: {
    viewHealthData: { type: Boolean, default: true },
    viewPredictions: { type: Boolean, default: true },
    manageDosage: { type: Boolean, default: true },
    viewAttachments: { type: Boolean, default: true }
  },
  notes: {
    type: String,
    maxlength: 500
  },
  terminationReason: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Compound indexes
careRelationshipSchema.index({ patientId: 1, status: 1 });
careRelationshipSchema.index({ doctorId: 1, status: 1 });
careRelationshipSchema.index({ patientEmail: 1, doctorEmail: 1 });

module.exports = mongoose.model('CareRelationship', careRelationshipSchema);
