const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const careController = require('../controllers/careRelationshipController');

const {
  requestCareRelationship,
  approveCareRelationship,
  rejectCareRelationship,
  getCareRelationships,
  terminateCareRelationship
} = careController;

// Patient requests care from doctor
router.post('/request', protect, requestCareRelationship);

// Doctor approves care request
router.patch('/:id/approve', protect, approveCareRelationship);

// Doctor rejects care request
router.patch('/:id/reject', protect, rejectCareRelationship);

// Get all care relationships (filtered by role)
router.get('/', protect, getCareRelationships);

// End care relationship
router.patch('/:id/end', protect, terminateCareRelationship);

module.exports = router;
