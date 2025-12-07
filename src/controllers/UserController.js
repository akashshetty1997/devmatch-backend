/**
 * @file src/controllers/UserController.js
 * @description User endpoints
 */

const UserService = require('../services/UserService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get user by username (public profile)
 * @route   GET /api/users/:username
 * @access  Public
 */
const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const viewerId = req.user?._id || null;

  const user = await UserService.getUserByUsername(username, viewerId);

  return ApiResponse.success(res, 'User retrieved', user);
});

/**
 * @desc    Get user's posts
 * @route   GET /api/users/:username/posts
 * @access  Public
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page, limit } = req.query;
  const viewerId = req.user?._id || null;

  const result = await UserService.getUserPosts(username, viewerId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, 'User posts retrieved', result);
});

/**
 * @desc    Search users
 * @route   GET /api/users
 * @access  Public
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, role, skills, isOpenToWork, page, limit } = req.query;

  const result = await UserService.searchUsers(
    { q, role, skills, isOpenToWork },
    {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    }
  );

  return ApiResponse.success(res, 'Users retrieved', result);
});

/**
 * @desc    Get recent users
 * @route   GET /api/users/recent
 * @access  Public
 */
const getRecentUsers = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const users = await UserService.getRecentUsers(parseInt(limit, 10) || 10);

  return ApiResponse.success(res, 'Recent users retrieved', users);
});

/**
 * @desc    Get featured developers
 * @route   GET /api/users/featured/developers
 * @access  Public
 */
const getFeaturedDevelopers = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const developers = await UserService.getFeaturedDevelopers(parseInt(limit, 10) || 6);

  return ApiResponse.success(res, 'Featured developers retrieved', developers);
});

module.exports = {
  getUserByUsername,
  getUserPosts,
  searchUsers,
  getRecentUsers,
  getFeaturedDevelopers,
};