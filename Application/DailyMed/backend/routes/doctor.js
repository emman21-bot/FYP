const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getAllDoctors,
  getDoctorByEmail,
  getDoctorPatients,
  getPatientDetails
} = require('../controllers/doctorController');

// Get all available doctors
router.get('/', protect, getAllDoctors);

// Get doctor by email
router.get('/:email', protect, getDoctorByEmail);

// Get all patients for logged-in doctor
router.get('/my/patients', protect, getDoctorPatients);

// Get patient details by email (for doctor)
router.get('/patient/:patientEmail', protect, getPatientDetails);

module.exports = router;
