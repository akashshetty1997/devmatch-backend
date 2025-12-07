/**
 * @file src/services/ActivityService.js
 * @description Activity/notification business logic
 */

const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");

class ActivityService {
  /**
   * Get user's activity feed
   * @param {ObjectId} userId
   * @param {Object} options - { type, unreadOnly, page, limit }
   */
  async getFeed(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query = { user: userId };
    if (options.type) query.type = options.type;
    if (options.unreadOnly) query.isRead = false;

    const [activities, total, unreadCount] = await Promise.all([
      Activity.getFeed(userId, {
        type: options.type,
        unreadOnly: options.unreadOnly,
        skip,
        limit,
      }),
      Activity.countDocuments(query),
      Activity.getUnreadCount(userId),
    ]);

    return {
      activities,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread count
   * @param {ObjectId} userId
   */
  async getUnreadCount(userId) {
    return Activity.getUnreadCount(userId);
  }

  /**
   * Mark activities as read
   * @param {ObjectId} userId
   * @param {ObjectId[]} activityIds - empty = mark all as read
   */
  async markAsRead(userId, activityIds = []) {
    await Activity.markAsRead(userId, activityIds);
    return { success: true };
  }

  /**
   * Mark single activity as read
   * @param {ObjectId} activityId
   * @param {ObjectId} userId
   */
  async markOneAsRead(activityId, userId) {
    const activity = await Activity.findOne({
      _id: activityId,
      user: userId,
    });

    if (!activity) {
      throw ApiError.notFound("Activity not found");
    }

    if (!activity.isRead) {
      activity.isRead = true;
      activity.readAt = new Date();
      await activity.save();
    }

    return activity;
  }

  /**
   * Delete an activity
   * @param {ObjectId} activityId
   * @param {ObjectId} userId
   */
  async deleteActivity(activityId, userId) {
    const result = await Activity.deleteOne({
      _id: activityId,
      user: userId,
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound("Activity not found");
    }

    return { deleted: true };
  }

  /**
   * Clear all activities for user
   * @param {ObjectId} userId
   */
  async clearAll(userId) {
    const result = await Activity.deleteMany({ user: userId });
    return { deletedCount: result.deletedCount };
  }

  /**
   * Cleanup old activities (admin/cron job)
   * @param {number} daysOld
   */
  async cleanup(daysOld = 90) {
    const deletedCount = await Activity.cleanupOld(daysOld);
    return { deletedCount };
  }
}

module.exports = new ActivityService();
