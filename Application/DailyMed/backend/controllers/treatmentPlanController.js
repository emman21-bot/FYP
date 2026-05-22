const TreatmentPlan = require('../models/TreatmentPlan');
const CareRelationship = require('../models/CareRelationship');
const { createNotification } = require('../utils/notificationHelper');
const { createAuditLog } = require('../utils/auditHelper');

// Doctor creates treatment plan for patient
exports.createTreatmentPlan = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctorEmail = req.user.email;
    const {
      patientEmail,
      insulinType,
      basalDose,
      bolusDose,
      carbRatio,
      correctionFactor,
      targetGlucoseRange,
      targetA1C,
      notes
    } = req.body;

    // Validate doctor role
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can create treatment plans' });
    }

    // Verify active care relationship
    const careRelationship = await CareRelationship.findOne({
      doctorEmail,
      patientEmail,
      status: 'active',
      'consentScopes.dosageSuggestions': true
    }).populate('patientId', 'name email');

    if (!careRelationship) {
      return res.status(403).json({ 
        message: 'No active care relationship with this patient or dosage consent not granted' 
      });
    }

    // Deactivate any existing active treatment plans
    await TreatmentPlan.updateMany(
      { patientId: careRelationship.patientId, doctorId, isActive: true },
      { isActive: false }
    );

    // Create new treatment plan
    const treatmentPlan = await TreatmentPlan.create({
      patientId: careRelationship.patientId,
      patientEmail,
      doctorId,
      doctorEmail,
      insulinType,
      basalDose,
      bolusDose,
      carbRatio,
      correctionFactor,
      targetGlucoseRange,
      targetA1C,
      notes,
      version: 1,
      isActive: true,
      effectiveFrom: new Date()
    });

    // Notify patient
    await createNotification({
      userId: careRelationship.patientId,
      userEmail: patientEmail,
      type: 'treatment_plan_created',
      title: '📋 New Treatment Plan',
      message: `Dr. ${req.user.name || doctorEmail} created a new treatment plan for you.`,
      data: {
        treatmentPlanId: treatmentPlan._id,
        insulinType,
        targetGlucoseRange
      }
    });

    // Audit log
    await createAuditLog({
      actorId: doctorId,
      actorEmail: doctorEmail,
      actorRole: 'doctor',
      action: 'create',
      resourceType: 'TreatmentPlan',
      resourceId: treatmentPlan._id,
      targetUserId: careRelationship.patientId,
      targetUserEmail: patientEmail,
      after: treatmentPlan.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical'
    });

    res.status(201).json({
      message: 'Treatment plan created successfully',
      treatmentPlan
    });

  } catch (error) {
    console.error('Error creating treatment plan:', error);
    res.status(500).json({ message: 'Server error creating treatment plan', error: error.message });
  }
};

// Update treatment plan (creates new version)
exports.updateTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const doctorEmail = req.user.email;
    const {
      insulinType,
      basalDose,
      bolusDose,
      carbRatio,
      correctionFactor,
      targetGlucoseRange,
      targetA1C,
      notes
    } = req.body;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can update treatment plans' });
    }

    const currentPlan = await TreatmentPlan.findOne({ _id: id, doctorId });
    if (!currentPlan) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }

    if (!currentPlan.isActive) {
      return res.status(400).json({ message: 'Cannot update inactive treatment plan' });
    }

    const before = currentPlan.toObject();

    // Deactivate current plan
    currentPlan.isActive = false;
    await currentPlan.save();

    // Create new version
    const newPlan = await TreatmentPlan.create({
      patientId: currentPlan.patientId,
      patientEmail: currentPlan.patientEmail,
      doctorId,
      doctorEmail,
      insulinType: insulinType || currentPlan.insulinType,
      basalDose: basalDose !== undefined ? basalDose : currentPlan.basalDose,
      bolusDose: bolusDose !== undefined ? bolusDose : currentPlan.bolusDose,
      carbRatio: carbRatio !== undefined ? carbRatio : currentPlan.carbRatio,
      correctionFactor: correctionFactor !== undefined ? correctionFactor : currentPlan.correctionFactor,
      targetGlucoseRange: targetGlucoseRange || currentPlan.targetGlucoseRange,
      targetA1C: targetA1C !== undefined ? targetA1C : currentPlan.targetA1C,
      notes: notes || currentPlan.notes,
      version: currentPlan.version + 1,
      isActive: true,
      effectiveFrom: new Date()
    });

    // Notify patient
    await createNotification({
      userId: currentPlan.patientId,
      userEmail: currentPlan.patientEmail,
      type: 'treatment_plan_updated',
      title: '📋 Treatment Plan Updated',
      message: `Dr. ${req.user.name || doctorEmail} updated your treatment plan.`,
      data: {
        treatmentPlanId: newPlan._id,
        previousVersion: currentPlan.version,
        newVersion: newPlan.version
      }
    });

    // Audit log
    await createAuditLog({
      actorId: doctorId,
      actorEmail: doctorEmail,
      actorRole: 'doctor',
      action: 'update',
      resourceType: 'TreatmentPlan',
      resourceId: newPlan._id,
      targetUserId: currentPlan.patientId,
      targetUserEmail: currentPlan.patientEmail,
      before,
      after: newPlan.toObject(),
      metadata: { oldVersion: currentPlan.version, newVersion: newPlan.version },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'critical'
    });

    res.json({
      message: 'Treatment plan updated successfully',
      treatmentPlan: newPlan
    });

  } catch (error) {
    console.error('Error updating treatment plan:', error);
    res.status(500).json({ message: 'Server error updating treatment plan', error: error.message });
  }
};

