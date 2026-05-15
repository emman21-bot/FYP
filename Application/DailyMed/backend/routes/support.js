const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  getTicketDetails,
  addMessage,
  getAllTickets,
  updateTicketStatus,
  assignTicket,
  getSupportStats
} = require('../controllers/supportController');
const { protect } = require('../middlewares/auth');

// User routes
router.post('/tickets', protect, createTicket);
router.get('/tickets', protect, getUserTickets);
router.get('/tickets/:id', protect, getTicketDetails);
router.post('/tickets/:id/messages', protect, addMessage);

// Admin routes
router.get('/admin/tickets', protect, getAllTickets);
router.put('/admin/tickets/:id/status', protect, updateTicketStatus);
router.put('/admin/tickets/:id/assign', protect, assignTicket);
router.get('/admin/stats', protect, getSupportStats);

module.exports = router;
