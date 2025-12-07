/**
 * @file src/controllers/FollowController.js
 * @description Follow endpoints
 */

const FollowService = require("../services/FollowService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Follow a user
 * @route   POST /api/users/:username/follow
 * @access  Private
 */
const followUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const result = await FollowService.followUser(req.user._id, username);

  const message = result.created
    ? `Now following ${username}`
    : `Already following ${username}`;

  return ApiResponse.success(res, message, result);
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/users/:username/follow
 * @access  Private
 */
const unfollowUser = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const deleted = await FollowService.unfollowUser(req.user._id, username);

  const message = deleted
    ? `Unfollowed ${username}`
    : `You were not following ${username}`;

  return ApiResponse.success(res, message, { unfollowed: deleted });
});

/**
 * @desc    Get followers of a user
 * @route   GET /api/users/:username/followers
 * @access  Public
 */
const getFollowers = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;

  const result = await FollowService.getFollowers(username, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Followers retrieved", result);
});

/**
 * @desc    Get users that a user follows
 * @route   GET /api/users/:username/following
 * @access  Public
 */
const getFollowing = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;

  const result = await FollowService.getFollowing(username, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Following retrieved", result);
});

/**
 * @desc    Check if current user follows target user
 * @route   GET /api/users/:username/follow/status
 * @access  Private
 */
const checkFollowStatus = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const User = require("../models/User");

  const targetUser = await User.findOne({ username: username.toLowerCase() });

  if (!targetUser) {
    return ApiResponse.success(res, "User not found", { isFollowing: false });
  }

  const isFollowing = await FollowService.isFollowing(
    req.user._id,
    targetUser._id
  );

  return ApiResponse.success(res, "Follow status retrieved", { isFollowing });
});

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
};
