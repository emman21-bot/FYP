const AuditLog = require('../models/AuditLog');

exports.createAuditLog = async ({
  actorId,
  actorEmail,
  actorRole,
  action,
  resourceType,
  resourceId,
  targetUserId,
  targetUserEmail,
  before,
  after,
  metadata,
  ipAddress,
  userAgent,
  severity = 'medium'
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorEmail,
      actorRole,
      action,
      resourceType,
      resourceId,
      targetUserId,
      targetUserEmail,
      before,
      after,
      metadata,
      ipAddress,
      userAgent,
      severity
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging failure shouldn't break main flow
  }
};
