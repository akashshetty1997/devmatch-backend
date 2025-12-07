/**
 * @file src/services/AuthService.js
 * @description Authentication business logic
 */

const User = require("../models/User");
const DeveloperProfile = require("../models/DeveloperProfile");
const RecruiterProfile = require("../models/RecruiterProfile");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../config/constants");

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - { username, email, password, role, ...profileData }
   * @returns {Promise<{ user: User, token: string }>}
   */
  async register(userData) {
    const { username, email, password, role, ...profileData } = userData;

    // Check if email or username already taken
    const [emailExists, usernameExists] = await Promise.all([
      User.isEmailTaken(email),
      User.isUsernameTaken(username),
    ]);

    if (emailExists) {
      throw ApiError.conflict("Email is already registered");
    }

    if (usernameExists) {
      throw ApiError.conflict("Username is already taken");
    }

    // Create user
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      role,
    });

    // Create role-specific profile
    if (role === ROLES.DEVELOPER) {
      await DeveloperProfile.create({
        user: user._id,
        headline: profileData.headline || "",
        bio: profileData.bio || "",
        skills: profileData.skills || [],
        githubUsername: profileData.githubUsername || null,
      });
    } else if (role === ROLES.RECRUITER) {
      if (!profileData.companyName) {
        // Rollback user creation
        await User.deleteOne({ _id: user._id });
        throw ApiError.badRequest("Company name is required for recruiters");
      }

      await RecruiterProfile.create({
        user: user._id,
        companyName: profileData.companyName,
        companyWebsite: profileData.companyWebsite || null,
        companyDescription: profileData.companyDescription || "",
        positionTitle: profileData.positionTitle || "Recruiter",
      });
    }

    // Generate token
    const token = user.generateAuthToken();

    // Return user without password
    const userResponse = user.toPublicJSON();

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ user: User, token: string }>}
   */
  async login(email, password) {
    // Find user with password field
    const user = await User.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Check if user is banned
    if (user.status === "BANNED") {
      throw ApiError.forbidden("Your account has been banned");
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Return user without password
    const userResponse = user.toPublicJSON();

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Get current user with profile
   * @param {ObjectId} userId
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const userResponse = user.toPublicJSON();

    // Get role-specific profile
    let profile = null;

    if (user.role === ROLES.DEVELOPER) {
      profile = await DeveloperProfile.findOne({ user: userId })
        .populate("pinnedRepos", "name fullName description stars language")
        .lean();
    } else if (user.role === ROLES.RECRUITER) {
      profile = await RecruiterProfile.findOne({ user: userId }).lean();
    }

    return {
      ...userResponse,
      profile,
    };
  }

  /**
   * Change password
   * @param {ObjectId} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      throw ApiError.unauthorized("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return { message: "Password changed successfully" };
  }

  /**
   * Update user avatar
   * @param {ObjectId} userId
   * @param {string} avatarUrl
   */
  async updateAvatar(userId, avatarUrl) {
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return user.toPublicJSON();
  }
}

module.exports = new AuthService();
