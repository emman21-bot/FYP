const ThresholdConfig = require('../models/ThresholdConfig');
const { createAuditLog } = require('../utils/auditHelper');

// Create or update threshold configuration
exports.upsertThreshold = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { metricType, minValue, maxValue, unit, alertEnabled, notificationPreferences } = req.body;

    // Validate required fields
    if (!metricType || minValue === undefined || maxValue === undefined) {
      return res.status(400).json({ message: 'metricType, minValue, and maxValue are required' });
    }

    // Validate min < max
    if (minValue >= maxValue) {
      return res.status(400).json({ message: 'minValue must be less than maxValue' });
    }

    // Check if threshold already exists
    let threshold = await ThresholdConfig.findOne({ userId, metricType });

    if (threshold) {
      // Update existing
      const before = threshold.toObject();
      
      threshold.minValue = minValue;
      threshold.maxValue = maxValue;
      if (unit !== undefined) threshold.unit = unit;
      if (alertEnabled !== undefined) threshold.alertEnabled = alertEnabled;
      if (notificationPreferences !== undefined) {
        threshold.notificationPreferences = notificationPreferences;
      }

      await threshold.save();

      // Audit log
      await createAuditLog({
        actorId: userId,
        actorEmail: userEmail,
        actorRole: req.user.role,
        action: 'update',
        resourceType: 'ThresholdConfig',
        resourceId: threshold._id,
        before,
        after: threshold.toObject(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'low'
      });

      res.json({
        message: 'Threshold updated successfully',
        threshold
      });
    } else {
      // Create new
      threshold = await ThresholdConfig.create({
        userId,
        userEmail,
        metricType,
        minValue,
        maxValue,
        unit,
        alertEnabled: alertEnabled !== undefined ? alertEnabled : true,
        notificationPreferences: notificationPreferences || { inApp: true, email: false, push: true }
      });

      // Audit log
      await createAuditLog({
        actorId: userId,
        actorEmail: userEmail,
        actorRole: req.user.role,
        action: 'create',
        resourceType: 'ThresholdConfig',
        resourceId: threshold._id,
        after: threshold.toObject(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'low'
      });

      res.status(201).json({
        message: 'Threshold created successfully',
        threshold
      });
    }
  } catch (error) {
    console.error('Error upserting threshold:', error);
    res.status(500).json({ message: 'Server error upserting threshold', error: error.message });
  }
};

// Get all thresholds for current user
exports.getThresholds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricType, alertEnabled } = req.query;

    const filter = { userId };
    if (metricType) filter.metricType = metricType;
    if (alertEnabled !== undefined) filter.alertEnabled = alertEnabled === 'true';

    const thresholds = await ThresholdConfig.find(filter).sort({ metricType: 1 });

    res.json({ thresholds });
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    res.status(500).json({ message: 'Server error fetching thresholds', error: error.message });
  }
};

// Get single threshold by metric type
exports.getThresholdByMetric = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricType } = req.params;

    const threshold = await ThresholdConfig.findOne({ userId, metricType });
    if (!threshold) {
      return res.status(404).json({ message: 'Threshold configuration not found' });
    }

    res.json({ threshold });
  } catch (error) {
    console.error('Error fetching threshold:', error);
    res.status(500).json({ message: 'Server error fetching threshold', error: error.message });
  }
};

// Delete threshold configuration
exports.deleteThreshold = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const { metricType } = req.params;

    const threshold = await ThresholdConfig.findOne({ userId, metricType });
    if (!threshold) {
      return res.status(404).json({ message: 'Threshold configuration not found' });
    }

    const before = threshold.toObject();
    await threshold.deleteOne();

    // Audit log
    await createAuditLog({
      actorId: userId,
      actorEmail: userEmail,
      actorRole: req.user.role,
      action: 'delete',
      resourceType: 'ThresholdConfig',
      resourceId: threshold._id,
      before,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'low'
    });

    res.json({ message: 'Threshold configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting threshold:', error);
    res.status(500).json({ message: 'Server error deleting threshold', error: error.message });
  }
};

// Toggle alert status
exports.toggleAlertStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricType } = req.params;

    const threshold = await ThresholdConfig.findOne({ userId, metricType });
    if (!threshold) {
      return res.status(404).json({ message: 'Threshold configuration not found' });
    }

    threshold.alertEnabled = !threshold.alertEnabled;
    await threshold.save();

    res.json({
      message: `Alert ${threshold.alertEnabled ? 'enabled' : 'disabled'} successfully`,
      threshold
    });
  } catch (error) {
    console.error('Error toggling alert status:', error);
    res.status(500).json({ message: 'Server error toggling alert status', error: error.message });
  }
};

// Check if a value violates user's threshold (utility function, also exported for use elsewhere)
exports.checkThresholdViolation = async (userId, metricType, value) => {
  try {
    const threshold = await ThresholdConfig.findOne({ 
      userId, 
      metricType, 
      alertEnabled: true 
    });

    if (!threshold) {
      return { violated: false };
    }

    const violated = value < threshold.minValue || value > threshold.maxValue;
    
    return {
      violated,
      threshold,
      violationType: value < threshold.minValue ? 'below_min' : value > threshold.maxValue ? 'above_max' : null,
      value,
      minValue: threshold.minValue,
      maxValue: threshold.maxValue
    };
  } catch (error) {
    console.error('Error checking threshold violation:', error);
    return { violated: false, error: error.message };
  }
};
