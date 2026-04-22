const HealthData = require('../models/HealthData');
const GlucoseSeries = require('../models/GlucoseSeries');
const ModelRun = require('../models/ModelRun');
const User = require('../models/User');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Get dashboard analytics for patient
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Get health data from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const healthData = await HealthData.find({
      userId,
      readingDate: { $gte: thirtyDaysAgo }
    }).sort({ readingDate: 1 });

    // Calculate averages
    const bloodSugarReadings = healthData.filter(d => d.bloodSugar).map(d => ({
      value: d.bloodSugar.fasting || d.bloodSugar.random || d.bloodSugar.postMeal,
      date: d.readingDate,
      context: d.mealContext || 'random'
    }));

    const bloodPressureReadings = healthData.filter(d => d.bloodPressure).map(d => ({
      systolic: d.bloodPressure.systolic,
      diastolic: d.bloodPressure.diastolic,
      date: d.readingDate,
      context: d.bloodPressure.context || 'resting'
    }));

    const weightReadings = healthData.filter(d => d.weight).map(d => ({
      value: d.weight,
      date: d.readingDate
    }));

    const temperatureReadings = healthData.filter(d => d.temperature).map(d => ({
      value: d.temperature,
      date: d.readingDate
    }));

    const heartRateReadings = healthData.filter(d => d.heartRate).map(d => ({
      value: d.heartRate,
      date: d.readingDate
    }));

    // Calculate individual glucose type averages
    const fastingReadings = healthData.filter(d => d.bloodSugar?.fasting).map(d => d.bloodSugar.fasting);
    const randomReadings = healthData.filter(d => d.bloodSugar?.random).map(d => d.bloodSugar.random);
    const postMealReadings = healthData.filter(d => d.bloodSugar?.postMeal).map(d => d.bloodSugar.postMeal);

    const avgFasting = fastingReadings.length > 0
      ? fastingReadings.reduce((sum, v) => sum + v, 0) / fastingReadings.length
      : null;
    const avgRandom = randomReadings.length > 0
      ? randomReadings.reduce((sum, v) => sum + v, 0) / randomReadings.length
      : null;
    const avgPostMeal = postMealReadings.length > 0
      ? postMealReadings.reduce((sum, v) => sum + v, 0) / postMealReadings.length
      : null;

    // Calculate averages
    const avgBloodSugar = bloodSugarReadings.length > 0
      ? bloodSugarReadings.reduce((sum, r) => sum + r.value, 0) / bloodSugarReadings.length
      : null;

    const avgSystolic = bloodPressureReadings.length > 0
      ? bloodPressureReadings.reduce((sum, r) => sum + r.systolic, 0) / bloodPressureReadings.length
      : null;

    const avgDiastolic = bloodPressureReadings.length > 0
      ? bloodPressureReadings.reduce((sum, r) => sum + r.diastolic, 0) / bloodPressureReadings.length
      : null;

    const latestWeight = weightReadings.length > 0 ? weightReadings[weightReadings.length - 1].value : null;
    const latestTemperature = temperatureReadings.length > 0 ? temperatureReadings[temperatureReadings.length - 1].value : null;
    const latestHeartRate = heartRateReadings.length > 0 ? heartRateReadings[heartRateReadings.length - 1].value : null;

    // Get latest AI predictions
    const latestGlucosePrediction = await ModelRun.findOne({
      userId,
      modelName: 'glucose_lstm',
      status: 'completed'
    }).sort({ createdAt: -1 });

    const latestHypertensionPrediction = await ModelRun.findOne({
      userId,
      modelName: 'hypertension_svm',
      status: 'completed'
    }).sort({ createdAt: -1 });

    // Determine health status (ADA guidelines)
    const bloodSugarStatus = avgBloodSugar
      ? avgBloodSugar < 70 ? 'low'
        : avgBloodSugar <= 140 ? 'normal'
          : avgBloodSugar <= 180 ? 'elevated'
            : 'high'
      : null;

    const bloodPressureStatus = (avgSystolic && avgDiastolic)
      ? (avgSystolic < 120 && avgDiastolic < 80) ? 'optimal'
        : (avgSystolic < 140 && avgDiastolic < 90) ? 'elevated'
          : 'high'
      : null;

    res.json({
      summary: {
        bloodSugar: {
          average: avgBloodSugar ? Math.round(avgBloodSugar) : null,
          fasting: avgFasting ? Math.round(avgFasting) : null,
          random: avgRandom ? Math.round(avgRandom) : null,
          postMeal: avgPostMeal ? Math.round(avgPostMeal) : null,
          status: bloodSugarStatus,
          unit: 'mg/dL',
          readingsCount: bloodSugarReadings.length,
          fastingCount: fastingReadings.length,
          randomCount: randomReadings.length,
          postMealCount: postMealReadings.length
        },
        bloodPressure: {
          systolic: avgSystolic ? Math.round(avgSystolic) : null,
          diastolic: avgDiastolic ? Math.round(avgDiastolic) : null,
          status: bloodPressureStatus,
          unit: 'mmHg',
          readingsCount: bloodPressureReadings.length
        },
        weight: latestWeight ? { value: latestWeight, unit: 'lbs' } : null,
        temperature: latestTemperature ? { value: latestTemperature, unit: '°F' } : null,
        heartRate: latestHeartRate ? { value: latestHeartRate, unit: 'bpm' } : null
      },
      trends: {
        bloodSugar: bloodSugarReadings,
        bloodPressure: bloodPressureReadings,
        weight: weightReadings
      },
      predictions: {
        glucose: latestGlucosePrediction ? {
          forecast: latestGlucosePrediction.output.forecast,
          timestamps: latestGlucosePrediction.output.timestamps,
          trend: latestGlucosePrediction.output.trend,
          confidence: latestGlucosePrediction.output.confidence,
          createdAt: latestGlucosePrediction.createdAt
        } : null,
        hypertension: latestHypertensionPrediction ? {
          risk: latestHypertensionPrediction.output.prediction === 1 ? 'high' : 'low',
          confidence: latestHypertensionPrediction.output.confidence,
          riskFactors: latestHypertensionPrediction.output.riskFactors,
          createdAt: latestHypertensionPrediction.createdAt
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ message: 'Server error fetching analytics', error: error.message });
  }
};

