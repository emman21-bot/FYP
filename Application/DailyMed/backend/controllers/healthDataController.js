const HealthData = require('../models/HealthData');

// @desc    Add new health data reading
// @route   POST /api/health-data
// @access  Private
exports.addHealthData = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      readingDate,
      fasting,
      random,
      postMeal,
      systolic,
      diastolic,
      heartRate,
      weight,
      notes
    } = req.body;

    // Validate and sanitize input
    const sanitizeNumber = (value, min, max) => {
      if (!value) return undefined;
      const num = parseFloat(value);
      if (isNaN(num) || num < min || num > max) return undefined;
      return num;
    };

    // Create health data entry with validated values
    const healthData = await HealthData.create({
      userId,
      userEmail: req.user.email,
      readingDate: readingDate || Date.now(),
      bloodSugar: {
        fasting: sanitizeNumber(fasting, 40, 600),
        random: sanitizeNumber(random, 40, 600),
        postMeal: sanitizeNumber(postMeal, 40, 600)
      },
      bloodPressure: {
        systolic: sanitizeNumber(systolic, 70, 250),
        diastolic: sanitizeNumber(diastolic, 40, 200)
      },
      heartRate: sanitizeNumber(heartRate, 30, 300),
      weight: sanitizeNumber(weight, 20, 500),
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Health data added successfully',
      data: healthData
    });

  } catch (error) {
    console.error('Add health data error:', error);

    // Handle validation errors gracefully
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
      message: 'Failed to add health data',
      error: error.message
    });
  }
};

// @desc    Get health data history with pagination
// @route   GET /api/health-data?page=1&limit=10
// @access  Private
exports.getHealthData = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalRecords = await HealthData.countDocuments({ userId });

    // Get paginated health data, sorted by most recent first
    const healthData = await HealthData.find({ userId })
      .sort({ readingDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(totalRecords / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      success: true,
      data: healthData,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        recordsPerPage: limit,
        hasMore
      }
    });

  } catch (error) {
    console.error('Get health data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health data',
      error: error.message
    });
  }
};

// @desc    Get single health data entry
// @route   GET /api/health-data/:id
// @access  Private
exports.getHealthDataById = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const healthData = await HealthData.findOne({ _id: id, userId });

    if (!healthData) {
      return res.status(404).json({
        success: false,
        message: 'Health data not found'
      });
    }

    res.status(200).json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('Get health data by ID error:', error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid health data ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch health data',
      error: error.message
    });
  }
};

// @desc    Update health data entry
// @route   PUT /api/health-data/:id
// @access  Private
exports.updateHealthData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const {
      readingDate,
      fasting,
      random,
      postMeal,
      systolic,
      diastolic,
      heartRate,
      weight,
      notes
    } = req.body;

    // Find and verify ownership
    const healthData = await HealthData.findOne({ _id: id, userId });

    if (!healthData) {
      return res.status(404).json({
        success: false,
        message: 'Health data not found'
      });
    }

    // Validate and sanitize input
    const sanitizeNumber = (value, min, max) => {
      if (value === undefined || value === null || value === '') return undefined;
      const num = parseFloat(value);
      if (isNaN(num) || num < min || num > max) return undefined;
      return num;
    };

    // Update fields with validation
    if (readingDate) healthData.readingDate = readingDate;

    if (fasting !== undefined) healthData.bloodSugar.fasting = sanitizeNumber(fasting, 40, 600);
    if (random !== undefined) healthData.bloodSugar.random = sanitizeNumber(random, 40, 600);
    if (postMeal !== undefined) healthData.bloodSugar.postMeal = sanitizeNumber(postMeal, 40, 600);

    if (systolic !== undefined) healthData.bloodPressure.systolic = sanitizeNumber(systolic, 70, 250);
    if (diastolic !== undefined) healthData.bloodPressure.diastolic = sanitizeNumber(diastolic, 40, 200);

    if (heartRate !== undefined) healthData.heartRate = sanitizeNumber(heartRate, 30, 300);
    if (weight !== undefined) healthData.weight = sanitizeNumber(weight, 20, 500);
    if (notes !== undefined) healthData.notes = notes;

    await healthData.save();

    res.status(200).json({
      success: true,
      message: 'Health data updated successfully',
      data: healthData
    });

  } catch (error) {
    console.error('Update health data error:', error);

    // Handle validation errors gracefully
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid health data ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update health data',
      error: error.message
    });
  }
};

