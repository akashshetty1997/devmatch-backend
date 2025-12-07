/**
 * @file src/models/Comment.js
 * @description Comment model - User comments on Post
 * One-to-Many: Post has many Comments
 *
 * MongoDB Best Practices:
 * - ObjectId refs with indexes
 * - Compound index for post + createdAt (paginated comments)
 * - Soft delete for data integrity
 */

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    // Author of comment
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
      index: true,
    },

    // Post being commented on
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: [true, "Post is required"],
      index: true,
    },

    // Comment content
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
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

// ==================== INDEXES ====================

// For paginated comments on a post
commentSchema.index({ post: 1, isDeleted: 1, createdAt: -1 });

// For user's comment history
commentSchema.index({ author: 1, createdAt: -1 });

// ==================== METHODS ====================

/**
 * Soft delete comment
 */
commentSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

/**
 * Restore comment
 */
commentSchema.methods.restore = async function () {
  this.isDeleted = false;
  this.deletedAt = null;
  await this.save();
};

// ==================== STATICS ====================

/**
 * Get comments for a post (paginated, newest first)
 * @param {ObjectId} postId
 * @param {Object} options - { skip, limit }
 */
commentSchema.statics.getByPost = function (postId, options = {}) {
  return this.find({ post: postId, isDeleted: false })
    .populate("author", "username avatar role")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get comment count for a post
 * @param {ObjectId} postId
 * @returns {Promise<number>}
 */
commentSchema.statics.countByPost = function (postId) {
  return this.countDocuments({ post: postId, isDeleted: false });
};

/**
 * Get comments by user
 * @param {ObjectId} userId
 * @param {Object} options
 */
commentSchema.statics.getByUser = function (userId, options = {}) {
  return this.find({ author: userId, isDeleted: false })
    .populate("post", "content author")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
