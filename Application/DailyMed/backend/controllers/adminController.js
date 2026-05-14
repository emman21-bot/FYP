const User = require('../models/User');
const bcrypt = require('bcryptjs');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const HealthData = require('../models/HealthData');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const ModelRun = require('../models/ModelRun');

// Helper function to create audit log
const createAuditLog = async (req, action, resourceType, resourceId, targetUserId, before, after, severity = 'medium') => {
  try {
    await AuditLog.create({
      actorId: req.user._id === 'admin' ? null : req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action,
      resourceType,
      resourceId,
      targetUserId,
      targetUserEmail: after?.email || before?.email,
      before,
      after,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      severity,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
};

// Helper function to send notification to user
const sendUserNotification = async (userId, userEmail, type, title, message, data = {}) => {
  try {
    await Notification.create({
      userId,
      userEmail,
      type,
      title,
      message,
      data
    });
  } catch (error) {
    console.error('Notification creation failed:', error);
  }
};
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      accountStatus, 
      search, 
      isVerified,
      startDate,
      endDate,
      hasDiabetes,
      hasHypertension,
      lastLoginDays
    } = req.query;
    
    console.log('getAllUsers called with query params:', req.query);
    
    // Build filter query
    const filter = {};
    if (role) filter.role = role;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Date range filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Medical conditions filtering
    if (hasDiabetes === 'true') {
      filter['medicalConditions.diabetes'] = true;
    }
    if (hasHypertension === 'true') {
      filter['medicalConditions.hypertension'] = true;
    }
    
    // Last login filtering
    if (lastLoginDays) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(lastLoginDays));
      filter.lastLogin = { $gte: daysAgo };
    }

    console.log('Filter applied:', JSON.stringify(filter, null, 2));

    const skip = (page - 1) * limit;
    const totalUsers = await User.countDocuments(filter);
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        usersPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// @desc    Create new user with audit logging
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role, fullName, phone, isVerified } = req.body;

    // Validate required fields
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, password, and role'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Create user (password will be hashed by pre-save middleware)
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: password, // Let pre-save middleware hash it
      role: role.toLowerCase(),
      fullName: fullName || username,
      phone,
      isVerified: isVerified !== undefined ? isVerified : true, // Default to true if not provided
      accountStatus: 'active'
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    // Create audit log
    await createAuditLog(
      req,
      'USER_CREATED',
      'User',
      user._id,
      user._id,
      null,
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      'medium'
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// @desc    Update user account status with audit logging and notification
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { accountStatus, isVerified } = req.body;

    // Prepare update object
    const updateData = {};

    // Validate and add accountStatus if provided
    if (accountStatus !== undefined) {
      if (!['active', 'warning', 'suspended'].includes(accountStatus.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account status. Must be active, warning, or suspended'
        });
      }
      updateData.accountStatus = accountStatus.toLowerCase();
    }

    // Add isVerified if provided
    if (isVerified !== undefined) {
      updateData.isVerified = Boolean(isVerified);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Get current user data for audit log
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const beforeData = {
      accountStatus: currentUser.accountStatus,
      isVerified: currentUser.isVerified
    };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    const afterData = {
      accountStatus: user.accountStatus,
      isVerified: user.isVerified
    };

    // Create audit log
    await createAuditLog(
      req,
      'USER_STATUS_UPDATED',
      'User',
      user._id,
      user._id,
      beforeData,
      afterData,
      accountStatus === 'suspended' ? 'high' : 'medium'
    );

    // Send notification to user if status changed
    if (accountStatus) {
      let notificationTitle, notificationMessage;
      
      if (accountStatus === 'suspended') {
        notificationTitle = '⚠️ Account Suspended';
        notificationMessage = 'Your account has been suspended by the administrator. Please contact support for assistance.';
      } else if (accountStatus === 'warning') {
        notificationTitle = '⚡ Account Warning';
        notificationMessage = 'Your account has received a warning from the administrator. Please review our terms of service.';
      } else if (accountStatus === 'active') {
        notificationTitle = '✅ Account Activated';
        notificationMessage = 'Your account has been activated by the administrator. You can now use all features.';
      }

      await sendUserNotification(
        user._id,
        user.email,
        'general',
        notificationTitle,
        notificationMessage,
        { action: 'admin_status_change', newStatus: accountStatus }
      );
    }

    // Send notification if verification status changed
    if (isVerified !== undefined) {
      await sendUserNotification(
        user._id,
        user.email,
        'general',
        isVerified ? '✅ Account Verified' : '❌ Account Unverified',
        isVerified 
          ? 'Your account has been verified by the administrator. Thank you!'
          : 'Your account verification has been revoked. Please contact support.',
        { action: 'admin_verification_change', newVerificationStatus: isVerified }
      );
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// @desc    Delete user with audit logging
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store user info for audit log before deletion
    const userData = {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    await User.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(
      req,
      'USER_DELETED',
      'User',
      user._id,
      user._id,
      userData,
      null,
      'high'
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const patientCount = await User.countDocuments({ role: 'patient' });
    const doctorCount = await User.countDocuments({ role: 'doctor' });
    const caregiverCount = await User.countDocuments({ role: 'caregiver' });
    
    const activeUsers = await User.countDocuments({ accountStatus: 'active' });
    const warningUsers = await User.countDocuments({ accountStatus: 'warning' });
    const suspendedUsers = await User.countDocuments({ accountStatus: 'suspended' });
    
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        byRole: {
          patients: patientCount,
          doctors: doctorCount,
          caregivers: caregiverCount
        },
        byStatus: {
          active: activeUsers,
          warning: warningUsers,
          suspended: suspendedUsers
        },
        byVerification: {
          verified: verifiedUsers,
          unverified: unverifiedUsers
        }
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// ===== ADVANCED USER DATA VIEWING =====

// @desc    Get user's health data
// @route   GET /api/admin/users/:id/health-data
// @access  Private/Admin
exports.getUserHealthData = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const healthData = await HealthData.find({ userId: req.params.id })
      .sort({ readingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalRecords = await HealthData.countDocuments({ userId: req.params.id });

    res.status(200).json({
      success: true,
      data: healthData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user health data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health data',
      error: error.message
    });
  }
};

// @desc    Get user's appointments
// @route   GET /api/admin/users/:id/appointments
// @access  Private/Admin
exports.getUserAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const appointments = await Appointment.find({
      $or: [{ patientId: req.params.id }, { doctorId: req.params.id }]
    })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('patientId', 'username email')
      .populate('doctorId', 'username email')
      .lean();

    const totalRecords = await Appointment.countDocuments({
      $or: [{ patientId: req.params.id }, { doctorId: req.params.id }]
    });

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
};

// @desc    Get user's medications
// @route   GET /api/admin/users/:id/medications
// @access  Private/Admin
exports.getUserMedications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const medications = await Medication.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalRecords = await Medication.countDocuments({ userId: req.params.id });

    res.status(200).json({
      success: true,
      data: medications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user medications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications',
      error: error.message
    });
  }
};

// @desc    Get user's prediction history
// @route   GET /api/admin/users/:id/predictions
// @access  Private/Admin
exports.getUserPredictions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const predictions = await ModelRun.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalRecords = await ModelRun.countDocuments({ userId: req.params.id });

    res.status(200).json({
      success: true,
      data: predictions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions',
      error: error.message
    });
  }
};

