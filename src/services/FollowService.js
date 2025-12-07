/**
 * @file src/services/FollowService.js
 * @description Follow business logic
 * Single Responsibility: Handle all follow-related operations
 */

const Follow = require("../models/Follow");
const User = require("../models/User");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");

class FollowService {
  /**
   * Follow a user
   * @param {ObjectId} followerId - Current user
   * @param {string} username - Username to follow
   * @returns {Promise<{ follow: Follow, created: boolean }>}
   */
  async followUser(followerId, username) {
    // Find target user
    const targetUser = await User.findOne({
      username: username.toLowerCase(),
      status: "ACTIVE",
    });

    if (!targetUser) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    // Can't follow yourself
    if (followerId.equals(targetUser._id)) {
      throw ApiError.badRequest("You cannot follow yourself");
    }

    // Create follow relationship
    const result = await Follow.follow(followerId, targetUser._id);

    // Log activity if new follow
    if (result.created) {
      await Activity.logFollow(followerId, targetUser._id);
    }

    return {
      ...result,
      user: {
        id: targetUser._id,
        username: targetUser.username,
        avatar: targetUser.avatar,
      },
    };
  }

  /**
   * Unfollow a user
   * @param {ObjectId} followerId
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  async unfollowUser(followerId, username) {
    const targetUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (!targetUser) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    const deleted = await Follow.unfollow(followerId, targetUser._id);

    return deleted;
  }

  /**
   * Check if current user follows target
   * @param {ObjectId} followerId
   * @param {ObjectId} targetId
   */
  async isFollowing(followerId, targetId) {
    return Follow.isFollowing(followerId, targetId);
  }

  /**
   * Get followers of a user
   * @param {string} username
   * @param {Object} options - { page, limit }
   */
  async getFollowers(username, options = {}) {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [followers, total] = await Promise.all([
      Follow.getFollowers(user._id, { skip, limit }),
      Follow.countDocuments({ following: user._id }),
    ]);

    return {
      followers: followers.map((f) => ({
        id: f.follower._id,
        username: f.follower.username,
        avatar: f.follower.avatar,
        role: f.follower.role,
        followedAt: f.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get users that a user follows
   * @param {string} username
   * @param {Object} options
   */
  async getFollowing(username, options = {}) {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [following, total] = await Promise.all([
      Follow.getFollowing(user._id, { skip, limit }),
      Follow.countDocuments({ follower: user._id }),
    ]);

    return {
      following: following.map((f) => ({
        id: f.following._id,
        username: f.following.username,
        avatar: f.following.avatar,
        role: f.following.role,
        followedAt: f.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get follow counts for a user
   * @param {ObjectId} userId
   */
  async getCounts(userId) {
    return Follow.getCounts(userId);
  }

  /**
   * Get IDs of users the current user follows (for feed)
   * @param {ObjectId} userId
   */
  async getFollowingIds(userId) {
    return Follow.getFollowingIds(userId);
  }
}

module.exports = new FollowService();
