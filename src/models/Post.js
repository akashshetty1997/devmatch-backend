/**
 * @file src/models/Post.js
 * @description Social feed post model
 * Domain Object 3: User-created social content
 */

const mongoose = require("mongoose");
const { POST_TYPES } = require("../config/constants");

const postSchema = new mongoose.Schema(
  {
    // Author of the post
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Post content (text)
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: [2000, "Post content cannot exceed 2000 characters"],
    },

    // Post type
    type: {
      type: String,
      enum: {
        values: Object.values(POST_TYPES),
        message: "Invalid post type",
      },
      default: POST_TYPES.TEXT,
    },

    // Attached repo (for SHARE_REPO type)
    repo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RepoSnapshot",
      default: null,
    },

    // Attached job (for SHARE_JOB type)
    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      default: null,
    },

    // Engagement counts (denormalized for performance)
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Visibility (always public for now, but ready for future)
    isPublic: {
      type: Boolean,
      default: true,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ type: 1 });
postSchema.index({ isDeleted: 1, isPublic: 1, createdAt: -1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Comments on this post
 */
postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "post",
});

/**
 * Virtual: Likes on this post
 */
postSchema.virtual("likes", {
  ref: "Like",
  localField: "_id",
  foreignField: "post",
});

// ==================== HOOKS ====================

/**
 * Pre-save: Validate attached content based on type
 */
postSchema.pre("save", function (next) {
  if (this.type === POST_TYPES.SHARE_REPO && !this.repo) {
    return next(new Error("Repo is required for SHARE_REPO post type"));
  }
  if (this.type === POST_TYPES.SHARE_JOB && !this.jobPost) {
    return next(new Error("JobPost is required for SHARE_JOB post type"));
  }
  next();
});

// ==================== METHODS ====================

/**
 * Soft delete the post
 */
postSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

/**
 * Restore soft deleted post
 */
postSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
};

/**
 * Increment likes count
 */
postSchema.methods.incrementLikes = async function () {
  this.likesCount += 1;
  await this.save();
};

/**
 * Decrement likes count
 */
postSchema.methods.decrementLikes = async function () {
  if (this.likesCount > 0) {
    this.likesCount -= 1;
    await this.save();
  }
};

/**
 * Increment comments count
 */
postSchema.methods.incrementComments = async function () {
  this.commentsCount += 1;
  await this.save();
};

/**
 * Decrement comments count
 */
postSchema.methods.decrementComments = async function () {
  if (this.commentsCount > 0) {
    this.commentsCount -= 1;
    await this.save();
  }
};

// ==================== STATICS ====================

/**
 * Get feed (all public posts, newest first)
 * @param {Object} options
 */
postSchema.statics.getFeed = function (options = {}) {
  const query = {
    isDeleted: false,
    isPublic: true,
  };

  return this.find(query)
    .populate("author", "username avatar role")
    .populate("repo", "name fullName description stars language")
    .populate("jobPost", "title companyName location workType")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get posts by user
 * @param {ObjectId} userId
 * @param {Object} options
 */
postSchema.statics.getByUser = function (userId, options = {}) {
  const query = {
    author: userId,
    isDeleted: false,
  };

  // Only show public posts if not viewing own profile
  if (!options.isOwner) {
    query.isPublic = true;
  }

  return this.find(query)
    .populate("author", "username avatar role")
    .populate("repo", "name fullName description stars language")
    .populate("jobPost", "title companyName location workType")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
