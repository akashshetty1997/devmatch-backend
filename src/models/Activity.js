/**
 * @file src/models/Activity.js
 * @description Activity/Notification model - tracks user events
 * Used for activity feed / notifications
 *
 * MongoDB Best Practices:
 * - ObjectId refs for all relations
 * - Compound indexes for efficient feed queries
 * - TTL index for auto-cleanup of old activities (optional)
 */

const mongoose = require("mongoose");
const { ACTIVITY_TYPES } = require("../config/constants");

const activitySchema = new mongoose.Schema(
  {
    // User who receives/owns this activity
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Activity type
    type: {
      type: String,
      enum: {
        values: Object.values(ACTIVITY_TYPES),
        message: "Invalid activity type",
      },
      required: [true, "Activity type is required"],
      index: true,
    },

    // Actor who triggered this activity
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Actor is required"],
    },

    // References to related entities (polymorphic-ish)
    // Only one of these should be populated based on activity type
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      default: null,
    },

    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      default: null,
    },

    // Additional data (flexible JSON for extra context)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES ====================

// Main query: get user's unread activities
activitySchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Get user's activity feed
activitySchema.index({ user: 1, createdAt: -1 });

// Filter by type
activitySchema.index({ user: 1, type: 1, createdAt: -1 });

// Optional: Auto-delete old activities after 90 days
// activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ==================== STATICS ====================

/**
 * Create activity helper
 * @param {Object} data
 */
activitySchema.statics.log = async function (data) {
  // Don't create activity if actor is the same as user
  if (data.actor.equals(data.user)) {
    return null;
  }

  return this.create(data);
};

/**
 * Log a FOLLOW activity
 * @param {ObjectId} followerId - who followed
 * @param {ObjectId} followedId - who was followed
 */
activitySchema.statics.logFollow = function (followerId, followedId) {
  return this.log({
    user: followedId,
    actor: followerId,
    type: ACTIVITY_TYPES.FOLLOW,
  });
};

/**
 * Log a LIKE activity
 * @param {ObjectId} likerId
 * @param {ObjectId} postOwnerId
 * @param {ObjectId} postId
 */
activitySchema.statics.logLike = function (likerId, postOwnerId, postId) {
  return this.log({
    user: postOwnerId,
    actor: likerId,
    type: ACTIVITY_TYPES.LIKE,
    post: postId,
  });
};

/**
 * Log a COMMENT activity
 * @param {ObjectId} commenterId
 * @param {ObjectId} postOwnerId
 * @param {ObjectId} postId
 * @param {ObjectId} commentId
 */
activitySchema.statics.logComment = function (
  commenterId,
  postOwnerId,
  postId,
  commentId
) {
  return this.log({
    user: postOwnerId,
    actor: commenterId,
    type: ACTIVITY_TYPES.COMMENT,
    post: postId,
    comment: commentId,
  });
};

/**
 * Log APPLICATION activity (new application)
 * @param {ObjectId} developerId
 * @param {ObjectId} recruiterId
 * @param {ObjectId} jobPostId
 * @param {ObjectId} applicationId
 */
activitySchema.statics.logApplication = function (
  developerId,
  recruiterId,
  jobPostId,
  applicationId
) {
  return this.log({
    user: recruiterId,
    actor: developerId,
    type: ACTIVITY_TYPES.APPLICATION,
    jobPost: jobPostId,
    application: applicationId,
  });
};

/**
 * Log STATUS_CHANGE activity (application status changed)
 * @param {ObjectId} recruiterId
 * @param {ObjectId} developerId
 * @param {ObjectId} applicationId
 * @param {string} newStatus
 */
activitySchema.statics.logStatusChange = function (
  recruiterId,
  developerId,
  applicationId,
  newStatus
) {
  return this.log({
    user: developerId,
    actor: recruiterId,
    type: ACTIVITY_TYPES.STATUS_CHANGE,
    application: applicationId,
    metadata: { newStatus },
  });
};

/**
 * Log REVIEW activity
 * @param {ObjectId} reviewerId
 * @param {ObjectId} targetUserId - developer being reviewed
 * @param {ObjectId} reviewId
 */
activitySchema.statics.logReview = function (
  reviewerId,
  targetUserId,
  reviewId
) {
  return this.log({
    user: targetUserId,
    actor: reviewerId,
    type: ACTIVITY_TYPES.REVIEW,
    review: reviewId,
  });
};

/**
 * Get user's activity feed
 * @param {ObjectId} userId
 * @param {Object} options - { skip, limit, type, unreadOnly }
 */
activitySchema.statics.getFeed = function (userId, options = {}) {
  const query = { user: userId };

  if (options.type) {
    query.type = options.type;
  }

  if (options.unreadOnly) {
    query.isRead = false;
  }

  return this.find(query)
    .populate("actor", "username avatar")
    .populate("post", "content")
    .populate("comment", "content")
    .populate("jobPost", "title companyName")
    .populate("application", "status")
    .populate("review", "rating title")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get unread count for user
 * @param {ObjectId} userId
 */
activitySchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ user: userId, isRead: false });
};

/**
 * Mark activities as read
 * @param {ObjectId} userId
 * @param {ObjectId[]} activityIds - if empty, marks all as read
 */
activitySchema.statics.markAsRead = async function (userId, activityIds = []) {
  const query = { user: userId, isRead: false };

  if (activityIds.length > 0) {
    query._id = { $in: activityIds };
  }

  await this.updateMany(query, {
    $set: { isRead: true, readAt: new Date() },
  });
};

/**
 * Delete old read activities (cleanup job)
 * @param {number} daysOld - delete activities older than this
 */
activitySchema.statics.cleanupOld = async function (daysOld = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const result = await this.deleteMany({
    isRead: true,
    createdAt: { $lt: cutoff },
  });

  return result.deletedCount;
};

const Activity = mongoose.model("Activity", activitySchema);

module.exports = Activity;