// Get insulin dosage recommendation from ML service
exports.getInsulinRecommendation = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // Call ML service for insulin recommendation
    let mlResponse;
    try {
      mlResponse = await axios.post(
        `${ML_SERVICE_URL}/predict/insulin-dosage`,
        {
          patient_email: userEmail,
          current_insulin_dose: req.body.current_insulin_dose
        },
        { timeout: 15000 }
      );
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);

      // Handle different error types
      if (mlError.response && mlError.response.status === 404) {
        // Patient has no data yet
        return res.json({
          success: true,
          recommendation: {
            action: 'MAINTAIN',
            currentDose: 10,
            suggestedDose: 10,
            adjustmentPercentage: 0,
            explanation: 'Insufficient health data to generate AI recommendation. Please log your blood glucose readings for at least 3 days to receive personalized insulin dosage suggestions.',
            urgency: 'LOW',
            note: 'Start logging your daily glucose readings, meals, and insulin doses to enable AI predictions.'
          }
        });
      }

      // ML service unavailable
      return res.status(503).json({
        success: false,
        message: 'Insulin recommendation service unavailable',
        recommendation: {
          action: 'MAINTAIN',
          explanation: 'Unable to generate AI recommendation. Please maintain current dosage and consult your doctor.',
          note: 'ML service is not running'
        }
      });
    }

    const { prediction } = mlResponse.data;

    res.json({
      success: true,
      recommendation: {
        action: prediction.action,
        currentDose: prediction.current_dose,
        suggestedDose: prediction.suggested_dose,
        adjustmentPercentage: prediction.adjustment_percentage,
        predictedGlucose: prediction.predicted_glucose,
        explanation: prediction.explanation,
        urgency: prediction.urgency,
        clinicalNotes: prediction.clinical_notes,
        requiresDoctorApproval: prediction.requires_doctor_approval,
        disclaimer: prediction.disclaimer
      }
    });
  } catch (error) {
    console.error('Error getting insulin recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting recommendation',
      error: error.message
    });
  }
};

// LEGACY: Get insulin dosage recommendation (fallback)
exports.getInsulinRecommendationLegacy = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get latest glucose forecast
    const latestForecast = await ModelRun.findOne({
      userId,
      modelName: 'glucose_catboost',
      status: 'completed'
    }).sort({ createdAt: -1 });

    if (!latestForecast || !latestForecast.outputPrediction) {
      return res.json({
        recommendation: 'maintain',
        message: 'Insufficient data for insulin recommendation. Please record glucose time series data.',
        forecast: null
      });
    }

    const forecast = latestForecast.output.forecast;
    const avgForecast = forecast.reduce((sum, val) => sum + val, 0) / forecast.length;

    // Simple recommendation logic based on forecast
    let recommendation = 'maintain';
    let message = '';

    if (avgForecast < 70) {
      recommendation = 'decrease';
      message = 'AI predicts potential hypoglycemia. Consider reducing insulin dose. Consult your doctor.';
    } else if (avgForecast > 180) {
      recommendation = 'increase';
      message = 'AI predicts elevated glucose levels. Consider increasing insulin dose. Consult your doctor.';
    } else {
      recommendation = 'maintain';
      message = 'Glucose forecast is within normal range. Maintain current insulin dosage.';
    }

    res.json({
      recommendation,
      message,
      forecast: {
        average: Math.round(avgForecast),
        predictions: forecast,
        trend: latestForecast.output.trend,
        confidence: latestForecast.output.confidence
      },
      disclaimer: 'This is an AI-based recommendation. Always consult your healthcare provider before adjusting insulin dosage.'
    });
  } catch (error) {
    console.error('Error fetching insulin recommendation:', error);
    res.status(500).json({ message: 'Server error fetching recommendation', error: error.message });
  }
};

