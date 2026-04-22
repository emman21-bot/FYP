const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  addHealthData,
  getHealthData,
  getHealthDataById,
  updateHealthData,
  deleteHealthData,
  getHealthDataStats,
  getPatientHealthData
} = require('../controllers/healthDataController');

// All routes require authentication
router.use(protect);

// Health data CRUD routes
router.post('/', addHealthData);
router.get('/', getHealthData);
router.get('/stats', getHealthDataStats);
router.get('/patient/:patientEmail', getPatientHealthData);
router.get('/:id', getHealthDataById);
router.put('/:id', updateHealthData);
router.delete('/:id', deleteHealthData);

module.exports = router;
