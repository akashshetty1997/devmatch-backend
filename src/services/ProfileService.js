/**
 * @file src/services/ProfileService.js
 * @description Profile management business logic
 */

const DeveloperProfile = require("../models/DeveloperProfile");
const RecruiterProfile = require("../models/RecruiterProfile");
const User = require("../models/User");
const Skill = require("../models/Skill");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../config/constants");

class ProfileService {
  /**
   * Get developer profile
   * @param {ObjectId} userId
   */
  async getDeveloperProfile(userId) {
    const profile = await DeveloperProfile.findOne({ user: userId })
      .populate(
        "pinnedRepos",
        "name fullName description stars language htmlUrl topics"
      )
      .lean();

    if (!profile) {
      throw ApiError.notFound("Developer profile not found");
    }

    return profile;
  }

  /**
   * Update developer profile
   * @param {ObjectId} userId
   * @param {Object} updateData
   */
  async updateDeveloperProfile(userId, updateData) {
    // Verify user is a developer
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.DEVELOPER) {
      throw ApiError.forbidden("Only developers can update developer profiles");
    }

    // Find or create profile
    let profile = await DeveloperProfile.findOne({ user: userId });

    if (!profile) {
      profile = new DeveloperProfile({ user: userId });
    }

    // Validate skills if provided
    if (updateData.skills && updateData.skills.length > 0) {
      const validSlugs = await Skill.validateSlugs(updateData.skills);
      if (!validSlugs) {
        // Just warn, don't fail - skills might be custom
        console.warn("Some skills may not be in the predefined list");
      }
    }

    // Update allowed fields
    const allowedFields = [
      "headline",
      "bio",
      "skills",
      "yearsOfExperience",
      "location",
      "isOpenToWork",
      "preferredWorkTypes",
      "githubUsername",
      "portfolioUrl",
      "linkedinUrl",
      "twitterUrl",
      "websiteUrl",
      "isPublic",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        profile[field] = updateData[field];
      }
    });

    await profile.save();

    // Populate for response
    await profile.populate(
      "pinnedRepos",
      "name fullName description stars language"
    );

    return profile;
  }

  /**
   * Get recruiter profile
   * @param {ObjectId} userId
   */
  async getRecruiterProfile(userId) {
    const profile = await RecruiterProfile.findOne({ user: userId }).lean();

    if (!profile) {
      throw ApiError.notFound("Recruiter profile not found");
    }

    return profile;
  }

  /**
   * Update recruiter profile
   * @param {ObjectId} userId
   * @param {Object} updateData
   */
  async updateRecruiterProfile(userId, updateData) {
    // Verify user is a recruiter
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.RECRUITER) {
      throw ApiError.forbidden("Only recruiters can update recruiter profiles");
    }

    // Find or create profile
    let profile = await RecruiterProfile.findOne({ user: userId });

    if (!profile) {
      if (!updateData.companyName) {
        throw ApiError.badRequest("Company name is required");
      }
      profile = new RecruiterProfile({
        user: userId,
        companyName: updateData.companyName,
      });
    }

    // Update allowed fields
    const allowedFields = [
      "companyName",
      "companyWebsite",
      "companyLogo",
      "companyDescription",
      "companySize",
      "industry",
      "positionTitle",
      "hiringRegions",
      "linkedinUrl",
      "isPublic",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        profile[field] = updateData[field];
      }
    });

    await profile.save();

    return profile;
  }

  /**
   * Add skill to developer profile
   * @param {ObjectId} userId
   * @param {string} skillSlug
   */
  async addSkill(userId, skillSlug) {
    const profile = await DeveloperProfile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound("Developer profile not found");
    }

    await profile.addSkill(skillSlug);

    // Increment skill usage count
    await Skill.incrementUsage([skillSlug]);

    return profile;
  }

  /**
   * Remove skill from developer profile
   * @param {ObjectId} userId
   * @param {string} skillSlug
   */
  async removeSkill(userId, skillSlug) {
    const profile = await DeveloperProfile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound("Developer profile not found");
    }

    await profile.removeSkill(skillSlug);

    // Decrement skill usage count
    await Skill.decrementUsage([skillSlug]);

    return profile;
  }

  /**
   * Pin a repository
   * @param {ObjectId} userId
   * @param {ObjectId} repoId
   */
  async pinRepo(userId, repoId) {
    const profile = await DeveloperProfile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound("Developer profile not found");
    }

    await profile.pinRepo(repoId);

    return profile;
  }

  /**
   * Unpin a repository
   * @param {ObjectId} userId
   * @param {ObjectId} repoId
   */
  async unpinRepo(userId, repoId) {
    const profile = await DeveloperProfile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound("Developer profile not found");
    }

    await profile.unpinRepo(repoId);

    return profile;
  }
}

module.exports = new ProfileService();
