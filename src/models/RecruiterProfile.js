/**
 * @file src/models/RecruiterProfile.js
 * @description Recruiter profile - extends User with recruiter-specific fields
 * One-to-One relationship with User (where role = RECRUITER)
 */

const mongoose = require('mongoose');

const recruiterProfileSchema = new mongoose.Schema(
  {
    // Reference to User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Company information
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },

    companyWebsite: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    companyLogo: {
      type: String,
      default: null,
    },

    companyDescription: {
      type: String,
      trim: true,
      maxlength: [1000, 'Company description cannot exceed 1000 characters'],
      default: '',
    },

    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      default: null,
    },

    industry: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },

    // Recruiter's position in company
    positionTitle: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Recruiter',
    },

    // Hiring regions
    hiringRegions: [
      {
        type: String,
        trim: true,
      },
    ],

    // External links
    linkedinUrl: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    // Verification status (can be verified by Admin)
    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Profile visibility
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
recruiterProfileSchema.index({ companyName: 1 });
recruiterProfileSchema.index({ industry: 1 });
recruiterProfileSchema.index({ isVerified: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Get all job posts by this recruiter
 */
recruiterProfileSchema.virtual('jobPosts', {
  ref: 'JobPost',
  localField: 'user',
  foreignField: 'recruiter',
});

/**
 * Virtual: Count of active job posts
 */
recruiterProfileSchema.virtual('activeJobCount', {
  ref: 'JobPost',
  localField: 'user',
  foreignField: 'recruiter',
  count: true,
  match: { isActive: true },
});

// ==================== METHODS ====================

/**
 * Verify recruiter profile (Admin action)
 * @param {ObjectId} adminId - Admin who verified
 */
recruiterProfileSchema.methods.verify = async function (adminId) {
  this.isVerified = true;
  this.verifiedAt = new Date();
  this.verifiedBy = adminId;
  await this.save();
};

/**
 * Revoke verification
 */
recruiterProfileSchema.methods.revokeVerification = async function () {
  this.isVerified = false;
  this.verifiedAt = null;
  this.verifiedBy = null;
  await this.save();
};

// ==================== STATICS ====================

/**
 * Find recruiters by company name
 * @param {string} companyName
 */
recruiterProfileSchema.statics.findByCompany = function (companyName) {
  return this.find({
    companyName: { $regex: companyName, $options: 'i' },
    isPublic: true,
  }).populate('user', 'username avatar');
};

/**
 * Get verified recruiters
 */
recruiterProfileSchema.statics.findVerified = function () {
  return this.find({ isVerified: true, isPublic: true })
    .populate('user', 'username avatar')
    .sort({ createdAt: -1 });
};

const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);

module.exports = RecruiterProfile;