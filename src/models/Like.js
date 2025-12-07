/**
 * @file src/models/Like.js
 * @description Like model - User likes Post
 * Many-to-Many via join collection
 *
 * MongoDB Best Practices:
 * - ObjectId refs (not strings)
 * - Compound unique index for idempotent likes
 * - Index on post for counting likes efficiently
 */

const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    // User who liked
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Post that was liked
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: [true, "Post is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Unique constraint - one like per user per post
likeSchema.index({ user: 1, post: 1 }, { unique: true });

// For efficient "get all likes on a post" with newest first
likeSchema.index({ post: 1, createdAt: -1 });

// ==================== STATICS ====================

/**
 * Like a post (idempotent)
 * @param {ObjectId} userId
 * @param {ObjectId} postId
 * @returns {Promise<{ like: Like, created: boolean }>}
 */
likeSchema.statics.likePost = async function (userId, postId) {
  try {
    const like = await this.create({ user: userId, post: postId });
    return { like, created: true };
  } catch (error) {
    if (error.code === 11000) {
      // Already liked
      const existing = await this.findOne({ user: userId, post: postId });
      return { like: existing, created: false };
    }
    throw error;
  }
};

/**
 * Unlike a post
 * @param {ObjectId} userId
 * @param {ObjectId} postId
 * @returns {Promise<boolean>}
 */
likeSchema.statics.unlikePost = async function (userId, postId) {
  const result = await this.deleteOne({ user: userId, post: postId });
  return result.deletedCount > 0;
};

/**
 * Check if user liked a post
 * @param {ObjectId} userId
 * @param {ObjectId} postId
 * @returns {Promise<boolean>}
 */
likeSchema.statics.hasLiked = async function (userId, postId) {
  const like = await this.findOne({ user: userId, post: postId });
  return !!like;
};

/**
 * Check likes for multiple posts (batch - for feed)
 * @param {ObjectId} userId
 * @param {ObjectId[]} postIds
 * @returns {Promise<Set<string>>} Set of liked post IDs as strings
 */
likeSchema.statics.getLikedPostIds = async function (userId, postIds) {
  const likes = await this.find({
    user: userId,
    post: { $in: postIds },
  })
    .select("post")
    .lean();

  return new Set(likes.map((l) => l.post.toString()));
};

/**
 * Get users who liked a post (paginated)
 * @param {ObjectId} postId
 * @param {Object} options
 */
likeSchema.statics.getLikers = function (postId, options = {}) {
  return this.find({ post: postId })
    .populate("user", "username avatar")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

const Like = mongoose.model("Like", likeSchema);

module.exports = Like;