// Get active treatment plan for patient
exports.getActiveTreatmentPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { patientEmail } = req.query;

    let filter = { isActive: true };

    if (req.user.role === 'patient') {
      filter.patientEmail = userEmail;
    } else if (req.user.role === 'doctor') {
      if (!patientEmail) {
        return res.status(400).json({ message: 'patientEmail required for doctors' });
      }
      filter.doctorEmail = userEmail;
      filter.patientEmail = patientEmail;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const treatmentPlan = await TreatmentPlan.findOne(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    if (!treatmentPlan) {
      return res.status(404).json({ message: 'No active treatment plan found' });
    }

    res.json({ treatmentPlan });

  } catch (error) {
    console.error('Error fetching treatment plan:', error);
    res.status(500).json({ message: 'Server error fetching treatment plan', error: error.message });
  }
};

// Get treatment plan history
exports.getTreatmentPlanHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { patientEmail } = req.query;

    let filter = {};

    if (req.user.role === 'patient') {
      filter.patientEmail = userEmail;
    } else if (req.user.role === 'doctor') {
      if (!patientEmail) {
        return res.status(400).json({ message: 'patientEmail required for doctors' });
      }
      filter.doctorEmail = userEmail;
      filter.patientEmail = patientEmail;
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    const treatmentPlans = await TreatmentPlan.find(filter)
      .sort({ version: -1 })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');

    res.json({ treatmentPlans });

  } catch (error) {
    console.error('Error fetching treatment plan history:', error);
    res.status(500).json({ message: 'Server error fetching history', error: error.message });
  }
};

// Deactivate treatment plan
exports.deactivateTreatmentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = req.user.id;
    const doctorEmail = req.user.email;

    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Only doctors can deactivate treatment plans' });
    }

    const treatmentPlan = await TreatmentPlan.findOne({ _id: id, doctorId });
    if (!treatmentPlan) {
      return res.status(404).json({ message: 'Treatment plan not found' });
    }

    if (!treatmentPlan.isActive) {
      return res.status(400).json({ message: 'Treatment plan already inactive' });
    }

    const before = treatmentPlan.toObject();
    treatmentPlan.isActive = false;
    await treatmentPlan.save();

    // Notify patient
    await createNotification({
      userId: treatmentPlan.patientId,
      userEmail: treatmentPlan.patientEmail,
      type: 'treatment_plan_deactivated',
      title: '📋 Treatment Plan Deactivated',
      message: `Dr. ${req.user.name || doctorEmail} deactivated your treatment plan.`,
      data: {
        treatmentPlanId: treatmentPlan._id
      }
    });

    // Audit log
    await createAuditLog({
      actorId: doctorId,
      actorEmail: doctorEmail,
      actorRole: 'doctor',
      action: 'update',
      resourceType: 'TreatmentPlan',
      resourceId: treatmentPlan._id,
      targetUserId: treatmentPlan.patientId,
      targetUserEmail: treatmentPlan.patientEmail,
      before,
      after: treatmentPlan.toObject(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'high'
    });

    res.json({
      message: 'Treatment plan deactivated successfully',
      treatmentPlan
    });

  } catch (error) {
    console.error('Error deactivating treatment plan:', error);
    res.status(500).json({ message: 'Server error deactivating plan', error: error.message });
  }
};
