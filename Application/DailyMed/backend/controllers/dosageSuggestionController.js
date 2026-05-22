const DosageSuggestion = require('../models/DosageSuggestion');
const CareRelationship = require('../models/CareRelationship');
const TreatmentPlan = require('../models/TreatmentPlan');
const ModelRun = require('../models/ModelRun');
const HealthData = require('../models/HealthData');
const GlucoseSeries = require('../models/GlucoseSeries');
const { createNotification } = require('../utils/notificationHelper');
const { createAuditLog } = require('../utils/auditHelper');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Generate AI dosage suggestion (patient initiates)
exports.generateDosageSuggestion = async (req, res) => {
  try {
    const patientId = req.user.id;
    const patientEmail = req.user.email;
    const { doctorEmail, recentMeals, recentActivity, currentGlucose, targetGlucose } = req.body;

    // Validate patient role
    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can request dosage suggestions' });
    }

    // Verify active care relationship with doctor
    const careRelationship = await CareRelationship.findOne({
      patientEmail,
      doctorEmail,
      status: 'active',
      'consentScopes.dosageSuggestions': true
    }).populate('doctorId', 'name email');

    if (!careRelationship) {
      return res.status(403).json({ 
        message: 'No active care relationship with this doctor or dosage consent not granted' 
      });
    }

    // Get active treatment plan
    const treatmentPlan = await TreatmentPlan.findOne({
      patientId,
      doctorId: careRelationship.doctorId,
      isActive: true
    });

    if (!treatmentPlan) {
      return res.status(400).json({ 
        message: 'No active treatment plan found. Doctor must create a treatment plan first.' 
      });
    }

    // Get recent glucose time series for ML model
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const glucoseSeries = await GlucoseSeries.find({
      userId: patientId,
      timestamp: { $gte: threeHoursAgo }
    }).sort({ timestamp: 1 });

    if (glucoseSeries.length < 12) { // Need at least 1 hour
      return res.status(400).json({ 
        message: 'Insufficient recent glucose data. Need at least 1 hour of data.' 
      });
    }

    // Prepare ML input
    const mlInput = {
      current_glucose: currentGlucose,
      target_glucose: targetGlucose || treatmentPlan.targetGlucoseRange.min,
      recent_glucose_series: glucoseSeries.map(s => s.bloodGlucose),
      recent_insulin: glucoseSeries.map(s => s.insulinDose || 0),
      recent_carbs: glucoseSeries.map(s => s.carbsIntake || 0),
      meals: recentMeals || [],
      activity: recentActivity || 'moderate',
      treatment_plan: {
        basal_dose: treatmentPlan.basalDose,
        carb_ratio: treatmentPlan.carbRatio,
        correction_factor: treatmentPlan.correctionFactor,
        insulin_type: treatmentPlan.insulinType
      }
    };

    // Create model run record
    const modelRun = await ModelRun.create({
      userId: patientId,
      userEmail: patientEmail,
      modelName: 'insulin_dosage_advisor',
      modelVersion: '1.0',
      inputFeatures: {
        hash: JSON.stringify(mlInput),
        summary: `Current: ${currentGlucose}, Target: ${targetGlucose || treatmentPlan.targetGlucoseRange.min}`
      },
      status: 'queued'
    });

    try {
      // Call ML service
      const startTime = Date.now();
      const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/insulin-dosage`, mlInput, {
        timeout: 30000
      });
      const executionTime = Date.now() - startTime;

      // Update model run
      modelRun.status = 'completed';
      modelRun.output = {
        suggestion: mlResponse.data.suggestion,
        confidence: mlResponse.data.confidence,
        reasoning: mlResponse.data.reasoning
      };
      modelRun.executionTime = executionTime;
      await modelRun.save();

      // Calculate expiry (suggestions expire in 2 hours)
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

      // Create dosage suggestion pending doctor approval
      const dosageSuggestion = await DosageSuggestion.create({
        patientId,
        patientEmail,
        doctorId: careRelationship.doctorId,
        doctorEmail,
        careRelationshipId: careRelationship._id,
        treatmentPlanId: treatmentPlan._id,
        modelRunId: modelRun._id,
        suggestion: {
          type: mlResponse.data.suggestion.type, // 'bolus', 'basal_adjustment', 'no_change'
          timing: mlResponse.data.suggestion.timing,
          amount: mlResponse.data.suggestion.amount,
          units: mlResponse.data.suggestion.units || 'units',
          reasoning: mlResponse.data.reasoning
        },
        status: 'pending',
        expiresAt
      });

      // Notify doctor for review
      await createNotification({
        userId: careRelationship.doctorId,
        userEmail: doctorEmail,
        type: 'dosage_review_requested',
        title: '🩺 Dosage Review Required',
        message: `${req.user.name || patientEmail} requested AI-generated dosage suggestion review.`,
        data: {
          dosageSuggestionId: dosageSuggestion._id,
          patientId,
          patientEmail,
          suggestedDose: mlResponse.data.suggestion.amount,
          confidence: mlResponse.data.confidence
        }
      });

      // Notify patient
      await createNotification({
        userId: patientId,
        userEmail: patientEmail,
        type: 'dosage_suggestion_generated',
        title: '💊 Dosage Suggestion Generated',
        message: `AI has generated a dosage suggestion. Waiting for Dr. ${careRelationship.doctorId.name || doctorEmail} to review.`,
        data: {
          dosageSuggestionId: dosageSuggestion._id
        }
      });

      // Audit log
      await createAuditLog({
        actorId: patientId,
        actorEmail: patientEmail,
        actorRole: 'patient',
        action: 'create',
        resourceType: 'DosageSuggestion',
        resourceId: dosageSuggestion._id,
        targetUserId: careRelationship.doctorId,
        targetUserEmail: doctorEmail,
        after: dosageSuggestion.toObject(),
        metadata: { modelRunId: modelRun._id, confidence: mlResponse.data.confidence },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'high'
      });

      res.status(201).json({
        message: 'Dosage suggestion generated and sent to doctor for review',
        dosageSuggestion: {
          id: dosageSuggestion._id,
          suggestion: dosageSuggestion.suggestion,
          status: 'pending',
          doctorEmail,
          expiresAt,
          confidence: mlResponse.data.confidence
        }
      });

    } catch (mlError) {
      console.error('ML service error:', mlError);
      
      modelRun.status = 'failed';
      modelRun.errorMessage = mlError.message;
      await modelRun.save();

      res.status(503).json({ 
        message: 'Dosage advisor service temporarily unavailable',
        error: mlError.message 
      });
    }

  } catch (error) {
    console.error('Error generating dosage suggestion:', error);
    res.status(500).json({ message: 'Server error generating suggestion', error: error.message });
  }
};

// Doctor approves dosage suggestion
exports.approveDosageSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const doctorEmail = req.user.email;
    const { notes, modifiedAmount } = req.body;

    // Validate doctor role
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can approve dosage suggestions' });
    }

    const dosageSuggestion = await DosageSuggestion.findById(id)
      .populate('patientId', 'name email');
    
    if (!dosageSuggestion) {
      return res.status(404).json({ message: 'Dosage suggestion not found' });
    }

    // Verify ownership
    if (dosageSuggestion.doctorEmail !== doctorEmail) {
      return res.status(403).json({ message: 'Not authorized to review this suggestion' });
    }

    // Check status
    if (dosageSuggestion.status !== 'pending') {
      return res.status(400).json({ message: `Suggestion already ${dosageSuggestion.status}` });
    }

    // Check expiry
    if (new Date() > dosageSuggestion.expiresAt) {
      dosageSuggestion.status = 'expired';
      await dosageSuggestion.save();
      return res.status(400).json({ message: 'Suggestion has expired' });
    }

    const before = dosageSuggestion.toObject();

    // Update suggestion
    dosageSuggestion.status = 'approved';
    dosageSuggestion.reviewedAt = new Date();
    dosageSuggestion.doctorNotes = notes;
    
    // Allow doctor to modify amount
    if (modifiedAmount !== undefined && modifiedAmount !== dosageSuggestion.suggestion.amount) {
      dosageSuggestion.suggestion.amount = modifiedAmount;
      dosageSuggestion.suggestion.reasoning += `\n\n[Doctor Modified: Adjusted dose to ${modifiedAmount} ${dosageSuggestion.suggestion.units}]`;
    }

    await dosageSuggestion.save();

    // Notify patient
    await createNotification({
      userId: dosageSuggestion.patientId,
      userEmail: dosageSuggestion.patientEmail,
      type: 'dosage_suggestion_approved',
      title: '✅ Dosage Suggestion Approved',
      message: `Dr. ${req.user.name || doctorEmail} approved your dosage suggestion: ${dosageSuggestion.suggestion.amount} ${dosageSuggestion.suggestion.units}`,
      data: {
        dosageSuggestionId: dosageSuggestion._id,
        suggestion: dosageSuggestion.suggestion,
        doctorNotes: notes
      }
    });

    // Audit log
    await createAuditLog({
      actorId: doctorId,
      actorEmail: doctorEmail,
      actorRole: 'doctor',
      action: 'approve',
      resourceType: 'DosageSuggestion',
      resourceId: dosageSuggestion._id,
      targetUserId: dosageSuggestion.patientId,
      targetUserEmail: dosageSuggestion.patientEmail,
      before,
      after: dosageSuggestion.toObject(),
      metadata: { notes, modifiedAmount },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical'
    });

    res.json({
      message: 'Dosage suggestion approved successfully',
      dosageSuggestion
    });

  } catch (error) {
    console.error('Error approving dosage suggestion:', error);
    res.status(500).json({ message: 'Server error approving suggestion', error: error.message });
  }
};

// Doctor rejects dosage suggestion
exports.rejectDosageSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const doctorEmail = req.user.email;
    const { reason } = req.body;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can reject dosage suggestions' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const dosageSuggestion = await DosageSuggestion.findById(id);
    if (!dosageSuggestion) {
      return res.status(404).json({ message: 'Dosage suggestion not found' });
    }

    if (dosageSuggestion.doctorEmail !== doctorEmail) {
      return res.status(403).json({ message: 'Not authorized to review this suggestion' });
    }

    if (dosageSuggestion.status !== 'pending') {
      return res.status(400).json({ message: `Suggestion already ${dosageSuggestion.status}` });
    }

    const before = dosageSuggestion.toObject();

    dosageSuggestion.status = 'rejected';
    dosageSuggestion.reviewedAt = new Date();
    dosageSuggestion.doctorNotes = reason;
    await dosageSuggestion.save();

    // Notify patient
    await createNotification({
      userId: dosageSuggestion.patientId,
      userEmail: dosageSuggestion.patientEmail,
      type: 'dosage_suggestion_rejected',
      title: '❌ Dosage Suggestion Not Approved',
      message: `Dr. ${req.user.name || doctorEmail} did not approve the AI dosage suggestion.`,
      data: {
        dosageSuggestionId: dosageSuggestion._id,
        reason
      }
    });

    // Audit log
    await createAuditLog({
      actorId: doctorId,
      actorEmail: doctorEmail,
      actorRole: 'doctor',
      action: 'reject',
      resourceType: 'DosageSuggestion',
      resourceId: dosageSuggestion._id,
      targetUserId: dosageSuggestion.patientId,
      targetUserEmail: dosageSuggestion.patientEmail,
      before,
      after: dosageSuggestion.toObject(),
      metadata: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high'
    });

    res.json({
      message: 'Dosage suggestion rejected',
      dosageSuggestion
    });

  } catch (error) {
    console.error('Error rejecting dosage suggestion:', error);
    res.status(500).json({ message: 'Server error rejecting suggestion', error: error.message });
  }
};

// Patient applies approved dosage
exports.applyDosageSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const patientId = req.user.id;
    const patientEmail = req.user.email;

    if (req.user.role !== 'patient') {
      return res.status(403).json({ message: 'Only patients can apply dosage suggestions' });
    }

    const dosageSuggestion = await DosageSuggestion.findById(id);
    if (!dosageSuggestion) {
      return res.status(404).json({ message: 'Dosage suggestion not found' });
    }

    if (dosageSuggestion.patientEmail !== patientEmail) {
      return res.status(403).json({ message: 'Not authorized to apply this suggestion' });
    }

    if (dosageSuggestion.status !== 'approved') {
      return res.status(400).json({ message: 'Can only apply approved suggestions' });
    }

    if (new Date() > dosageSuggestion.expiresAt) {
      dosageSuggestion.status = 'expired';
      await dosageSuggestion.save();
      return res.status(400).json({ message: 'Suggestion has expired' });
    }

    const before = dosageSuggestion.toObject();

    dosageSuggestion.status = 'applied';
    dosageSuggestion.appliedAt = new Date();
    await dosageSuggestion.save();

    // Record insulin dose in health data
    await HealthData.create({
      userId: patientId,
      userEmail: patientEmail,
      readingDate: new Date(),
      insulinTaken: {
        amount: dosageSuggestion.suggestion.amount,
        type: dosageSuggestion.suggestion.type,
        time: new Date()
      },
      notes: `Applied AI-suggested dosage (approved by doctor): ${dosageSuggestion.suggestion.amount} ${dosageSuggestion.suggestion.units}`,
      deviceSource: 'manual'
    });

    // Notify doctor
    await createNotification({
      userId: dosageSuggestion.doctorId,
      userEmail: dosageSuggestion.doctorEmail,
      type: 'dosage_suggestion_applied',
      title: '💉 Patient Applied Dosage',
      message: `${req.user.name || patientEmail} applied the approved dosage suggestion: ${dosageSuggestion.suggestion.amount} ${dosageSuggestion.suggestion.units}`,
      data: {
        dosageSuggestionId: dosageSuggestion._id,
        patientEmail
      }
    });

    // Audit log
    await createAuditLog({
      actorId: patientId,
      actorEmail: patientEmail,
      actorRole: 'patient',
      action: 'apply',
      resourceType: 'DosageSuggestion',
      resourceId: dosageSuggestion._id,
      before,
      after: dosageSuggestion.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high'
    });

    res.json({
      message: 'Dosage applied and recorded successfully',
      dosageSuggestion
    });

  } catch (error) {
    console.error('Error applying dosage suggestion:', error);
    res.status(500).json({ message: 'Server error applying suggestion', error: error.message });
  }
};

// Get dosage suggestions (filtered by role)
exports.getDosageSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { status, patientEmail } = req.query;

    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientEmail = userEmail;
    } else if (req.user.role === 'doctor') {
      filter.doctorEmail = userEmail;
      if (patientEmail) filter.patientEmail = patientEmail;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (status) filter.status = status;

    const suggestions = await DosageSuggestion.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ suggestions });

  } catch (error) {
    console.error('Error fetching dosage suggestions:', error);
    res.status(500).json({ message: 'Server error fetching suggestions', error: error.message });
  }
};

// Get single dosage suggestion
exports.getDosageSuggestionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;

    const suggestion = await DosageSuggestion.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .populate('modelRunId');

    if (!suggestion) {
      return res.status(404).json({ message: 'Dosage suggestion not found' });
    }

    // Verify access
    if (suggestion.patientEmail !== userEmail && suggestion.doctorEmail !== userEmail) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ suggestion });

  } catch (error) {
    console.error('Error fetching dosage suggestion:', error);
    res.status(500).json({ message: 'Server error fetching suggestion', error: error.message });
  }
};
