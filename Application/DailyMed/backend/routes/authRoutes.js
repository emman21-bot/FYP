const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  resendOTP,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyResetOTP,
  resetPassword
} = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  validate
} = require('../middlewares/validator');
const { protect } = require('../middlewares/auth');
const {
  emailAuthLimiter,
  emailOtpLimiter,
  emailPasswordResetLimiter
} = require('../middlewares/emailRateLimiter');

// Public routes with email-based rate limiting
router.post('/register', emailAuthLimiter, registerValidation, validate, register);
router.post('/verify-otp', emailAuthLimiter, verifyOtpValidation, validate, verifyOTP);
router.post('/resend-otp', emailOtpLimiter, resendOtpValidation, validate, resendOTP);
router.post('/login', emailAuthLimiter, loginValidation, validate, login);

// Password reset routes with stricter email-based rate limiting
router.post('/forgot-password', emailPasswordResetLimiter, resendOtpValidation, validate, forgotPassword);
router.post('/verify-reset-otp', emailAuthLimiter, verifyOtpValidation, validate, verifyResetOTP);
router.post('/reset-password', emailAuthLimiter, loginValidation, validate, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