// ===== BULK OPERATIONS =====

// @desc    Bulk update user statuses
// @route   PUT /api/admin/users/bulk-status
// @access  Private/Admin
exports.bulkUpdateUserStatus = async (req, res) => {
  try {
    const { userIds, accountStatus, isVerified } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs'
      });
    }

    if (accountStatus === undefined && isVerified === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide accountStatus or isVerified to update'
      });
    }

    const updateData = {};
    if (accountStatus) updateData.accountStatus = accountStatus.toLowerCase();
    if (isVerified !== undefined) updateData.isVerified = Boolean(isVerified);

    const users = await User.find({ _id: { $in: userIds } });
    
    await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );

    // Create audit logs for each user
    for (const user of users) {
      await createAuditLog(
        req,
        'BULK_STATUS_UPDATE',
        'User',
        user._id,
        user._id,
        { previousStatus: user.accountStatus, previousVerification: user.isVerified },
        { newStatus: accountStatus || user.accountStatus, newVerification: isVerified !== undefined ? isVerified : user.isVerified },
        'high'
      );

      // Send notification
      if (accountStatus) {
        await sendUserNotification(
          user._id,
          user.email,
          'general',
          'Account Status Updated',
          `Your account status has been updated to ${accountStatus} by the administrator.`,
          { action: 'bulk_status_change', newStatus: accountStatus }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${users.length} users`,
      updatedCount: users.length
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update users',
      error: error.message
    });
  }
};

// @desc    Bulk delete users
// @route   DELETE /api/admin/users/bulk-delete
// @access  Private/Admin
exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs'
      });
    }

    const users = await User.find({ _id: { $in: userIds } });

    // Create audit logs before deletion
    for (const user of users) {
      await createAuditLog(
        req,
        'BULK_DELETE',
        'User',
        user._id,
        user._id,
        { userId: user._id, username: user.username, email: user.email, role: user.role },
        null,
        'critical'
      );
    }

    await User.deleteMany({ _id: { $in: userIds } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${users.length} users`,
      deletedCount: users.length
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete users',
      error: error.message
    });
  }
};

