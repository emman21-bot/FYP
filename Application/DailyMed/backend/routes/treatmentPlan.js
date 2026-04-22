const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  createTreatmentPlan,
  updateTreatmentPlan,
  getActiveTreatmentPlan,
  getTreatmentPlanHistory,
  deactivateTreatmentPlan
} = require('../controllers/treatmentPlanController');

// Doctor creates treatment plan
router.post('/', protect, createTreatmentPlan);

// Doctor updates treatment plan (creates new version)
router.put('/:id', protect, updateTreatmentPlan);

// Get active treatment plan
router.get('/active', protect, getActiveTreatmentPlan);

// Get treatment plan history
router.get('/history', protect, getTreatmentPlanHistory);

// Deactivate treatment plan
router.patch('/:id/deactivate', protect, deactivateTreatmentPlan);

module.exports = router;
