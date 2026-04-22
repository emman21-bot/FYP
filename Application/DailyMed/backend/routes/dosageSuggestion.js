const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  generateDosageSuggestion,
  approveDosageSuggestion,
  rejectDosageSuggestion,
  applyDosageSuggestion,
  getDosageSuggestions,
  getDosageSuggestionById
} = require('../controllers/dosageSuggestionController');

// Patient generates AI dosage suggestion
router.post('/generate', protect, generateDosageSuggestion);

// Doctor approves suggestion
router.patch('/:id/approve', protect, approveDosageSuggestion);

// Doctor rejects suggestion
router.patch('/:id/reject', protect, rejectDosageSuggestion);

// Patient applies approved suggestion
router.patch('/:id/apply', protect, applyDosageSuggestion);

// Get all dosage suggestions (filtered by role)
router.get('/', protect, getDosageSuggestions);

// Get single dosage suggestion
router.get('/:id', protect, getDosageSuggestionById);

module.exports = router;
