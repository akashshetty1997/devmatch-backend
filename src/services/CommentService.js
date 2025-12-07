/**
 * @file src/services/CommentService.js
 * @description Comment business logic
 */

const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");

class CommentService {
  /**
   * Create a comment on a post
   * @param {ObjectId} authorId
   * @param {ObjectId} postId
   * @param {string} content
   */
  async createComment(authorId, postId, content) {
    // Verify post exists
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Create comment
    const comment = await Comment.create({
      author: authorId,
      post: postId,
      content: content.trim(),
    });

    // Update post comment count
    await post.incrementComments();

    // Log activity (don't notify if commenting on own post)
    if (!authorId.equals(post.author)) {
      await Activity.logComment(authorId, post.author, postId, comment._id);
    }

    // Populate author for response
    await comment.populate("author", "username avatar role");

    return comment;
  }

  /**
   * Get comments for a post
   * @param {ObjectId} postId
   * @param {Object} options - { page, limit }
   */
  async getCommentsByPost(postId, options = {}) {
    const post = await Post.findById(postId);

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.getByPost(postId, { skip, limit }),
      Comment.countByPost(postId),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a comment
   * @param {ObjectId} commentId
   * @param {ObjectId} userId
   * @param {string} content
   */
  async updateComment(commentId, userId, content) {
    const comment = await Comment.findOne({
      _id: commentId,
      isDeleted: false,
    });

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    // Check ownership
    if (!comment.author.equals(userId)) {
      throw ApiError.forbidden("You can only edit your own comments");
    }

    comment.content = content.trim();
    await comment.save();

    await comment.populate("author", "username avatar role");

    return comment;
  }

  /**
   * Delete a comment (soft delete)
   * @param {ObjectId} commentId
   * @param {ObjectId} userId
   * @param {boolean} isAdmin
   */
  async deleteComment(commentId, userId, isAdmin = false) {
    const comment = await Comment.findOne({
      _id: commentId,
      isDeleted: false,
    });

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    // Check ownership or admin
    if (!isAdmin && !comment.author.equals(userId)) {
      throw ApiError.forbidden("You can only delete your own comments");
    }

    // Soft delete
    await comment.softDelete();

    // Update post comment count
    const post = await Post.findById(comment.post);
    if (post) {
      await post.decrementComments();
    }

    return { deleted: true };
  }

  /**
   * Get comments by user
   * @param {ObjectId} userId
   * @param {Object} options
   */
  async getCommentsByUser(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.getByUser(userId, { skip, limit }),
      Comment.countDocuments({ author: userId, isDeleted: false }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new CommentService();
