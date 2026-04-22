const mongoose = require('mongoose');

const predictionFeedbackSchema = new mongoose.Schema({
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
  modelRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModelRun',
    required: true,
    index: true
  },
  modelName: {
    type: String,
    required: true
  },
  feedbackType: {
    type: String,
    enum: ['accuracy', 'usefulness', 'concern'],
    required: true
  },
  isAccurate: {
    type: Boolean
  },
  actualOutcome: {
    type: mongoose.Schema.Types.Mixed
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  comments: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound indexes
predictionFeedbackSchema.index({ userId: 1, createdAt: -1 });
predictionFeedbackSchema.index({ modelRunId: 1 });
predictionFeedbackSchema.index({ modelName: 1, createdAt: -1 });

module.exports = mongoose.model('PredictionFeedback', predictionFeedbackSchema);