// Add glucose time series data
exports.addGlucoseSeriesData = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const {
      bloodGlucose,
      insulinDose,
      carbsIntake,
      heartRate,
      steps,
      calories,
      activityIntensity,
      deviceSource
    } = req.body;

    if (!bloodGlucose) {
      return res.status(400).json({ message: 'Blood glucose value is required' });
    }

    const glucoseSeries = await GlucoseSeries.create({
      userId,
      userEmail,
      timestamp: new Date(),
      bloodGlucose,
      insulinDose: insulinDose || 0,
      carbsIntake: carbsIntake || 0,
      heartRate: heartRate || 0,
      steps: steps || 0,
      calories: calories || 0,
      activityIntensity: activityIntensity || 0,
      deviceSource: deviceSource || 'manual',
      quality: 'good'
    });

    res.status(201).json({
      message: 'Glucose data recorded successfully',
      data: glucoseSeries
    });
  } catch (error) {
    console.error('Error adding glucose series data:', error);
    res.status(500).json({ message: 'Server error adding data', error: error.message });
  }
};

// Get glucose time series data
exports.getGlucoseSeriesData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { hours = 6 } = req.query;

    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    const glucoseSeries = await GlucoseSeries.find({
      userId,
      timestamp: { $gte: hoursAgo }
    }).sort({ timestamp: 1 });

    res.json({ data: glucoseSeries });
  } catch (error) {
    console.error('Error fetching glucose series data:', error);
    res.status(500).json({ message: 'Server error fetching data', error: error.message });
  }
};

// Get glucose forecast prediction from ML service
exports.getGlucosePrediction = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // Get latest health data for prediction
    const latestHealthData = await HealthData.findOne({ userEmail })
      .sort({ createdAt: -1 });

    if (!latestHealthData) {
      return res.status(404).json({
        success: false,
        message: 'No health data found. Please log some readings first.'
      });
    }

    // Call ML service
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/predict/glucose`,
      { patient_email: userEmail },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      prediction: mlResponse.data.prediction,
      metadata: mlResponse.data.metadata
    });
  } catch (error) {
    console.error('Error getting glucose prediction:', error);
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Insufficient glucose data for prediction'
      });
    }
    res.status(500).json({
      success: false,
      message: 'ML service error',
      error: error.message
    });
  }
};

// Get hypertension risk prediction from ML service
exports.getHypertensionPrediction = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // Get latest health data
    const latestHealthData = await HealthData.findOne({ userEmail })
      .sort({ createdAt: -1 });

    if (!latestHealthData) {
      return res.status(404).json({
        success: false,
        message: 'No health data found'
      });
    }

    // Call ML service
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/predict/hypertension`,
      {
        patient_email: userEmail,
        age: req.user.age || 30,
        systolic_bp: latestHealthData.bloodPressure?.systolic,
        diastolic_bp: latestHealthData.bloodPressure?.diastolic
      },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      prediction: mlResponse.data.prediction,
      metadata: mlResponse.data.metadata
    });
  } catch (error) {
    console.error('Error getting hypertension prediction:', error);
    res.status(500).json({
      success: false,
      message: 'ML service error',
      error: error.message
    });
  }
};

