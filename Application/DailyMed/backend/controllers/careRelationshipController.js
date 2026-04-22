const CareRelationship = require('../models/CareRelationship');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const { createNotification, notificationTemplates } = require('../utils/notificationHelper');
const { createAuditLog } = require('../utils/auditHelper');

// @desc    Request care relationship (Patient → Doctor)
// @route   POST /api/care-relationships
// @access  Private (Patient)
exports.requestCareRelationship = async (req, res) => {
  try {
    const { doctorId } = req.body;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }

    // Check if patient
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can request care relationships'
      });
    }

    // Get doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId, isActive: true });
    if (!doctorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found or inactive'
      });
    }

    // Check if relationship already exists
    const existing = await CareRelationship.findOne({
      patientId: req.user._id,
      doctorId: doctorId,
      status: { $in: ['requested', 'active'] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existing.status} relationship with this doctor`
      });
    }

    // Create relationship request
    const careRelationship = await CareRelationship.create({
      patientId: req.user._id,
      patientEmail: req.user.email,
      patientName: req.user.fullName || req.user.email.split('@')[0],
      doctorId: doctor._id,
      doctorEmail: doctor.email,
      doctorName: doctor.fullName || doctor.email.split('@')[0],
      status: 'requested'
    });

    // Notify doctor
    try {
      await createNotification({
        userId: doctor._id,
        userEmail: doctor.email,
        type: 'general',
        title: 'New Patient Request',
        message: `${careRelationship.patientName} has requested to hire you as their doctor. Review their medical history and respond.`,
        data: { careRelationshipId: careRelationship._id, patientId: req.user._id }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Audit log
    await createAuditLog({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'REQUEST_CARE_RELATIONSHIP',
      resourceType: 'CareRelationship',
      resourceId: careRelationship._id,
      targetUserId: doctor._id,
      targetUserEmail: doctor.email,
      metadata: { doctorName: careRelationship.doctorName }
    });

    res.status(201).json({
      success: true,
      message: 'Care relationship request sent successfully',
      data: careRelationship
    });
  } catch (error) {
    console.error('Error requesting care relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Approve care relationship (Doctor)
// @route   PATCH /api/care-relationships/:id/approve
// @access  Private (Doctor)
exports.approveCareRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const careRelationship = await CareRelationship.findById(id);

    if (!careRelationship) {
      return res.status(404).json({
        success: false,
        message: 'Care relationship not found'
      });
    }

    // Authorization
    if (careRelationship.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (careRelationship.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve relationship with status: ${careRelationship.status}`
      });
    }

    careRelationship.status = 'active';
    careRelationship.approvedAt = new Date();
    if (notes) careRelationship.notes = notes;

    await careRelationship.save();

    // Assign doctor to patient in User model
    await User.findByIdAndUpdate(careRelationship.patientId, {
      assignedDoctorEmail: careRelationship.doctorEmail,
      assignedDoctorId: careRelationship.doctorId
    });

    // Notify patient
    try {
      await createNotification({
        userId: careRelationship.patientId,
        userEmail: careRelationship.patientEmail,
        type: 'general',
        title: 'Doctor Approved Request',
        message: `Dr. ${careRelationship.doctorName} has approved your request. You can now receive AI-powered dosage suggestions and health insights.`,
        data: { careRelationshipId: careRelationship._id }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Audit log
    await createAuditLog({
      actorId: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'APPROVE_CARE_RELATIONSHIP',
      resourceType: 'CareRelationship',
      resourceId: careRelationship._id,
      targetUserId: careRelationship.patientId,
      targetUserEmail: careRelationship.patientEmail,
      metadata: { notes }
    });

    res.status(200).json({
      success: true,
      message: 'Care relationship approved',
      data: careRelationship
    });
  } catch (error) {
    console.error('Error approving care relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reject care relationship (Doctor)
// @route   PATCH /api/care-relationships/:id/reject
// @access  Private (Doctor)
exports.rejectCareRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const careRelationship = await CareRelationship.findById(id);

    if (!careRelationship) {
      return res.status(404).json({
        success: false,
        message: 'Care relationship not found'
      });
    }

    if (careRelationship.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (careRelationship.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject relationship with status: ${careRelationship.status}`
      });
    }

    careRelationship.status = 'terminated';
    careRelationship.terminatedAt = new Date();
    careRelationship.terminationReason = reason || '';

    await careRelationship.save();

    // Notify patient
    try {
      await createNotification({
        userId: careRelationship.patientId,
        userEmail: careRelationship.patientEmail,
        type: 'general',
        title: 'Request Declined',
        message: `Dr. ${careRelationship.doctorName} has declined your request.${reason ? ' Reason: ' + reason : ''}`,
        data: { careRelationshipId: careRelationship._id }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Care relationship rejected',
      data: careRelationship
    });
  } catch (error) {
    console.error('Error rejecting care relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get care relationships
// @route   GET /api/care-relationships
// @access  Private
exports.getCareRelationships = async (req, res) => {
  try {
    const { status } = req.query;

    let query = {};

    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized role'
      });
    }

    if (status) {
      query.status = status;
    }

    const relationships = await CareRelationship.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: relationships.length,
      data: relationships
    });
  } catch (error) {
    console.error('Error getting care relationships:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Terminate care relationship
// @route   DELETE /api/care-relationships/:id
// @access  Private (Patient or Doctor)
exports.terminateCareRelationship = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const careRelationship = await CareRelationship.findById(id);

    if (!careRelationship) {
      return res.status(404).json({
        success: false,
        message: 'Care relationship not found'
      });
    }

    const isPatient = careRelationship.patientId.toString() === req.user._id.toString();
    const isDoctor = careRelationship.doctorId.toString() === req.user._id.toString();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    careRelationship.status = 'terminated';
    careRelationship.terminatedAt = new Date();
    careRelationship.terminationReason = reason || '';

    await careRelationship.save();

    // Notify the other party
    const otherUserId = isPatient ? careRelationship.doctorId : careRelationship.patientId;
    const otherUserEmail = isPatient ? careRelationship.doctorEmail : careRelationship.patientEmail;
    const initiatorName = isPatient ? careRelationship.patientName : careRelationship.doctorName;

    try {
      await createNotification({
        userId: otherUserId,
        userEmail: otherUserEmail,
        type: 'general',
        title: 'Care Relationship Terminated',
        message: `${initiatorName} has terminated the care relationship.${reason ? ' Reason: ' + reason : ''}`,
        data: { careRelationshipId: careRelationship._id }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(200).json({
      success: true,
      message: 'Care relationship terminated',
      data: careRelationship
    });
  } catch (error) {
    console.error('Error terminating care relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
