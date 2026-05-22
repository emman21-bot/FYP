const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateToken } = require('../utils/jwtUtils');
const { generateOTP } = require('../utils/otpUtils');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/emailService');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Create user (password will be hashed automatically by pre-save middleware)
    const user = await User.create({
      username,
      email,
      password,
      role: role.toLowerCase(),
      fullName: username // Initialize fullName with username
    });
    console.log('[Register] User created:', user.email, 'id:', user._id);

    // Generate OTP
    const otp = generateOTP();
    console.log('[Register] Generated OTP for:', email);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Save OTP to database
    const otpRecord = await OTP.create({
      email,
      otp
    });
    console.log('[Register] OTP record saved:', otpRecord._id, 'for', email);

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, username);
      console.log('[Register] Verification email sent to:', email);
    } catch (emailError) {
      console.error('[Register] OTP email send failed for:', email, emailError);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully, but verification email failed to send. Please request a new OTP.',
        data: {
          userId: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          isVerified: user.isVerified
        },
        emailSent: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification OTP.',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        isVerified: user.isVerified
      },
      emailSent: true
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP using constant-time comparison to prevent timing attacks
    const isOtpValid = crypto.timingSafeEqual(
      Buffer.from(otpRecord.otp),
      Buffer.from(otp)
    );

    if (!isOtpValid) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`
      });
    }

    // OTP is valid - update user verification status
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      // Delete OTP record
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'Account already verified. Please login.'
      });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete OTP record
    await OTP.deleteOne({ email });

    // Send welcome email
    try {
      await sendWelcomeEmail(email, user.username, user.role);
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified
        }
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Account already verified. Please login.'
      });
    }

    // Generate new OTP
    const otp = generateOTP();

    // Delete existing OTP
    await OTP.deleteMany({ email });

    // Create new OTP record
    await OTP.create({
      email,
      otp
    });

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, user.username);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please check your email.'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (include password field for comparison)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Check if account is verified
    if (!user.isVerified) {
      // Generate and send new OTP
      const otp = generateOTP();
      await OTP.deleteMany({ email });
      await OTP.create({ email, otp });
      
      try {
        await sendOTPEmail(email, otp, user.username);
        return res.status(403).json({
          success: false,
          message: 'Account not verified. A new verification OTP has been sent to your email.',
          isVerified: false,
          email: email
        });
      } catch (emailError) {
        return res.status(403).json({
          success: false,
          message: 'Account not verified. Please request OTP verification.',
          isVerified: false,
          email: email
        });
      }
    }

    // Check account status
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact customer support for assistance.',
        accountStatus: 'suspended'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    // Check for warning status (allow login but notify)
    const accountWarning = user.accountStatus === 'warning' ? {
      hasWarning: true,
      message: 'Your account is at risk. Please be careful or it may be blocked. Contact customer support for assistance.'
    } : { hasWarning: false };

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accountWarning: accountWarning,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          accountStatus: user.accountStatus,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  try {
    // In JWT-based auth, logout is handled client-side by removing the token
    // But we can perform any server-side cleanup here if needed
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * @desc    Request password reset (forgot password)
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Delete existing OTPs
    await OTP.deleteMany({ email });

    // Create new OTP record
    await OTP.create({
      email,
      otp
    });

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, user.username);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email',
      email: email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request. Please try again.'
    });
  }
};

/**
 * @desc    Verify OTP for password reset
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new one.'
      });
    }

    // Check max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP using constant-time comparison to prevent timing attacks
    const isOtpValid = crypto.timingSafeEqual(
      Buffer.from(otpRecord.otp),
      Buffer.from(otp)
    );

    if (!isOtpValid) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${otpRecord.maxAttempts - otpRecord.attempts} attempts remaining.`
      });
    }

    // OTP is valid - mark it as verified (add timestamp)
    otpRecord.verified = true;
    otpRecord.verifiedAt = new Date();
    await otpRecord.save();

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      email: email
    });

  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed. Please try again.'
    });
  }
};

/**
 * @desc    Reset password after OTP verification
 * @route   POST /api/auth/reset-password
 * @access  Public (requires OTP verification first)
 */
const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify OTP still exists and was verified in previous step
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Session expired. Please verify OTP again.'
      });
    }

    // Check if OTP was verified (security check)
    if (!otpRecord.verified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify OTP before resetting password.'
      });
    }

    // Check if verification happened recently (within 5 minutes)
    const verificationAge = Date.now() - new Date(otpRecord.verifiedAt).getTime();
    if (verificationAge > 5 * 60 * 1000) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: 'Verification session expired. Please verify OTP again.'
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = password;
    await user.save();

    // Delete OTP record
    await OTP.deleteOne({ email });

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
};

module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  getMe,
  logout,
  forgotPassword,
  verifyResetOTP,
  resetPassword
};