// Get blood pressure forecast prediction from ML service
exports.getBPPrediction = async (req, res) => {
  try {
    const userEmail = req.user.email;
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // Call ML service
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/predict/blood-pressure`,
      { patient_email: userEmail },
      { timeout: 15000 }
    );

    res.json({
      success: true,
      prediction: mlResponse.data.prediction,
      metadata: mlResponse.data.metadata
    });
  } catch (error) {
    console.error('Error getting BP prediction:', error);
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'Insufficient BP data for prediction. Log at least 3 readings.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'ML service error',
      error: error.message
    });
  }
};

// Get patient analytics for doctor
exports.getPatientAnalyticsForDoctor = async (req, res) => {
  try {
    const { patientEmail } = req.params;
    const doctorId = req.user._id;
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

    // Find the patient user by email
    const patient = await User.findOne({ email: patientEmail.toLowerCase() });
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientId = patient._id;

    // Get health data from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const healthData = await HealthData.find({
      userId: patientId,
      readingDate: { $gte: thirtyDaysAgo }
    }).sort({ readingDate: 1 });

    // Calculate blood sugar readings with trends
    const bloodSugarReadings = healthData.filter(d => d.bloodSugar).map(d => ({
      value: d.bloodSugar.fasting || d.bloodSugar.random || d.bloodSugar.postMeal,
      date: d.readingDate
    }));

    const bloodPressureReadings = healthData.filter(d => d.bloodPressure).map(d => ({
      systolic: d.bloodPressure.systolic,
      diastolic: d.bloodPressure.diastolic,
      date: d.readingDate
    }));

    // Calculate averages
    const fastingReadings = healthData.filter(d => d.bloodSugar?.fasting).map(d => d.bloodSugar.fasting);
    const randomReadings = healthData.filter(d => d.bloodSugar?.random).map(d => d.bloodSugar.random);
    const postMealReadings = healthData.filter(d => d.bloodSugar?.postMeal).map(d => d.bloodSugar.postMeal);

    const avgFasting = fastingReadings.length > 0 ? fastingReadings.reduce((a, b) => a + b, 0) / fastingReadings.length : null;
    const avgRandom = randomReadings.length > 0 ? randomReadings.reduce((a, b) => a + b, 0) / randomReadings.length : null;
    const avgPostMeal = postMealReadings.length > 0 ? postMealReadings.reduce((a, b) => a + b, 0) / postMealReadings.length : null;

    const avgSystolic = bloodPressureReadings.length > 0
      ? bloodPressureReadings.reduce((sum, r) => sum + r.systolic, 0) / bloodPressureReadings.length : null;
    const avgDiastolic = bloodPressureReadings.length > 0
      ? bloodPressureReadings.reduce((sum, r) => sum + r.diastolic, 0) / bloodPressureReadings.length : null;

    const latestWeight = healthData.filter(d => d.weight).slice(-1)[0]?.weight || null;
    const latestHeartRate = healthData.filter(d => d.heartRate).slice(-1)[0]?.heartRate || null;

    // Fetch AI predictions from ML service
    let glucosePrediction = null;
    let insulinRecommendation = null;
    let hypertensionPrediction = null;
    let bpPrediction = null;

    try {
      const [glucoseRes, insulinRes, hypertensionRes, bpRes] = await Promise.allSettled([
        axios.post(`${ML_SERVICE_URL}/predict/glucose`, { patient_email: patientEmail }, { timeout: 10000 }),
        axios.post(`${ML_SERVICE_URL}/predict/insulin-dosage`, { patient_email: patientEmail }, { timeout: 10000 }),
        axios.post(`${ML_SERVICE_URL}/predict/hypertension`, { patient_email: patientEmail }, { timeout: 10000 }),
        axios.post(`${ML_SERVICE_URL}/predict/blood-pressure`, { patient_email: patientEmail }, { timeout: 10000 })
      ]);

      if (glucoseRes.status === 'fulfilled') glucosePrediction = glucoseRes.value.data;
      if (insulinRes.status === 'fulfilled') insulinRecommendation = insulinRes.value.data;
      if (hypertensionRes.status === 'fulfilled') hypertensionPrediction = hypertensionRes.value.data;
      if (bpRes.status === 'fulfilled') bpPrediction = bpRes.value.data;
    } catch (mlError) {
      console.log('ML predictions not available for patient:', patientEmail);
    }

    res.json({
      success: true,
      summary: {
        bloodSugar: {
          fasting: avgFasting ? Math.round(avgFasting) : null,
          random: avgRandom ? Math.round(avgRandom) : null,
          postMeal: avgPostMeal ? Math.round(avgPostMeal) : null,
          fastingCount: fastingReadings.length,
          randomCount: randomReadings.length,
          postMealCount: postMealReadings.length
        },
        bloodPressure: {
          systolic: avgSystolic ? Math.round(avgSystolic) : null,
          diastolic: avgDiastolic ? Math.round(avgDiastolic) : null,
          readingsCount: bloodPressureReadings.length
        },
        weight: latestWeight ? { value: latestWeight, unit: 'kg' } : null,
        heartRate: latestHeartRate ? { value: latestHeartRate, unit: 'bpm' } : null
      },
      trends: {
        bloodSugar: bloodSugarReadings,
        bloodPressure: bloodPressureReadings
      },
      predictions: {
        glucose: glucosePrediction,
        insulin: insulinRecommendation,
        hypertension: hypertensionPrediction,
        bp: bpPrediction
      }
    });
  } catch (error) {
    console.error('Error fetching patient analytics for doctor:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
