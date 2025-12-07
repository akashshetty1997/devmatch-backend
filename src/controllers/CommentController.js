/**
 * @file src/controllers/CommentController.js
 * @description Comment endpoints
 */

const CommentService = require("../services/CommentService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Create a comment
 * @route   POST /api/posts/:postId/comments
 * @access  Private
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  const comment = await CommentService.createComment(
    req.user._id,
    postId,
    content
  );

  return ApiResponse.created(res, "Comment created", comment);
});

/**
 * @desc    Get comments for a post
 * @route   GET /api/posts/:postId/comments
 * @access  Public
 */
const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page, limit } = req.query;

  const result = await CommentService.getCommentsByPost(postId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Comments retrieved", result);
});

/**
 * @desc    Update a comment
 * @route   PUT /api/comments/:commentId
 * @access  Private (owner only)
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  const comment = await CommentService.updateComment(
    commentId,
    req.user._id,
    content
  );

  return ApiResponse.success(res, "Comment updated", comment);
});

/**
 * @desc    Delete a comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private (owner or admin)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const isAdmin = req.user.role === "ADMIN";

  await CommentService.deleteComment(commentId, req.user._id, isAdmin);

  return ApiResponse.success(res, "Comment deleted");
});

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
};
