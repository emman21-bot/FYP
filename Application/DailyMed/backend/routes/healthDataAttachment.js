const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  uploadAttachment,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
  getAttachmentById
} = require('../controllers/healthDataAttachmentController');

// Upload attachment to health data record
router.post('/:healthDataId/attachments', protect, uploadAttachment);

// Get all attachments for health data record
router.get('/:healthDataId/attachments', protect, getAttachments);

// Get single attachment metadata
router.get('/attachments/:id', protect, getAttachmentById);

// Download attachment
router.get('/attachments/:id/download', protect, downloadAttachment);

// Delete attachment
router.delete('/attachments/:id', protect, deleteAttachment);

module.exports = router;
