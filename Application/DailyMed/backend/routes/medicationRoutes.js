const express = require('express');
const router = express.Router();
const {
  addMedication,
  getMedications,
  updateMedication,
  updateMedicationStatus,
  deleteMedication,
} = require('../controllers/medicationController');
const { protect } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// @route   POST /api/medications
// @desc    Add new medication
// @access  Private
router.post('/', addMedication);

// @route   GET /api/medications
// @desc    Get all medications for logged-in user
// @access  Private
router.get('/', getMedications);

// @route   PUT /api/medications/:id
// @desc    Update medication
// @access  Private
router.put('/:id', updateMedication);

// @route   PATCH /api/medications/:id/status
// @desc    Update medication status (active/inactive)
// @access  Private
router.patch('/:id/status', updateMedicationStatus);

// @route   DELETE /api/medications/:id
// @desc    Delete medication
// @access  Private
router.delete('/:id', deleteMedication);

module.exports = router;
