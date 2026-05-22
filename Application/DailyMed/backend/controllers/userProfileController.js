const User = require('../models/User');

// Get user profile/settings
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        profile: {
          username: user.username || '',
          fullName: user.fullName || user.username || '',
          phone: user.phone || '',
          dateOfBirth: user.dateOfBirth || null,
          gender: user.gender || ''
        },
        medical: {
          height: user.height || '',
          weight: user.weight || '',
          bloodType: user.bloodType || '',
          emergencyContact: {
            name: user.emergencyContact?.name || '',
            phone: user.emergencyContact?.phone || ''
          },
          medicalConditions: {
            diabetes: user.medicalConditions?.diabetes || false,
            hypertension: user.medicalConditions?.hypertension || false
          },
          medicalHistory: user.medicalHistory || '',
          currentMedications: user.currentMedications || '',
          allergies: user.allergies || ''
        },
        notifications: {
          healthAlerts: user.notificationPreferences?.healthAlerts ?? true,
          medReminders: user.notificationPreferences?.medReminders ?? true,
          apptReminders: user.notificationPreferences?.apptReminders ?? true,
          weeklyReports: user.notificationPreferences?.weeklyReports ?? true,
          securityAlerts: user.notificationPreferences?.securityAlerts ?? true
        },
        pushTokens: user.pushTokens || []
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
      error: error.message
    });
  }
};

// Update profile information
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, phone, dateOfBirth, gender } = req.body;

    const updateData = {};
    if (fullName !== undefined) {
      updateData.fullName = fullName;
      
      // For patients, sync username with fullName
      if (req.user.role === 'patient') {
        // Check if new username is already taken by another user
        const existingUser = await User.findOne({ 
          username: fullName,
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'This name is already taken by another user. Please choose a different name.'
          });
        }
        
        updateData.username = fullName;
      }
    }
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Update medical information
exports.updateMedicalInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      height,
      weight,
      bloodType,
      emergencyName,
      emergencyPhone,
      hasDiabetes,
      hasHypertension,
      medicalHistory,
      currentMedications,
      allergies
    } = req.body;

    const updateData = {};
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    
    if (emergencyName !== undefined || emergencyPhone !== undefined) {
      updateData.emergencyContact = {};
      if (emergencyName !== undefined) updateData.emergencyContact.name = emergencyName;
      if (emergencyPhone !== undefined) updateData.emergencyContact.phone = emergencyPhone;
    }
    
    if (hasDiabetes !== undefined || hasHypertension !== undefined) {
      updateData.medicalConditions = {};
      if (hasDiabetes !== undefined) updateData.medicalConditions.diabetes = hasDiabetes;
      if (hasHypertension !== undefined) updateData.medicalConditions.hypertension = hasHypertension;
    }
    
    if (medicalHistory !== undefined) updateData.medicalHistory = medicalHistory;
    if (currentMedications !== undefined) updateData.currentMedications = currentMedications;
    if (allergies !== undefined) updateData.allergies = allergies;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medical information updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update medical info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medical information',
      error: error.message
    });
  }
};

// Update notification preferences
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      healthAlerts,
      medReminders,
      apptReminders,
      weeklyReports,
      securityAlerts
    } = req.body;

    const updateData = { notificationPreferences: {} };
    
    if (healthAlerts !== undefined) updateData.notificationPreferences.healthAlerts = healthAlerts;
    if (medReminders !== undefined) updateData.notificationPreferences.medReminders = medReminders;
    if (apptReminders !== undefined) updateData.notificationPreferences.apptReminders = apptReminders;
    if (weeklyReports !== undefined) updateData.notificationPreferences.weeklyReports = weeklyReports;
    if (securityAlerts !== undefined) updateData.notificationPreferences.securityAlerts = securityAlerts;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user.notificationPreferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

// Register a device push token for the authenticated user
exports.registerPushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.pushTokens = Array.from(new Set([...(user.pushTokens || []), token]));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: { pushTokens: user.pushTokens }
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register push token',
      error: error.message
    });
  }
};

// Unregister a device push token for the authenticated user
exports.unregisterPushToken = async (req, res) => {
  try {
    const userId = req.user._id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.pushTokens = (user.pushTokens || []).filter((savedToken) => savedToken !== token);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token removed successfully',
      data: { pushTokens: user.pushTokens }
    });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister push token',
      error: error.message
    });
  }
};
