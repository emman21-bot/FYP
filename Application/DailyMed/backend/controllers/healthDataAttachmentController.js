const HealthDataAttachment = require('../models/HealthDataAttachment');
const HealthData = require('../models/HealthData');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const storageHelper = require('../utils/storage');

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/health-attachments');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter - only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
  }
};

// Multer upload instance
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Calculate file checksum
const calculateChecksum = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

// Upload attachment
exports.uploadAttachment = [
  upload.single('file'),
  async (req, res) => {
    try {
      const { healthDataId } = req.params;
      const userId = req.user.id;
      const userEmail = req.user.email;

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Verify health data exists and belongs to user
      const healthData = await HealthData.findOne({ _id: healthDataId, userId });
      if (!healthData) {
        // Clean up uploaded file
        await fs.unlink(req.file.path);
        return res.status(404).json({ message: 'Health data record not found' });
      }

      // Calculate checksum
      const checksum = await calculateChecksum(req.file.path);

      // Upload to configured storage (S3/MinIO/local)
      const destKey = `health-attachments/${Date.now()}-${req.file.filename}`;
      let uploadResult;
      try {
        uploadResult = await storageHelper.uploadFile(req.file.path, destKey, req.file.mimetype);
      } catch (uploadErr) {
        // Clean up local file
        await fs.unlink(req.file.path).catch(() => {});
        throw uploadErr;
      }

      // Delete local temp file if uploaded remotely
      if (uploadResult.provider && uploadResult.provider !== 'local') {
        await fs.unlink(req.file.path).catch(() => {});
      }

      // Create attachment record using model fields
      const attachment = await HealthDataAttachment.create({
        healthDataId,
        userId,
        userEmail,
        fileName: req.file.originalname,
        fileType: 'other',
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        fileUrl: uploadResult.url,
        fileKey: uploadResult.key,
        checksum,
        description: ''
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        attachment: {
          id: attachment._id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
          uploadedAt: attachment.createdAt
        }
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      // Clean up file if exists
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      res.status(500).json({ message: 'Server error uploading file', error: error.message });
    }
  }
];

// Get all attachments for a health data record
exports.getAttachments = async (req, res) => {
  try {
    const { healthDataId } = req.params;
    const userId = req.user.id;

    // Verify health data belongs to user or user is their doctor
    const healthData = await HealthData.findById(healthDataId);
    if (!healthData) {
      return res.status(404).json({ message: 'Health data record not found' });
    }

    // Check access permission
    if (healthData.userId.toString() !== userId && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attachments = await HealthDataAttachment.find({ healthDataId })
      .select('-fileUrl -fileKey -checksum') // Don't expose internal paths
      .sort({ createdAt: -1 });

    res.json({ attachments });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ message: 'Server error fetching attachments', error: error.message });
  }
};

// Download attachment
exports.downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const attachment = await HealthDataAttachment.findById(id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Verify access
    const healthData = await HealthData.findById(attachment.healthDataId);
    if (!healthData) {
      return res.status(404).json({ message: 'Associated health data not found' });
    }

    if (healthData.userId.toString() !== userId && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // If stored locally, download from file system
    const localUploadsPath = path.join(__dirname, '../../uploads');
    if (attachment.fileUrl && attachment.fileUrl.startsWith(localUploadsPath)) {
      try {
        await fs.access(attachment.fileUrl);
        return res.download(attachment.fileUrl, attachment.fileName);
      } catch {
        return res.status(404).json({ message: 'File not found on server' });
      }
    }

    // Otherwise stream from storage helper (S3/MinIO)
    try {
      const stream = await storageHelper.getDownloadStream(attachment.fileKey || attachment.fileUrl);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
      res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
      stream.pipe(res);
    } catch (err) {
      console.error('Error streaming file from storage:', err);
      return res.status(500).json({ message: 'Error retrieving file', error: err.message });
    }
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: 'Server error downloading file', error: error.message });
  }
};

// Delete attachment
exports.deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const attachment = await HealthDataAttachment.findById(id);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Verify ownership
    if (attachment.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file from storage
    try {
      const localUploadsPath = path.join(__dirname, '../../uploads');
      if (attachment.fileUrl && attachment.fileUrl.startsWith(localUploadsPath)) {
        await fs.unlink(attachment.fileUrl).catch(() => {});
      } else {
        await storageHelper.deleteFile(attachment.fileKey || attachment.fileUrl).catch(() => {});
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue anyway to delete DB record
    }

    // Delete DB record
    await attachment.deleteOne();

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Server error deleting attachment', error: error.message });
  }
};

// Get attachment metadata by ID
exports.getAttachmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const attachment = await HealthDataAttachment.findById(id)
      .select('-fileUrl -fileKey -checksum');
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Verify access
    const healthData = await HealthData.findById(attachment.healthDataId);
    if (!healthData) {
      return res.status(404).json({ message: 'Associated health data not found' });
    }

    if (healthData.userId.toString() !== userId && req.user.role !== 'doctor') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ attachment });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({ message: 'Server error fetching attachment', error: error.message });
  }
};
