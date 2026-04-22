const mongoose = require('mongoose');

const healthDataAttachmentSchema = new mongoose.Schema({
  healthDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthData',
    required: true,
    index: true
  },
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
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['lab_report', 'prescription', 'scan', 'xray', 'other'],
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // bytes
    required: true,
    max: 10485760 // 10MB limit
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileKey: {
    type: String, // Storage key for deletion
    required: true
  },
  checksum: {
    type: String
  },
  description: {
    type: String,
    maxlength: 500
  },
  isScanned: {
    type: Boolean,
    default: false
  },
  scanResult: {
    type: String,
    enum: ['clean', 'infected', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Compound indexes
healthDataAttachmentSchema.index({ userId: 1, createdAt: -1 });
healthDataAttachmentSchema.index({ healthDataId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthDataAttachment', healthDataAttachmentSchema);
