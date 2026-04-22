const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getDashboardAnalytics,
  getInsulinRecommendation,
  addGlucoseSeriesData,
  getGlucoseSeriesData,
  getGlucosePrediction,
  getHypertensionPrediction,
  getBPPrediction,
  getPatientAnalyticsForDoctor
} = require('../controllers/analyticsController');

// Get dashboard analytics
router.get('/dashboard', protect, getDashboardAnalytics);

// Get insulin recommendation
router.get('/insulin-recommendation', protect, getInsulinRecommendation);

// Get glucose forecast prediction
router.get('/glucose-prediction', protect, getGlucosePrediction);

// Get hypertension risk prediction
router.get('/hypertension-prediction', protect, getHypertensionPrediction);

// Get blood pressure forecast prediction
router.get('/bp-prediction', protect, getBPPrediction);

// Get patient analytics for doctor (including trends and predictions)
router.get('/patient/:patientEmail', protect, getPatientAnalyticsForDoctor);

// Add glucose time series data
router.post('/glucose-series', protect, addGlucoseSeriesData);

// Get glucose time series data
router.get('/glucose-series', protect, getGlucoseSeriesData);

module.exports = router;
