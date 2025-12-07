/**
 * @file src/services/PostService.js
 * @description Post/feed business logic
 */

const Post = require("../models/Post");
const RepoSnapshot = require("../models/RepoSnapshot");
const JobPost = require("../models/JobPost");
const Follow = require("../models/Follow");
const Like = require("../models/Like");
const GitHubService = require("./GitHubService");
const ApiError = require("../utils/ApiError");
const { POST_TYPES } = require("../config/constants");

class PostService {
  /**
   * Create a new post
   * @param {ObjectId} authorId
   * @param {Object} postData - { content, type, repoId, githubId, repoFullName, jobPostId }
   */
  async createPost(authorId, postData) {
    const {
      content,
      type = POST_TYPES.TEXT,
      repoId,
      githubId,
      repoFullName,
      jobPostId,
    } = postData;

    let repoSnapshotId = null;

    // Handle SHARE_REPO type
    if (type === POST_TYPES.SHARE_REPO) {
      // If repoId (MongoDB ID) is provided, use it directly
      if (repoId) {
        const repo = await RepoSnapshot.findById(repoId);
        if (!repo) {
          throw ApiError.notFound("Repository not found");
        }
        repoSnapshotId = repoId;
      }
      // If githubId is provided, find or create RepoSnapshot
      else if (githubId) {
        let repo = await RepoSnapshot.findOne({ githubId });

        if (!repo) {
          // Fetch from GitHub and create snapshot
          try {
            // We need the full name to fetch from GitHub
            // If not provided, we can't fetch
            if (!repoFullName) {
              throw ApiError.badRequest("Repository full name is required");
            }

            const githubData = await GitHubService.getRepositoryByFullName(
              repoFullName
            );
            repo = await RepoSnapshot.findOrCreateFromGitHub(
              githubData.id,
              githubData
            );
          } catch (error) {
            if (error.statusCode === 404) {
              throw ApiError.notFound("GitHub repository not found");
            }
            throw error;
          }
        }

        repoSnapshotId = repo._id;
      }
      // If repoFullName is provided (fallback)
      else if (repoFullName) {
        try {
          const githubData = await GitHubService.getRepositoryByFullName(
            repoFullName
          );
          const repo = await RepoSnapshot.findOrCreateFromGitHub(
            githubData.id,
            githubData
          );
          repoSnapshotId = repo._id;
        } catch (error) {
          if (error.statusCode === 404) {
            throw ApiError.notFound("GitHub repository not found");
          }
          throw error;
        }
      } else {
        throw ApiError.badRequest(
          "Repository ID, GitHub ID, or full name is required for SHARE_REPO type"
        );
      }
    }

    // Handle SHARE_JOB type
    if (type === POST_TYPES.SHARE_JOB) {
      if (!jobPostId) {
        throw ApiError.badRequest("Job post ID is required for SHARE_JOB type");
      }
      const job = await JobPost.findById(jobPostId);
      if (!job) {
        throw ApiError.notFound("Job post not found");
      }
    }

    const post = await Post.create({
      author: authorId,
      content: content.trim(),
      type,
      repo: repoSnapshotId,
      jobPost: type === POST_TYPES.SHARE_JOB ? jobPostId : null,
    });

    // Populate for response
    await post.populate("author", "username avatar role");
    if (post.repo) {
      await post.populate(
        "repo",
        "name fullName description stars language htmlUrl"
      );
    }
    if (post.jobPost) {
      await post.populate("jobPost", "title companyName location workType");
    }

    return post;
  }

  /**
   * Get public feed (all posts)
   * @param {ObjectId} viewerId - Optional current user
   * @param {Object} options - { page, limit }
   */
  async getPublicFeed(viewerId = null, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.getFeed({ skip, limit }),
      Post.countDocuments({ isDeleted: false, isPublic: true }),
    ]);

    // If user is logged in, check which posts they've liked
    let likedPostIds = new Set();
    if (viewerId && posts.length > 0) {
      const postIds = posts.map((p) => p._id);
      likedPostIds = await Like.getLikedPostIds(viewerId, postIds);
    }

    // Add hasLiked flag to each post
    const postsWithLikes = posts.map((post) => ({
      ...post.toObject(),
      hasLiked: likedPostIds.has(post._id.toString()),
    }));

    return {
      posts: postsWithLikes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get personalized feed (posts from followed users)
   * @param {ObjectId} userId
   * @param {Object} options - { page, limit }
   */
  async getPersonalizedFeed(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Get IDs of users the current user follows
    const followingIds = await Follow.getFollowingIds(userId);

    // Include own posts in feed
    followingIds.push(userId);

    const query = {
      author: { $in: followingIds },
      isDeleted: false,
      isPublic: true,
    };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "username avatar role")
        .populate("repo", "name fullName description stars language htmlUrl")
        .populate("jobPost", "title companyName location workType")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(query),
    ]);

    // Check which posts user has liked
    let likedPostIds = new Set();
    if (posts.length > 0) {
      const postIds = posts.map((p) => p._id);
      likedPostIds = await Like.getLikedPostIds(userId, postIds);
    }

    const postsWithLikes = posts.map((post) => ({
      ...post.toObject(),
      hasLiked: likedPostIds.has(post._id.toString()),
    }));

    return {
      posts: postsWithLikes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single post
   * @param {ObjectId} postId
   * @param {ObjectId} viewerId
   */
  async getPost(postId, viewerId = null) {
    const post = await Post.findOne({ _id: postId, isDeleted: false })
      .populate("author", "username avatar role")
      .populate(
        "repo",
        "name fullName description stars language htmlUrl topics"
      )
      .populate("jobPost", "title companyName location workType description");

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Check if viewer has liked
    let hasLiked = false;
    if (viewerId) {
      hasLiked = await Like.hasLiked(viewerId, postId);
    }

    return {
      ...post.toObject(),
      hasLiked,
    };
  }

  /**
   * Update post
   * @param {ObjectId} postId
   * @param {ObjectId} userId
   * @param {Object} updateData - { content }
   */
  async updatePost(postId, userId, updateData) {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (!post.author.equals(userId)) {
      throw ApiError.forbidden("You can only edit your own posts");
    }

    // Only allow content update
    if (updateData.content) {
      post.content = updateData.content.trim();
    }

    await post.save();

    await post.populate("author", "username avatar role");
    if (post.repo) {
      await post.populate(
        "repo",
        "name fullName description stars language htmlUrl"
      );
    }
    if (post.jobPost) {
      await post.populate("jobPost", "title companyName location workType");
    }

    return post;
  }

  /**
   * Delete post (soft delete)
   * @param {ObjectId} postId
   * @param {ObjectId} userId
   * @param {boolean} isAdmin
   */
  async deletePost(postId, userId, isAdmin = false) {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (!isAdmin && !post.author.equals(userId)) {
      throw ApiError.forbidden("You can only delete your own posts");
    }

    await post.softDelete();

    return { deleted: true };
  }

  /**
   * Get trending posts (most liked in last 7 days)
   * @param {number} limit
   */
  async getTrendingPosts(limit = 10) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const posts = await Post.find({
      isDeleted: false,
      isPublic: true,
      createdAt: { $gte: weekAgo },
    })
      .populate("author", "username avatar role")
      .populate("repo", "name fullName stars htmlUrl")
      .populate("jobPost", "title companyName")
      .sort({ likesCount: -1, commentsCount: -1 })
      .limit(limit);

    return posts;
  }
}

module.exports = new PostService();
