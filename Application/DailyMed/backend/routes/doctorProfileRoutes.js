const express = require('express');
const {
  getDoctorProfile,
  createOrUpdateProfile,
  updateAvailability,
  getAllDoctors,
  getDoctorById,
  toggleActiveStatus
} = require('../controllers/doctorProfileController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/all', getAllDoctors); // Patients can view all active doctors
router.get('/:doctorId', getDoctorById); // Get specific doctor's profile

// Protected routes (Doctor only)
router.use(protect); // All routes below require authentication

router.get('/', authorize('doctor'), getDoctorProfile); // Get logged-in doctor's profile
router.post('/', authorize('doctor'), createOrUpdateProfile); // Create or update profile
router.put('/availability', authorize('doctor'), updateAvailability); // Update availability slots
router.patch('/toggle-status', authorize('doctor'), toggleActiveStatus); // Toggle active status

module.exports = router;
