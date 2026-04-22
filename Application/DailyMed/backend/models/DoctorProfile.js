const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  slots: [{
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  }]
});

const doctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  expertise: {
    type: String,
    required: [true, 'Expertise/Specialization is required'],
    trim: true,
    // e.g., "Cardiologist", "General Physician", "Surgeon", etc.
  },
  location: {
    city: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  about: {
    type: String,
    required: [true, 'About section is required'],
    trim: true,
    maxlength: [1000, 'About section cannot exceed 1000 characters']
  },
  qualifications: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: 0,
    // Years of experience
  },
  consultationFee: {
    type: Number,
    min: 0,
    default: 0
  },
  availability: [availabilitySlotSchema],
  profilePicture: {
    type: String,
    default: ''
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
doctorProfileSchema.index({ userEmail: 1 });
doctorProfileSchema.index({ userId: 1 });
doctorProfileSchema.index({ expertise: 1 });
doctorProfileSchema.index({ isActive: 1 });

// Check if profile is complete
doctorProfileSchema.pre('save', function(next) {
  this.isProfileComplete = !!(
    this.fullName &&
    this.expertise &&
    this.location.city &&
    this.location.country &&
    this.about
  );
  next();
});

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