// ===== SYSTEM-WIDE ADMIN FEATURES =====

// @desc    Get system-wide statistics
// @route   GET /api/admin/system-stats
// @access  Private/Admin
exports.getSystemStats = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const patientCount = await User.countDocuments({ role: 'patient' });
    const doctorCount = await User.countDocuments({ role: 'doctor' });
    const caregiverCount = await User.countDocuments({ role: 'caregiver' });
    
    // Health data statistics
    const totalHealthRecords = await HealthData.countDocuments();
    const recentHealthRecords = await HealthData.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Appointment statistics
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });

    // Medication statistics
    const totalMedications = await Medication.countDocuments();
    const activeMedications = await Medication.countDocuments({ isActive: true });

    // Prediction statistics
    const totalPredictions = await ModelRun.countDocuments();
    const recentPredictions = await ModelRun.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Database size estimate
    const dbStats = await HealthData.db.db.stats();
    const databaseSizeMB = (dbStats.dataSize / (1024 * 1024)).toFixed(2);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: {
            patients: patientCount,
            doctors: doctorCount,
            caregivers: caregiverCount
          }
        },
        healthData: {
          total: totalHealthRecords,
          last24Hours: recentHealthRecords
        },
        appointments: {
          total: totalAppointments,
          pending: pendingAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        medications: {
          total: totalMedications,
          active: activeMedications
        },
        predictions: {
          total: totalPredictions,
          last24Hours: recentPredictions
        },
        database: {
          sizeMB: databaseSizeMB
        }
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics',
      error: error.message
    });
  }
};

// @desc    Get audit logs with filtering
// @route   GET /api/admin/audit-logs
// @access  Private/Admin
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, severity, actorEmail, targetUserEmail } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (action) filter.action = action;
    if (severity) filter.severity = severity;
    if (actorEmail) filter.actorEmail = { $regex: actorEmail, $options: 'i' };
    if (targetUserEmail) filter.targetUserEmail = { $regex: targetUserEmail, $options: 'i' };

    const auditLogs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalRecords = await AuditLog.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: auditLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
};

// @desc    Send broadcast notification to all users or specific role
// @route   POST /api/admin/broadcast-notification
// @access  Private/Admin
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, role, type = 'general' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and message'
      });
    }

    // Build filter for target users
    const userFilter = {};
    if (role) {
      if (!['patient', 'doctor', 'caregiver'].includes(role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be patient, doctor, or caregiver'
        });
      }
      userFilter.role = role.toLowerCase();
    }

    const users = await User.find(userFilter).select('_id email');

    // Create notifications for all target users
    const notifications = users.map(user => ({
      userId: user._id,
      userEmail: user.email,
      type,
      title,
      message,
      data: { broadcast: true, sentBy: req.user.email }
    }));

    await Notification.insertMany(notifications);

    // Create audit log
    await createAuditLog(
      req,
      'BROADCAST_NOTIFICATION',
      'Notification',
      null,
      null,
      null,
      { title, message, targetRole: role || 'all', recipientCount: users.length },
      'medium'
    );

    res.status(200).json({
      success: true,
      message: `Broadcast notification sent to ${users.length} users`,
      recipientCount: users.length
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification',
      error: error.message
    });
  }
};
