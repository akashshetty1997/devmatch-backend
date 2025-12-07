/**
 * @file src/models/JobPost.js
 * @description Job posting model - created by recruiters
 * Domain Object 2: User-created content
 */

const mongoose = require("mongoose");
const { WORK_TYPES } = require("../config/constants");

const jobPostSchema = new mongoose.Schema(
  {
    // Recruiter who created the job
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Job title
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [100, "Job title cannot exceed 100 characters"],
    },

    // Company name (denormalized for quick access)
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 100,
    },

    // Job description
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    // Location
    location: {
      city: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      state: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      country: {
        type: String,
        trim: true,
        maxlength: 100,
      },
    },

    // Work type
    workType: {
      type: String,
      enum: {
        values: Object.values(WORK_TYPES),
        message: "Invalid work type",
      },
      required: [true, "Work type is required"],
    },

    // Required skills (skill slugs)
    requiredSkills: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Nice-to-have skills
    preferredSkills: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Experience requirements
    minYearsExperience: {
      type: Number,
      min: 0,
      max: 30,
      default: 0,
    },

    maxYearsExperience: {
      type: Number,
      min: 0,
      max: 50,
      default: null,
    },

    // Salary range (optional)
    salary: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
        maxlength: 3,
      },
      isVisible: {
        type: Boolean,
        default: false,
      },
    },

    // Employment type
    employmentType: {
      type: String,
      enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"],
      default: "FULL_TIME",
    },

    // Application settings
    applicationDeadline: {
      type: Date,
      default: null,
    },

    externalApplicationUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Featured/promoted job
    isFeatured: {
      type: Boolean,
      default: false,
    },

    // View count
    viewCount: {
      type: Number,
      default: 0,
    },

    // Linked example repos (optional)
    linkedRepos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RepoSnapshot",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
jobPostSchema.index({ title: "text", description: "text" });
jobPostSchema.index({ requiredSkills: 1 });
jobPostSchema.index({ workType: 1 });
jobPostSchema.index({ "location.country": 1, "location.city": 1 });
jobPostSchema.index({ isActive: 1, createdAt: -1 });
jobPostSchema.index({ isFeatured: 1, isActive: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Applications for this job
 */
jobPostSchema.virtual("applications", {
  ref: "Application",
  localField: "_id",
  foreignField: "jobPost",
});

/**
 * Virtual: Application count
 */
jobPostSchema.virtual("applicationCount", {
  ref: "Application",
  localField: "_id",
  foreignField: "jobPost",
  count: true,
});

/**
 * Virtual: Location string
 */
jobPostSchema.virtual("locationString").get(function () {
  const parts = [];
  if (this.location?.city) parts.push(this.location.city);
  if (this.location?.state) parts.push(this.location.state);
  if (this.location?.country) parts.push(this.location.country);
  return parts.join(", ") || "Remote";
});

/**
 * Virtual: Salary range string
 */
jobPostSchema.virtual("salaryString").get(function () {
  if (!this.salary?.isVisible || !this.salary?.min) return null;

  const formatSalary = (num) => {
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toString();
  };

  const currency = this.salary.currency || "USD";
  if (this.salary.max) {
    return `${currency} ${formatSalary(this.salary.min)} - ${formatSalary(
      this.salary.max
    )}`;
  }
  return `${currency} ${formatSalary(this.salary.min)}+`;
});

/**
 * Virtual: Is deadline passed
 */
jobPostSchema.virtual("isExpired").get(function () {
  if (!this.applicationDeadline) return false;
  return new Date() > this.applicationDeadline;
});

// ==================== METHODS ====================

/**
 * Increment view count
 */
jobPostSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
};

/**
 * Activate job post
 */
jobPostSchema.methods.activate = async function () {
  this.isActive = true;
  await this.save();
};

/**
 * Deactivate job post
 */
jobPostSchema.methods.deactivate = async function () {
  this.isActive = false;
  await this.save();
};

/**
 * Calculate skills match percentage with a developer
 * @param {string[]} developerSkills - Developer's skills
 * @returns {number} Match percentage (0-100)
 */
jobPostSchema.methods.calculateSkillsMatch = function (developerSkills) {
  if (!this.requiredSkills.length) return 100;
  if (!developerSkills.length) return 0;

  const devSkillsLower = developerSkills.map((s) => s.toLowerCase());
  const matchedSkills = this.requiredSkills.filter((skill) =>
    devSkillsLower.includes(skill.toLowerCase())
  );

  return Math.round((matchedSkills.length / this.requiredSkills.length) * 100);
};

// ==================== STATICS ====================

/**
 * Search jobs with filters
 * @param {Object} filters
 * @param {Object} options
 */
jobPostSchema.statics.searchJobs = async function (filters = {}, options = {}) {
  const query = { isActive: true };

  // Text search
  if (filters.q) {
    query.$text = { $search: filters.q };
  }

  // Skills filter
  if (filters.skills && filters.skills.length > 0) {
    query.requiredSkills = { $in: filters.skills };
  }

  // Work type filter
  if (filters.workType) {
    query.workType = filters.workType;
  }

  // Location filter
  if (filters.country) {
    query["location.country"] = { $regex: filters.country, $options: "i" };
  }

  // Experience filter
  if (filters.maxExperience !== undefined) {
    query.minYearsExperience = { $lte: filters.maxExperience };
  }

  // Build query
  let jobQuery = this.find(query);

  // Add text score if searching
  if (filters.q) {
    jobQuery = jobQuery.select({ score: { $meta: "textScore" } });
    jobQuery = jobQuery.sort({ score: { $meta: "textScore" } });
  } else {
    jobQuery = jobQuery.sort({ isFeatured: -1, createdAt: -1 });
  }

  // Pagination
  const page = options.page || 1;
  const limit = options.limit || 10;
  jobQuery = jobQuery.skip((page - 1) * limit).limit(limit);

  // Populate recruiter
  jobQuery = jobQuery.populate("recruiter", "username avatar");

  return jobQuery;
};

/**
 * Get featured jobs
 */
jobPostSchema.statics.getFeatured = function (limit = 5) {
  return this.find({ isActive: true, isFeatured: true })
    .populate("recruiter", "username avatar")
    .sort({ createdAt: -1 })
    .limit(limit);
};

const JobPost = mongoose.model("JobPost", jobPostSchema);

module.exports = JobPost;
