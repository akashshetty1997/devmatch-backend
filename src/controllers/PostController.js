/**
 * @file src/controllers/PostController.js
 * @description Post/feed endpoints
 */

const PostService = require('../services/PostService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new post
 * @route   POST /api/posts
 * @access  Private
 */
const createPost = asyncHandler(async (req, res) => {
  const post = await PostService.createPost(req.user._id, req.body);

  return ApiResponse.created(res, 'Post created', post);
});

/**
 * @desc    Get feed
 * @route   GET /api/posts
 * @access  Public (personalized if logged in)
 */
const getFeed = asyncHandler(async (req, res) => {
  const { page, limit, type } = req.query;
  const userId = req.user?._id || null;

  let result;

  // If logged in and requesting personalized feed
  if (userId && type === 'following') {
    result = await PostService.getPersonalizedFeed(userId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
  } else {
    result = await PostService.getPublicFeed(userId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    });
  }

  return ApiResponse.success(res, 'Feed retrieved', result);
});

/**
 * @desc    Get single post
 * @route   GET /api/posts/:postId
 * @access  Public
 */
const getPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const viewerId = req.user?._id || null;

  const post = await PostService.getPost(postId, viewerId);

  return ApiResponse.success(res, 'Post retrieved', post);
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:postId
 * @access  Private (owner only)
 */
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await PostService.updatePost(postId, req.user._id, req.body);

  return ApiResponse.success(res, 'Post updated', post);
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:postId
 * @access  Private (owner or admin)
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const isAdmin = req.user.role === 'ADMIN';

  await PostService.deletePost(postId, req.user._id, isAdmin);

  return ApiResponse.success(res, 'Post deleted');
});

/**
 * @desc    Get trending posts
 * @route   GET /api/posts/trending
 * @access  Public
 */
const getTrendingPosts = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const posts = await PostService.getTrendingPosts(parseInt(limit, 10) || 10);

  return ApiResponse.success(res, 'Trending posts retrieved', posts);
});

module.exports = {
  createPost,
  getFeed,
  getPost,
  updatePost,
  deletePost,
  getTrendingPosts,
};