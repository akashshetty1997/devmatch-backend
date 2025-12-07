/**
 * @file src/controllers/LikeController.js
 * @description Like endpoints
 */

const LikeService = require("../services/LikeService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Like a post
 * @route   POST /api/posts/:postId/likes
 * @access  Private
 */
const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const result = await LikeService.likePost(req.user._id, postId);

  return ApiResponse.success(res, "Post liked", result);
});

/**
 * @desc    Unlike a post
 * @route   DELETE /api/posts/:postId/likes
 * @access  Private
 */
const unlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const result = await LikeService.unlikePost(req.user._id, postId);

  return ApiResponse.success(res, "Post unliked", result);
});

/**
 * @desc    Toggle like on a post
 * @route   POST /api/posts/:postId/likes/toggle
 * @access  Private
 */
const toggleLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const result = await LikeService.toggleLike(req.user._id, postId);

  const message = result.liked ? "Post liked" : "Post unliked";
  return ApiResponse.success(res, message, result);
});

/**
 * @desc    Get users who liked a post
 * @route   GET /api/posts/:postId/likes
 * @access  Public
 */
const getLikers = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page, limit } = req.query;

  const result = await LikeService.getLikers(postId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Likers retrieved", result);
});

module.exports = {
  likePost,
  unlikePost,
  toggleLike,
  getLikers,
};
