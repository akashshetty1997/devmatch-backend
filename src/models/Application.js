/**
 * @file src/models/Application.js
 * @description Job Application model - Developer applies to JobPost
 * Many-to-Many: Developer ↔ JobPost via Application
 *
 * MongoDB Best Practices:
 * - ObjectId refs for relations
 * - Compound unique index (one application per developer per job)
 * - Status tracking with timestamps
 */

const mongoose = require("mongoose");
const { APPLICATION_STATUS } = require("../config/constants");

const applicationSchema = new mongoose.Schema(
  {
    // Developer who applied
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Developer is required"],
      index: true,
    },

    // Job being applied to
    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: [true, "Job post is required"],
      index: true,
    },

    // Application status
    status: {
      type: String,
      enum: {
        values: Object.values(APPLICATION_STATUS),
        message: "Invalid application status",
      },
      default: APPLICATION_STATUS.PENDING,
      index: true,
    },

    // Cover letter / message
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [3000, "Cover letter cannot exceed 3000 characters"],
      default: "",
    },

    // Optional: Link to resume/portfolio
    resumeUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // Recruiter notes (private, only recruiter sees)
    recruiterNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // Status history for tracking
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(APPLICATION_STATUS),
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        note: String,
      },
    ],

    // When application was submitted
    appliedAt: {
      type: Date,
      default: Date.now,
    },

    // When last status change occurred
    lastStatusChangeAt: {
      type: Date,
      default: null,
    },

    // Skills match percentage (calculated on creation)
    skillsMatchPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== INDEXES ====================

// One application per developer per job
applicationSchema.index({ developer: 1, jobPost: 1 }, { unique: true });

// For recruiter to see all applications for their job
applicationSchema.index({ jobPost: 1, status: 1, appliedAt: -1 });

// For developer to see their applications
applicationSchema.index({ developer: 1, appliedAt: -1 });

// For filtering by status across jobs
applicationSchema.index({ status: 1, appliedAt: -1 });

// ==================== HOOKS ====================

/**
 * Pre-save: Update status history and lastStatusChangeAt
 */
applicationSchema.pre("save", function (next) {
  if (this.isNew) {
    // Initial status entry
    this.statusHistory.push({
      status: this.status,
      changedAt: new Date(),
    });
  } else if (this.isModified("status")) {
    this.lastStatusChangeAt = new Date();
    // Don't auto-push to history here; let service handle it with changedBy
  }
  next();
});

// ==================== METHODS ====================

/**
 * Update status with history tracking
 * @param {string} newStatus
 * @param {ObjectId} changedBy - User who changed status
 * @param {string} note - Optional note
 */
applicationSchema.methods.updateStatus = async function (
  newStatus,
  changedBy,
  note = ""
) {
  if (!Object.values(APPLICATION_STATUS).includes(newStatus)) {
    throw new Error("Invalid status");
  }

  this.status = newStatus;
  this.lastStatusChangeAt = new Date();
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy,
    note,
  });

  await this.save();
};

// ==================== STATICS ====================

/**
 * Apply to job (idempotent - returns existing if already applied)
 * @param {ObjectId} developerId
 * @param {ObjectId} jobPostId
 * @param {Object} data - { coverLetter, resumeUrl, skillsMatchPercent }
 */
applicationSchema.statics.apply = async function (
  developerId,
  jobPostId,
  data = {}
) {
  try {
    const application = await this.create({
      developer: developerId,
      jobPost: jobPostId,
      coverLetter: data.coverLetter || "",
      resumeUrl: data.resumeUrl || null,
      skillsMatchPercent: data.skillsMatchPercent || 0,
    });
    return { application, created: true };
  } catch (error) {
    if (error.code === 11000) {
      const existing = await this.findOne({
        developer: developerId,
        jobPost: jobPostId,
      });
      return { application: existing, created: false };
    }
    throw error;
  }
};

/**
 * Get applications for a job (for recruiter)
 * @param {ObjectId} jobPostId
 * @param {Object} options - { status, skip, limit }
 */
applicationSchema.statics.getByJob = function (jobPostId, options = {}) {
  const query = { jobPost: jobPostId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate({
      path: "developer",
      select: "username avatar role",
      populate: {
        path: "developerProfile",
        select: "headline skills yearsOfExperience location",
      },
    })
    .sort({ appliedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get applications by developer
 * @param {ObjectId} developerId
 * @param {Object} options
 */
applicationSchema.statics.getByDeveloper = function (
  developerId,
  options = {}
) {
  const query = { developer: developerId };

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate("jobPost", "title companyName location workType isActive")
    .sort({ appliedAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Check if developer already applied
 * @param {ObjectId} developerId
 * @param {ObjectId} jobPostId
 */
applicationSchema.statics.hasApplied = async function (developerId, jobPostId) {
  const application = await this.findOne({
    developer: developerId,
    jobPost: jobPostId,
  });
  return !!application;
};

/**
 * Get application stats for a job
 * @param {ObjectId} jobPostId
 */
applicationSchema.statics.getJobStats = async function (jobPostId) {
  const stats = await this.aggregate([
    { $match: { jobPost: jobPostId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  // Convert to object
  const result = {
    total: 0,
    [APPLICATION_STATUS.PENDING]: 0,
    [APPLICATION_STATUS.REVIEWED]: 0,
    [APPLICATION_STATUS.SHORTLISTED]: 0,
    [APPLICATION_STATUS.REJECTED]: 0,
  };

  stats.forEach((s) => {
    result[s._id] = s.count;
    result.total += s.count;
  });

  return result;
};

const Application = mongoose.model("Application", applicationSchema);

module.exports = Application;
