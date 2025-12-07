/**
 * @file src/models/RepoSnapshot.js
 * @description Repository snapshot - cached GitHub repository data
 * Domain Object 1: Data from external GitHub API
 */

const mongoose = require("mongoose");

const repoSnapshotSchema = new mongoose.Schema(
  {
    // GitHub repository ID (unique identifier from GitHub)
    githubId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    // Repository owner's GitHub username
    ownerLogin: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Repository name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Full name (owner/repo)
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Description
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: null,
    },

    // GitHub URL
    htmlUrl: {
      type: String,
      required: true,
    },

    // Clone URL
    cloneUrl: {
      type: String,
      default: null,
    },

    // Primary language
    language: {
      type: String,
      default: null,
      index: true,
    },

    // All languages used (from GitHub API)
    languages: [
      {
        name: String,
        bytes: Number,
        percentage: Number,
      },
    ],

    // Repository stats
    stars: {
      type: Number,
      default: 0,
    },

    forks: {
      type: Number,
      default: 0,
    },

    watchers: {
      type: Number,
      default: 0,
    },

    openIssues: {
      type: Number,
      default: 0,
    },

    // Repository metadata
    isPrivate: {
      type: Boolean,
      default: false,
    },

    isFork: {
      type: Boolean,
      default: false,
    },

    defaultBranch: {
      type: String,
      default: "main",
    },

    // Topics/tags from GitHub
    topics: [
      {
        type: String,
        trim: true,
      },
    ],

    // License
    license: {
      type: String,
      default: null,
    },

    // Dates from GitHub
    githubCreatedAt: {
      type: Date,
    },

    githubUpdatedAt: {
      type: Date,
    },

    githubPushedAt: {
      type: Date,
    },

    // README content (cached)
    readme: {
      type: String,
      maxlength: 50000, // ~50KB limit
      default: null,
    },

    readmeFetchedAt: {
      type: Date,
      default: null,
    },

    // AI-generated fields
    aiSummary: {
      type: String,
      maxlength: 2000,
      default: null,
    },

    aiTechStack: [
      {
        type: String,
        trim: true,
      },
    ],

    aiComplexityLevel: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT", null],
      default: null,
    },

    aiRoleFit: [
      {
        type: String,
        trim: true,
      },
    ],

    aiGeneratedAt: {
      type: Date,
      default: null,
    },

    // Sync tracking
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },

    syncError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for search
repoSnapshotSchema.index(
  { name: "text", description: "text" },
  { language_override: "textSearchLanguage" }
);
repoSnapshotSchema.index({ stars: -1 });
repoSnapshotSchema.index({ topics: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Developers who pinned this repo
 */
repoSnapshotSchema.virtual("pinnedBy", {
  ref: "DeveloperProfile",
  localField: "_id",
  foreignField: "pinnedRepos",
});

/**
 * Virtual: Reviews for this repo
 */
repoSnapshotSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "repo",
});

/**
 * Virtual: Short description (first 150 chars)
 */
repoSnapshotSchema.virtual("shortDescription").get(function () {
  if (!this.description) return null;
  if (this.description.length <= 150) return this.description;
  return this.description.substring(0, 147) + "...";
});

/**
 * Virtual: README preview (first 500 chars)
 */
repoSnapshotSchema.virtual("readmePreview").get(function () {
  if (!this.readme) return null;
  if (this.readme.length <= 500) return this.readme;
  return this.readme.substring(0, 497) + "...";
});

// ==================== METHODS ====================

/**
 * Check if repo needs sync (older than 24 hours)
 * @returns {boolean}
 */
repoSnapshotSchema.methods.needsSync = function () {
  if (!this.lastSyncedAt) return true;
  const hoursSinceSync =
    (Date.now() - this.lastSyncedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > 24;
};

/**
 * Update from GitHub API data
 * @param {Object} githubData - Data from GitHub API
 */
repoSnapshotSchema.methods.updateFromGitHub = function (githubData) {
  this.ownerLogin = githubData.owner.login;
  this.name = githubData.name;
  this.fullName = githubData.full_name;
  this.description = githubData.description;
  this.htmlUrl = githubData.html_url;
  this.cloneUrl = githubData.clone_url;
  this.language = githubData.language;
  this.stars = githubData.stargazers_count;
  this.forks = githubData.forks_count;
  this.watchers = githubData.watchers_count;
  this.openIssues = githubData.open_issues_count;
  this.isPrivate = githubData.private;
  this.isFork = githubData.fork;
  this.defaultBranch = githubData.default_branch;
  this.topics = githubData.topics || [];
  this.license = githubData.license?.spdx_id || null;
  this.githubCreatedAt = githubData.created_at;
  this.githubUpdatedAt = githubData.updated_at;
  this.githubPushedAt = githubData.pushed_at;
  this.lastSyncedAt = new Date();
  this.syncError = null;
};

// ==================== STATICS ====================

/**
 * Find or create repo snapshot from GitHub ID
 * @param {number} githubId
 * @param {Object} githubData
 */
repoSnapshotSchema.statics.findOrCreateFromGitHub = async function (
  githubId,
  githubData
) {
  let repo = await this.findOne({ githubId });

  if (repo) {
    // Update existing
    repo.updateFromGitHub(githubData);
    await repo.save();
  } else {
    // Create new
    repo = new this({ githubId });
    repo.updateFromGitHub(githubData);
    await repo.save();
  }

  return repo;
};

/**
 * Search repos by text
 * @param {string} query
 * @param {Object} options
 */
repoSnapshotSchema.statics.searchRepos = function (query, options = {}) {
  const searchQuery = {
    $text: { $search: query },
    isPrivate: false,
  };

  if (options.language) {
    searchQuery.language = options.language;
  }

  return this.find(searchQuery, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" }, stars: -1 })
    .limit(options.limit || 20);
};

const RepoSnapshot = mongoose.model("RepoSnapshot", repoSnapshotSchema);

module.exports = RepoSnapshot;
