/**
 * @file src/services/UserService.js
 * @description User-related business logic
 */

const User = require("../models/User");
const DeveloperProfile = require("../models/DeveloperProfile");
const RecruiterProfile = require("../models/RecruiterProfile");
const Follow = require("../models/Follow");
const Post = require("../models/Post");
const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../config/constants");

class UserService {
  /**
   * Get user by username (public profile)
   * @param {string} username
   * @param {ObjectId} viewerId - Current user viewing (optional)
   * @returns {Promise<Object>}
   */
  async getUserByUsername(username, viewerId = null) {
    const user = await User.findOne({
      username: username.toLowerCase(),
      status: "ACTIVE",
    });

    if (!user) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    const isOwnProfile = viewerId && user._id.equals(viewerId);

    // Get role-specific profile
    let profile = null;

    if (user.role === ROLES.DEVELOPER) {
      profile = await DeveloperProfile.findOne({ user: user._id })
        .populate(
          "pinnedRepos",
          "name fullName description stars language htmlUrl"
        )
        .lean();

      // Hide private info if not own profile
      if (!isOwnProfile && profile) {
        // Can customize what to hide
      }
    } else if (user.role === ROLES.RECRUITER) {
      profile = await RecruiterProfile.findOne({ user: user._id }).lean();
    }

    // Get follow counts
    const followCounts = await Follow.getCounts(user._id);

    // Check if viewer follows this user
    let isFollowing = false;
    if (viewerId && !isOwnProfile) {
      isFollowing = await Follow.isFollowing(viewerId, user._id);
    }

    // Get post count
    const postCount = await Post.countDocuments({
      author: user._id,
      isDeleted: false,
      isPublic: true,
    });

    // Get review stats if developer
    let reviewStats = null;
    if (user.role === ROLES.DEVELOPER) {
      reviewStats = await Review.getDeveloperRating(user._id);
    }

    return {
      id: user._id,
      username: user.username,
      email: isOwnProfile ? user.email : undefined, // Only show email to owner
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      profile,
      stats: {
        followers: followCounts.followers,
        following: followCounts.following,
        posts: postCount,
        ...(reviewStats && { reviews: reviewStats }),
      },
      isFollowing,
      isOwnProfile,
    };
  }

  /**
   * Get user's posts
   * @param {string} username
   * @param {ObjectId} viewerId
   * @param {Object} options - { page, limit }
   */
  async getUserPosts(username, viewerId = null, options = {}) {
    const user = await User.findOne({ username: username.toLowerCase() });

    if (!user) {
      throw ApiError.notFound(`User "${username}" not found`);
    }

    const isOwner = viewerId && user._id.equals(viewerId);
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.getByUser(user._id, { isOwner, skip, limit }),
      Post.countDocuments({
        author: user._id,
        isDeleted: false,
        ...(isOwner ? {} : { isPublic: true }),
      }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search users
   * @param {Object} filters - { q, role, skills, isOpenToWork }
   * @param {Object} options - { page, limit }
   */
  async searchUsers(filters = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const userQuery = { status: "ACTIVE" };

    // Filter by role
    if (filters.role) {
      userQuery.role = filters.role;
    }

    // Text search on username
    if (filters.q) {
      userQuery.username = { $regex: filters.q, $options: "i" };
    }

    let users = await User.find(userQuery)
      .select("username avatar role createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // If searching developers with skills filter
    if (filters.role === ROLES.DEVELOPER && filters.skills) {
      const skillsArray = Array.isArray(filters.skills)
        ? filters.skills
        : filters.skills.split(",").map((s) => s.trim());

      const userIds = users.map((u) => u._id);

      const profileQuery = {
        user: { $in: userIds },
        skills: { $in: skillsArray },
      };

      if (filters.isOpenToWork === "true") {
        profileQuery.isOpenToWork = true;
      }

      const profiles = await DeveloperProfile.find(profileQuery)
        .select("user headline skills isOpenToWork")
        .lean();

      const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

      // Filter and enrich users
      users = users
        .filter((u) => profileMap.has(u._id.toString()))
        .map((u) => ({
          ...u,
          profile: profileMap.get(u._id.toString()),
        }));
    }

    const total = await User.countDocuments(userQuery);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recently joined users
   * @param {number} limit
   */
  async getRecentUsers(limit = 10) {
    const users = await User.find({ status: "ACTIVE" })
      .select("username avatar role createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get developer profiles for developers
    const developerIds = users
      .filter((u) => u.role === ROLES.DEVELOPER)
      .map((u) => u._id);

    const profiles = await DeveloperProfile.find({
      user: { $in: developerIds },
    })
      .select("user headline")
      .lean();

    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    return users.map((u) => ({
      ...u,
      headline: profileMap.get(u._id.toString())?.headline || null,
    }));
  }

  /**
   * Get featured developers (high profile completeness, open to work)
   * @param {number} limit
   */
  async getFeaturedDevelopers(limit = 6) {
    const profiles = await DeveloperProfile.find({
      isPublic: true,
      isOpenToWork: true,
      profileCompleteness: { $gte: 50 },
    })
      .populate("user", "username avatar")
      .sort({ profileCompleteness: -1 })
      .limit(limit)
      .lean();

    return profiles.map((p) => ({
      id: p.user._id,
      username: p.user.username,
      avatar: p.user.avatar,
      headline: p.headline,
      skills: p.skills.slice(0, 5), // Top 5 skills
      location: p.location,
      yearsOfExperience: p.yearsOfExperience,
    }));
  }
}

module.exports = new UserService();
