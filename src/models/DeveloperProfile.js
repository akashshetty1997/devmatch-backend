/**
 * @file src/models/DeveloperProfile.js
 * @description Developer profile - extends User with developer-specific fields
 * One-to-One relationship with User (where role = DEVELOPER)
 */

const mongoose = require("mongoose");

const developerProfileSchema = new mongoose.Schema(
  {
    // Reference to User
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One profile per user
      index: true,
    },

    // Professional headline (e.g., "Full Stack Developer | React & Node.js")
    headline: {
      type: String,
      trim: true,
      maxlength: [120, "Headline cannot exceed 120 characters"],
      default: "",
    },

    // Bio / About me
    bio: {
      type: String,
      trim: true,
      maxlength: [2000, "Bio cannot exceed 2000 characters"],
      default: "",
    },

    // Skills - array of skill slugs (references Skill model)
    skills: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Years of experience
    yearsOfExperience: {
      type: Number,
      min: [0, "Years of experience cannot be negative"],
      max: [50, "Years of experience cannot exceed 50"],
      default: 0,
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

    // Open to work status
    isOpenToWork: {
      type: Boolean,
      default: false,
    },

    // Preferred work types
    preferredWorkTypes: [
      {
        type: String,
        enum: ["REMOTE", "ONSITE", "HYBRID"],
      },
    ],

    // GitHub integration
    githubUsername: {
      type: String,
      trim: true,
      maxlength: 39, // GitHub username max length
      default: null,
    },

    // Pinned repositories (references RepoSnapshot)
    pinnedRepos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RepoSnapshot",
      },
    ],

    // External links
    portfolioUrl: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    linkedinUrl: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    twitterUrl: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    websiteUrl: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    // Profile completeness (calculated)
    profileCompleteness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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
developerProfileSchema.index({ skills: 1 });
developerProfileSchema.index({ isOpenToWork: 1 });
developerProfileSchema.index({ "location.country": 1, "location.city": 1 });
developerProfileSchema.index({ yearsOfExperience: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Formatted location string
 */
developerProfileSchema.virtual("locationString").get(function () {
  const parts = [];
  if (this.location?.city) parts.push(this.location.city);
  if (this.location?.state) parts.push(this.location.state);
  if (this.location?.country) parts.push(this.location.country);
  return parts.join(", ") || null;
});

// ==================== HOOKS ====================

/**
 * Pre-save: Calculate profile completeness
 */
developerProfileSchema.pre("save", function (next) {
  let score = 0;
  const weights = {
    headline: 15,
    bio: 15,
    skills: 20,
    yearsOfExperience: 10,
    location: 10,
    githubUsername: 15,
    portfolioUrl: 10,
    linkedinUrl: 5,
  };

  if (this.headline && this.headline.length >= 10) score += weights.headline;
  if (this.bio && this.bio.length >= 50) score += weights.bio;
  if (this.skills && this.skills.length >= 3) score += weights.skills;
  if (this.yearsOfExperience > 0) score += weights.yearsOfExperience;
  if (this.location?.city || this.location?.country) score += weights.location;
  if (this.githubUsername) score += weights.githubUsername;
  if (this.portfolioUrl) score += weights.portfolioUrl;
  if (this.linkedinUrl) score += weights.linkedinUrl;

  this.profileCompleteness = Math.min(score, 100);
  next();
});

// ==================== METHODS ====================

/**
 * Add skill to profile
 * @param {string} skillSlug
 */
developerProfileSchema.methods.addSkill = async function (skillSlug) {
  if (!this.skills.includes(skillSlug)) {
    this.skills.push(skillSlug);
    await this.save();
  }
};

/**
 * Remove skill from profile
 * @param {string} skillSlug
 */
developerProfileSchema.methods.removeSkill = async function (skillSlug) {
  this.skills = this.skills.filter((s) => s !== skillSlug);
  await this.save();
};

/**
 * Pin a repository
 * @param {ObjectId} repoId
 */
developerProfileSchema.methods.pinRepo = async function (repoId) {
  if (!this.pinnedRepos.includes(repoId)) {
    // Limit to 6 pinned repos
    if (this.pinnedRepos.length >= 6) {
      throw new Error("Maximum 6 pinned repositories allowed");
    }
    this.pinnedRepos.push(repoId);
    await this.save();
  }
};

/**
 * Unpin a repository
 * @param {ObjectId} repoId
 */
developerProfileSchema.methods.unpinRepo = async function (repoId) {
  this.pinnedRepos = this.pinnedRepos.filter(
    (id) => id.toString() !== repoId.toString()
  );
  await this.save();
};

// ==================== STATICS ====================

/**
 * Find developers by skills
 * @param {string[]} skills - Array of skill slugs
 * @param {Object} options - Query options
 */
developerProfileSchema.statics.findBySkills = function (skills, options = {}) {
  const query = {
    skills: { $in: skills },
    isPublic: true,
  };

  if (options.isOpenToWork) {
    query.isOpenToWork = true;
  }

  return this.find(query)
    .populate("user", "username avatar")
    .sort(options.sort || { profileCompleteness: -1 });
};

const DeveloperProfile = mongoose.model(
  "DeveloperProfile",
  developerProfileSchema
);

module.exports = DeveloperProfile;
