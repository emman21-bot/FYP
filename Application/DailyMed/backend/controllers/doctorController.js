const User = require('../models/User');
const HealthData = require('../models/HealthData');
const GlucoseSeries = require('../models/GlucoseSeries');
const ModelRun = require('../models/ModelRun');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Get all available doctors
exports.getAllDoctors = async (req, res) => {
  try {
    const { search, specialty, limit = 50 } = req.query;

    const filter = { role: 'doctor', accountStatus: 'active' };
    
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'doctorProfile.specialization': { $regex: search, $options: 'i' } }
      ];
    }

    if (specialty) {
      filter['doctorProfile.specialization'] = specialty;
    }

    const doctors = await User.find(filter)
      .select('fullName email phone doctorProfile dateOfBirth gender')
      .limit(parseInt(limit))
      .sort({ 'doctorProfile.yearsOfExperience': -1 });

    res.json({ doctors });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error fetching doctors', error: error.message });
  }
};

// Get doctor profile by email
exports.getDoctorByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const doctor = await User.findOne({ email, role: 'doctor', accountStatus: 'active' })
      .select('-password');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ doctor });
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error fetching doctor', error: error.message });
  }
};

// Get all patients for a doctor
exports.getDoctorPatients = async (req, res) => {
  try {
    const doctorEmail = req.user.email;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can access patient lists' });
    }

    const patients = await User.find({ 
      assignedDoctorEmail: doctorEmail,
      role: 'patient'
    })
      .select('fullName email phone dateOfBirth gender medicalConditions lastLogin')
      .sort({ lastLogin: -1 });

    // Get latest health metrics for each patient
    const patientsWithMetrics = await Promise.all(
      patients.map(async (patient) => {
        const latestHealthData = await HealthData.findOne({ userId: patient._id })
          .sort({ readingDate: -1 });

        const latestPrediction = await ModelRun.findOne({ 
          userId: patient._id,
          status: 'completed'
        })
          .sort({ createdAt: -1 });

        return {
          ...patient.toObject(),
          latestReading: latestHealthData ? {
            bloodSugar: latestHealthData.bloodSugar,
            bloodPressure: latestHealthData.bloodPressure,
            date: latestHealthData.readingDate
          } : null,
          latestPrediction: latestPrediction ? {
            modelName: latestPrediction.modelName,
            output: latestPrediction.output,
            date: latestPrediction.createdAt
          } : null
        };
      })
    );

    res.json({ patients: patientsWithMetrics });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error fetching patients', error: error.message });
  }
};

// Get patient details by email (for doctor)
exports.getPatientDetails = async (req, res) => {
  try {
    const { patientEmail } = req.params;
    const doctorEmail = req.user.email;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can access patient details' });
    }

    const patient = await User.findOne({ 
      email: patientEmail,
      assignedDoctorEmail: doctorEmail,
      role: 'patient'
    }).select('-password');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found or not assigned to you' });
    }

    // Get health data history (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const healthData = await HealthData.find({
      userId: patient._id,
      readingDate: { $gte: thirtyDaysAgo }
    }).sort({ readingDate: -1 });

    // Get predictions
    const predictions = await ModelRun.find({
      userId: patient._id,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      patient,
      healthData,
      predictions
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Server error fetching patient details', error: error.message });
  }
};
