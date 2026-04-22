const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  upsertThreshold,
  getThresholds,
  getThresholdByMetric,
  deleteThreshold,
  toggleAlertStatus
} = require('../controllers/thresholdController');

// Create or update threshold
router.post('/', protect, upsertThreshold);

// Get all thresholds for user
router.get('/', protect, getThresholds);

// Get threshold by metric type
router.get('/:metricType', protect, getThresholdByMetric);

// Delete threshold
router.delete('/:metricType', protect, deleteThreshold);

// Toggle alert status
router.patch('/:metricType/toggle', protect, toggleAlertStatus);

module.exports = router;
