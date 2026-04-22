const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorExpertise: {
    type: String,
    required: true,
    trim: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    startTime: {
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'declined', 'rescheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  zoomMeetingLink: {
    type: String,
    default: ''
  },
  zoomMeetingId: {
    type: String,
    default: ''
  },
  zoomPassword: {
    type: String,
    default: ''
  },
  zoomHostUrl: {
    type: String,
    default: ''
  },
  rescheduleRequest: {
    isRescheduled: {
      type: Boolean,
      default: false
    },
    newDate: {
      type: Date
    },
    newTimeSlot: {
      startTime: String,
      endTime: String
    },
    requestedBy: {
      type: String,
      enum: ['doctor', 'patient']
    },
    reason: {
      type: String,
      trim: true
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  cancelledBy: {
    type: String,
    enum: ['doctor', 'patient', 'admin']
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  completedAt: {
    type: Date
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
appointmentSchema.index({ patientEmail: 1 });
appointmentSchema.index({ doctorEmail: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1 });

// Compound index for efficient filtering
appointmentSchema.index({ doctorId: 1, status: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
