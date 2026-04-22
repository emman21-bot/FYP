const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  predictHypertension,
  forecastGlucose,
  getPredictionHistory,
  getPredictionById,
  submitFeedback,
  getFeedbackStats
} = require('../controllers/predictionController');

// Trigger hypertension prediction
router.post('/hypertension', protect, predictHypertension);

// Trigger glucose forecast
router.post('/glucose', protect, forecastGlucose);

// Get prediction history
router.get('/history', protect, getPredictionHistory);

// Get single prediction
router.get('/:id', protect, getPredictionById);

// Submit feedback on prediction
router.post('/:modelRunId/feedback', protect, submitFeedback);

// Get feedback statistics (for monitoring)
router.get('/feedback/stats', protect, getFeedbackStats);

module.exports = router;
