const DoctorProfile = require('../models/DoctorProfile');
const User = require('../models/User');

// @desc    Get doctor profile
// @route   GET /api/doctor/profile
// @access  Private (Doctor only)
exports.getDoctorProfile = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

// @desc    Create or Update doctor profile
// @route   POST /api/doctor/profile
// @access  Private (Doctor only)
exports.createOrUpdateProfile = async (req, res) => {
  try {
    const {
      fullName,
      expertise,
      location,
      about,
      qualifications,
      experience,
      consultationFee,
      profilePicture
    } = req.body;

    // Validation
    if (!fullName || !expertise || !location?.city || !location?.country || !about) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, expertise, location, and about'
      });
    }

    // Check if profile exists
    let profile = await DoctorProfile.findOne({ userId: req.user._id });

    const profileData = {
      userId: req.user._id,
      userEmail: req.user.email,
      fullName,
      expertise,
      location,
      about,
      qualifications: qualifications || [],
      experience: experience || 0,
      consultationFee: consultationFee || 0,
      profilePicture: profilePicture || ''
    };

    if (profile) {
      // Update existing profile
      profile = await DoctorProfile.findOneAndUpdate(
        { userId: req.user._id },
        profileData,
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    } else {
      // Create new profile
      profile = await DoctorProfile.create(profileData);

      return res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: profile
      });
    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving profile',
      error: error.message
    });
  }
};

// @desc    Update doctor availability
// @route   PUT /api/doctor/profile/availability
// @access  Private (Doctor only)
exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;

    if (!availability || !Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide availability as an array'
      });
    }

    // Validate availability format
    for (const daySlot of availability) {
      if (!daySlot.day || !Array.isArray(daySlot.slots)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid availability format. Each day must have day name and slots array'
        });
      }

      for (const slot of daySlot.slots) {
        if (!slot.startTime || !slot.endTime) {
          return res.status(400).json({
            success: false,
            message: 'Each slot must have startTime and endTime'
          });
        }
      }
    }

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { availability },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found. Please create profile first'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating availability',
      error: error.message
    });
  }
};

// @desc    Get all active doctors (for patients)
// @route   GET /api/doctor/list
// @access  Private
exports.getAllDoctors = async (req, res) => {
  try {
    const { expertise, search } = req.query;

    let query = { isActive: true, isProfileComplete: true };

    // Filter by expertise
    if (expertise) {
      query.expertise = { $regex: expertise, $options: 'i' };
    }

    // Search by name
    if (search) {
      query.fullName = { $regex: search, $options: 'i' };
    }

    const doctors = await DoctorProfile.find(query)
      .select('-__v')
      .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error('Error getting doctors list:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctors',
      error: error.message
    });
  }
};

// @desc    Get single doctor profile (for patients)
// @route   GET /api/doctor/:doctorId
// @access  Private
exports.getDoctorById = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await DoctorProfile.findOne({
      userId: doctorId,
      isActive: true,
      isProfileComplete: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or profile incomplete'
      });
    }

    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Error getting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor',
      error: error.message
    });
  }
};

// @desc    Toggle doctor active status
// @route   PATCH /api/doctor/profile/status
// @access  Private (Doctor only)
exports.toggleActiveStatus = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    profile.isActive = !profile.isActive;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Profile ${profile.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: profile.isActive }
    });
  } catch (error) {
    console.error('Error toggling status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating status',
      error: error.message
    });
  }
};