// @desc    Delete health data entry
// @route   DELETE /api/health-data/:id
// @access  Private
exports.deleteHealthData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const healthData = await HealthData.findOneAndDelete({ _id: id, userId });

    if (!healthData) {
      return res.status(404).json({
        success: false,
        message: 'Health data not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Health data deleted successfully'
    });

  } catch (error) {
    console.error('Delete health data error:', error);

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid health data ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete health data',
      error: error.message
    });
  }
};

// @desc    Get health data statistics
// @route   GET /api/health-data/stats
// @access  Private
exports.getHealthDataStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 30;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const stats = await HealthData.aggregate([
      {
        $match: {
          userId: userId,
          readingDate: { $gte: dateFrom }
        }
      },
      {
        $group: {
          _id: null,
          avgFasting: { $avg: '$bloodSugar.fasting' },
          avgRandom: { $avg: '$bloodSugar.random' },
          avgPostMeal: { $avg: '$bloodSugar.postMeal' },
          avgSystolic: { $avg: '$bloodPressure.systolic' },
          avgDiastolic: { $avg: '$bloodPressure.diastolic' },
          avgHeartRate: { $avg: '$heartRate' },
          avgWeight: { $avg: '$weight' },
          totalReadings: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        avgFasting: 0,
        avgRandom: 0,
        avgPostMeal: 0,
        avgSystolic: 0,
        avgDiastolic: 0,
        avgHeartRate: 0,
        avgWeight: 0,
        totalReadings: 0
      }
    });

  } catch (error) {
    console.error('Get health data stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// @desc    Get patient health data (for doctors)
// @route   GET /api/health-data/patient/:patientEmail
// @access  Private (Doctors only)
exports.getPatientHealthData = async (req, res) => {
  try {
    const { patientEmail } = req.params;
    const doctorId = req.user._id;

    // Verify that the doctor has an active care relationship with this patient
    const CareRelationship = require('../models/CareRelationship');
    const relationship = await CareRelationship.findOne({
      doctorId: doctorId,
      patientEmail: patientEmail.toLowerCase(),
      status: { $in: ['active', 'requested'] }
    });

    // For now, allow doctors to view patient data if they have any relationship (active or requested)
    // This allows doctors to review patient history before accepting
    if (!relationship && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this patient\'s data'
      });
    }

    // Get all health data for the patient
    const healthData = await HealthData.find({ userEmail: patientEmail.toLowerCase() })
      .sort({ readingDate: -1, createdAt: -1 })
      .lean();

    // Calculate statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentData = healthData.filter(d => new Date(d.readingDate) > thirtyDaysAgo);

    // Calculate averages
    const calcAvg = (data, getter) => {
      const values = data.map(getter).filter(v => v !== undefined && v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const stats = {
      avgFasting: calcAvg(recentData, d => d.bloodSugar?.fasting),
      avgRandom: calcAvg(recentData, d => d.bloodSugar?.random),
      avgPostMeal: calcAvg(recentData, d => d.bloodSugar?.postMeal),
      avgSystolic: calcAvg(recentData, d => d.bloodPressure?.systolic),
      avgDiastolic: calcAvg(recentData, d => d.bloodPressure?.diastolic),
      avgHeartRate: calcAvg(recentData, d => d.heartRate),
      avgWeight: calcAvg(recentData, d => d.weight),
      totalRecords: healthData.length,
      recentRecords: recentData.length
    };

    // Get latest readings
    const getLatest = (type, getter) => {
      const item = healthData.find(d => getter(d) !== undefined && getter(d) !== null);
      return item ? { value: getter(item), date: item.readingDate } : null;
    };

    const latestReadings = {
      fasting: getLatest('fasting', d => d.bloodSugar?.fasting),
      random: getLatest('random', d => d.bloodSugar?.random),
      postMeal: getLatest('postMeal', d => d.bloodSugar?.postMeal),
      systolic: getLatest('systolic', d => d.bloodPressure?.systolic),
      diastolic: getLatest('diastolic', d => d.bloodPressure?.diastolic),
      heartRate: getLatest('heartRate', d => d.heartRate),
      weight: getLatest('weight', d => d.weight)
    };

    res.status(200).json({
      success: true,
      data: healthData,
      stats,
      latestReadings,
      patientEmail
    });

  } catch (error) {
    console.error('Get patient health data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient health data',
      error: error.message
    });
  }
};
