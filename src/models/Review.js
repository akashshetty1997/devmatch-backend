/**
 * @file src/models/Review.js
 * @description Review model - User reviews Developer or Repo
 * Can review: DeveloperProfile OR RepoSnapshot (mutually exclusive)
 *
 * MongoDB Best Practices:
 * - ObjectId refs with proper indexes
 * - Compound indexes for target lookups
 * - Unique constraint per reviewer per target
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    // Who wrote the review
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reviewer is required"],
      index: true,
    },

    // Review target - EITHER developer OR repo (not both)
    // Developer being reviewed (null if reviewing repo)
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Points to User with role=DEVELOPER
      default: null,
      index: true,
    },

    // Repo being reviewed (null if reviewing developer)
    repo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepoSnapshot",
      default: null,
      index: true,
    },

    // Rating 1-5
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    // Review text
    content: {
      type: String,
      trim: true,
      maxlength: [2000, "Review cannot exceed 2000 characters"],
      default: "",
    },

    // Review title (optional)
    title: {
      type: String,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
      default: null,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==================== INDEXES ====================

// One review per reviewer per developer
reviewSchema.index(
  { reviewer: 1, developer: 1 },
  { unique: true, partialFilterExpression: { developer: { $ne: null } } }
);

// One review per reviewer per repo
reviewSchema.index(
  { reviewer: 1, repo: 1 },
  { unique: true, partialFilterExpression: { repo: { $ne: null } } }
);

// For developer reviews listing
reviewSchema.index({ developer: 1, isDeleted: 1, createdAt: -1 });

// For repo reviews listing
reviewSchema.index({ repo: 1, isDeleted: 1, createdAt: -1 });

// ==================== HOOKS ====================

/**
 * Pre-save: Validate that exactly one target is set
 */
reviewSchema.pre("save", function (next) {
  const hasDeveloper = this.developer != null;
  const hasRepo = this.repo != null;

  if (!hasDeveloper && !hasRepo) {
    return next(new Error("Review must target either a developer or a repo"));
  }

  if (hasDeveloper && hasRepo) {
    return next(new Error("Review cannot target both developer and repo"));
  }

  // Prevent self-review for developers
  if (hasDeveloper && this.reviewer.equals(this.developer)) {
    return next(new Error("Cannot review yourself"));
  }

  next();
});

// ==================== VIRTUALS ====================

/**
 * Virtual: Review type
 */
reviewSchema.virtual("type").get(function () {
  if (this.developer) return "DEVELOPER";
  if (this.repo) return "REPO";
  return null;
});

// ==================== STATICS ====================

/**
 * Get reviews for a developer
 * @param {ObjectId} developerId
 * @param {Object} options
 */
reviewSchema.statics.getByDeveloper = function (developerId, options = {}) {
  return this.find({ developer: developerId, isDeleted: false })
    .populate("reviewer", "username avatar role")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get reviews for a repo
 * @param {ObjectId} repoId
 * @param {Object} options
 */
reviewSchema.statics.getByRepo = function (repoId, options = {}) {
  return this.find({ repo: repoId, isDeleted: false })
    .populate("reviewer", "username avatar role")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get average rating for a developer
 * @param {ObjectId} developerId
 * @returns {Promise<{ average: number, count: number }>}
 */
reviewSchema.statics.getDeveloperRating = async function (developerId) {
  const result = await this.aggregate([
    { $match: { developer: developerId, isDeleted: false } },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) {
    return { average: 0, count: 0 };
  }

  return {
    average: Math.round(result[0].average * 10) / 10, // 1 decimal
    count: result[0].count,
  };
};

/**
 * Get average rating for a repo
 * @param {ObjectId} repoId
 * @returns {Promise<{ average: number, count: number }>}
 */
reviewSchema.statics.getRepoRating = async function (repoId) {
  const result = await this.aggregate([
    { $match: { repo: repoId, isDeleted: false } },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length === 0) {
    return { average: 0, count: 0 };
  }

  return {
    average: Math.round(result[0].average * 10) / 10,
    count: result[0].count,
  };
};

/**
 * Check if user already reviewed target
 * @param {ObjectId} reviewerId
 * @param {ObjectId} targetId
 * @param {'developer'|'repo'} targetType
 */
reviewSchema.statics.hasReviewed = async function (
  reviewerId,
  targetId,
  targetType
) {
  const query = { reviewer: reviewerId };
  query[targetType] = targetId;

  const review = await this.findOne(query);
  return !!review;
};

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
