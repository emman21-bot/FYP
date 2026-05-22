const ModelRun = require('../models/ModelRun');
const PredictionFeedback = require('../models/PredictionFeedback');
const HealthData = require('../models/HealthData');
const GlucoseSeries = require('../models/GlucoseSeries');
const { createNotification } = require('../utils/notificationHelper');
const axios = require('axios');

// ML Service URL (Python FastAPI microservice)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ===== HYPERTENSION PREDICTION =====

exports.predictHypertension = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    // Call ML service with patient email
    // ML service will fetch patient data from database
    const mlPayload = {
      patient_email: userEmail,
      ...req.body // Allow overrides from request
    };

    const startTime = Date.now();
    let mlResponse;
    
    try {
      mlResponse = await axios.post(
        `${ML_SERVICE_URL}/predict/hypertension`,
        mlPayload,
        { timeout: 15000 }
      );
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      return res.status(503).json({ 
        success: false,
        message: 'ML prediction service unavailable. Please ensure the ML service is running.',
        hint: 'Start ML service: cd ml-service && python main.py'
      });
    }

    const executionTime = Date.now() - startTime;
    const { prediction, metadata } = mlResponse.data;

    // Save model run to database
    const modelRun = await ModelRun.create({
      userId,
      userEmail,
      modelName: 'hypertension_xgboost',
      modelVersion: '1.0',
      predictionType: 'hypertension_risk',
      inputFeatures: prediction.input_features || mlPayload,
      outputPrediction: prediction,
      executionTime,
      confidence: prediction.risk_score,
      status: 'completed'
    });

    // Create notification if high risk
    if (prediction.has_hypertension_risk && prediction.risk_level === 'HIGH') {
      await createNotification({
        userId,
        userEmail,
        type: 'health_alert',
        title: '⚠️ Hypertension Risk Detected',
        message: prediction.explanation,
        data: {
          modelRunId: modelRun._id,
          riskScore: prediction.risk_score,
          recommendation: prediction.recommendation
        }
      });
    }

    res.json({
      success: true,
      message: 'Hypertension risk prediction completed',
      modelRunId: modelRun._id,
      prediction: {
        hasRisk: prediction.has_hypertension_risk,
        riskScore: prediction.risk_score,
        riskLevel: prediction.risk_level,
        recommendation: prediction.recommendation,
        explanation: prediction.explanation
      },
      executionTime
    });

  } catch (error) {
    console.error('Error in hypertension prediction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing prediction', 
      error: error.message 
    });
  }
};

// ===== GLUCOSE PREDICTION =====

exports.forecastGlucose = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Call ML service
    const mlPayload = {
      patient_email: userEmail,
      ...req.body // Allow overrides
    };

    const startTime = Date.now();
    let mlResponse;
    
    try {
      mlResponse = await axios.post(
        `${ML_SERVICE_URL}/predict/glucose`,
        mlPayload,
        { timeout: 20000 }
      );
    } catch (mlError) {
      console.error('ML Service error:', mlError.message);
      return res.status(503).json({ 
        success: false,
        message: 'Glucose prediction service unavailable',
        hint: 'Start ML service: cd ml-service && python main.py'
      });
    }

    const executionTime = Date.now() - startTime;
    const { prediction, metadata } = mlResponse.data;

    // Save model run
    const modelRun = await ModelRun.create({
      userId,
      userEmail,
      modelName: 'glucose_catboost',
      modelVersion: '1.0',
      predictionType: 'glucose_forecast',
      inputFeatures: prediction.input_features || mlPayload,
      outputPrediction: prediction,
      executionTime,
      confidence: prediction.forecast_6h && prediction.forecast_6h.length > 0 
        ? prediction.forecast_6h[0].confidence 
        : 0.8,
      status: 'completed'
    });

    // Create alert if risky glucose levels predicted
    if (prediction.risk_zone === 'HYPOGLYCEMIA' || prediction.risk_zone === 'HYPERGLYCEMIA') {
      await createNotification({
        userId,
        userEmail,
        type: 'health_alert',
        title: prediction.risk_zone === 'HYPOGLYCEMIA' ? '⚠️ Low Blood Sugar Alert' : '⚠️ High Blood Sugar Alert',
        message: prediction.risk_message,
        data: {
          modelRunId: modelRun._id,
          predictedGlucose: prediction.predicted_glucose,
          riskZone: prediction.risk_zone
        }
      });
    }

    res.json({
      success: true,
      message: 'Glucose forecast completed',
      modelRunId: modelRun._id,
      prediction: {
        predictedGlucose: prediction.predicted_glucose,
        unit: prediction.unit,
        forecast6h: prediction.forecast_6h,
        trend: prediction.trend,
        trendStrength: prediction.trend_strength,
        riskZone: prediction.risk_zone,
        riskMessage: prediction.risk_message
      },
      executionTime
    });

  } catch (error) {
    console.error('Error in glucose forecast:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing forecast', 
      error: error.message 
    });
  }
};

// ===== PREDICTION HISTORY =====

exports.getPredictionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { modelName, predictionType, status, limit = 20 } = req.query;

    const filter = { userId };
    if (modelName) filter.modelName = modelName;
    if (predictionType) filter.predictionType = predictionType;
    if (status) filter.status = status;

    const predictions = await ModelRun.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ 
      success: true,
      count: predictions.length,
      predictions 
    });
  } catch (error) {
    console.error('Error fetching prediction history:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching predictions', 
      error: error.message 
    });
  }
};

// ===== GET SINGLE PREDICTION =====

exports.getPredictionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const prediction = await ModelRun.findOne({ _id: id, userId });
    if (!prediction) {
      return res.status(404).json({ 
        success: false,
        message: 'Prediction not found' 
      });
    }

    // Get feedback if exists
    const feedback = await PredictionFeedback.findOne({ modelRunId: id });

    res.json({ 
      success: true,
      prediction,
      feedback: feedback || null
    });
  } catch (error) {
    console.error('Error fetching prediction:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching prediction', 
      error: error.message 
    });
  }
};

// ===== SUBMIT FEEDBACK =====

exports.submitFeedback = async (req, res) => {
  try {
    const { modelRunId } = req.params;
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { feedbackType, correctedValue, accuracyRating, comments } = req.body;

    // Verify model run exists
    const modelRun = await ModelRun.findOne({ _id: modelRunId, userId });
    if (!modelRun) {
      return res.status(404).json({ 
        success: false,
        message: 'Prediction not found' 
      });
    }

    // Check if feedback already submitted
    const existingFeedback = await PredictionFeedback.findOne({ modelRunId, userId });
    if (existingFeedback) {
      return res.status(400).json({ 
        success: false,
        message: 'Feedback already submitted for this prediction' 
      });
    }

    // Create feedback
    const feedback = await PredictionFeedback.create({
      userId,
      userEmail,
      modelRunId,
      modelName: modelRun.modelName,
      feedbackType,
      correctedValue,
      accuracyRating,
      comments
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error submitting feedback', 
      error: error.message 
    });
  }
};

// ===== FEEDBACK STATISTICS =====

exports.getFeedbackStats = async (req, res) => {
  try {
    const { modelName } = req.query;

    const filter = {};
    if (modelName) filter.modelName = modelName;

    const stats = await PredictionFeedback.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$feedbackType',
          count: { $sum: 1 },
          avgRating: { $avg: '$accuracyRating' }
        }
      }
    ]);

    res.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching stats', 
      error: error.message 
    });
  }
};

module.exports = exports;
