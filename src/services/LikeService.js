/**
 * @file src/services/LikeService.js
 * @description Like business logic
 */

const Like = require("../models/Like");
const Post = require("../models/Post");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");

class LikeService {
  /**
   * Like a post
   * @param {ObjectId} userId
   * @param {ObjectId} postId
   */
  async likePost(userId, postId) {
    // Verify post exists and is not deleted
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Create like
    const result = await Like.likePost(userId, postId);

    // Update post like count and log activity if new like
    if (result.created) {
      await post.incrementLikes();

      // Don't notify if liking own post
      if (!userId.equals(post.author)) {
        await Activity.logLike(userId, post.author, postId);
      }
    }

    return {
      liked: true,
      likesCount: post.likesCount + (result.created ? 1 : 0),
      isNewLike: result.created,
    };
  }

  /**
   * Unlike a post
   * @param {ObjectId} userId
   * @param {ObjectId} postId
   */
  async unlikePost(userId, postId) {
    const post = await Post.findById(postId);

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const deleted = await Like.unlikePost(userId, postId);

    if (deleted) {
      await post.decrementLikes();
    }

    return {
      liked: false,
      likesCount: Math.max(0, post.likesCount - (deleted ? 1 : 0)),
      wasLiked: deleted,
    };
  }

  /**
   * Toggle like on a post
   * @param {ObjectId} userId
   * @param {ObjectId} postId
   */
  async toggleLike(userId, postId) {
    const hasLiked = await Like.hasLiked(userId, postId);

    if (hasLiked) {
      return this.unlikePost(userId, postId);
    } else {
      return this.likePost(userId, postId);
    }
  }

  /**
   * Check if user liked a post
   * @param {ObjectId} userId
   * @param {ObjectId} postId
   */
  async hasLiked(userId, postId) {
    return Like.hasLiked(userId, postId);
  }

  /**
   * Check likes for multiple posts (batch for feed)
   * @param {ObjectId} userId
   * @param {ObjectId[]} postIds
   */
  async getLikedPostIds(userId, postIds) {
    return Like.getLikedPostIds(userId, postIds);
  }

  /**
   * Get users who liked a post
   * @param {ObjectId} postId
   * @param {Object} options
   */
  async getLikers(postId, options = {}) {
    const post = await Post.findById(postId);

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [likers, total] = await Promise.all([
      Like.getLikers(postId, { skip, limit }),
      Like.countDocuments({ post: postId }),
    ]);

    return {
      likers: likers.map((l) => ({
        id: l.user._id,
        username: l.user.username,
        avatar: l.user.avatar,
        likedAt: l.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new LikeService();
