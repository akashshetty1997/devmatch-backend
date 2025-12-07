/**
 * @file src/controllers/ProfileController.js
 * @description Profile management endpoints
 */

const ProfileService = require("../services/ProfileService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get my developer profile
 * @route   GET /api/profile/developer
 * @access  Private (Developer)
 */
const getDeveloperProfile = asyncHandler(async (req, res) => {
  const profile = await ProfileService.getDeveloperProfile(req.user._id);

  return ApiResponse.success(res, "Developer profile retrieved", profile);
});

/**
 * @desc    Update developer profile
 * @route   PUT /api/profile/developer
 * @access  Private (Developer)
 */
const updateDeveloperProfile = asyncHandler(async (req, res) => {
  const profile = await ProfileService.updateDeveloperProfile(
    req.user._id,
    req.body
  );

  return ApiResponse.success(res, "Developer profile updated", profile);
});

/**
 * @desc    Get my recruiter profile
 * @route   GET /api/profile/recruiter
 * @access  Private (Recruiter)
 */
const getRecruiterProfile = asyncHandler(async (req, res) => {
  const profile = await ProfileService.getRecruiterProfile(req.user._id);

  return ApiResponse.success(res, "Recruiter profile retrieved", profile);
});

/**
 * @desc    Update recruiter profile
 * @route   PUT /api/profile/recruiter
 * @access  Private (Recruiter)
 */
const updateRecruiterProfile = asyncHandler(async (req, res) => {
  const profile = await ProfileService.updateRecruiterProfile(
    req.user._id,
    req.body
  );

  return ApiResponse.success(res, "Recruiter profile updated", profile);
});

/**
 * @desc    Add skill to profile
 * @route   POST /api/profile/skills
 * @access  Private (Developer)
 */
const addSkill = asyncHandler(async (req, res) => {
  const { skillSlug } = req.body;

  const profile = await ProfileService.addSkill(req.user._id, skillSlug);

  return ApiResponse.success(res, "Skill added", profile);
});

/**
 * @desc    Remove skill from profile
 * @route   DELETE /api/profile/skills/:skillSlug
 * @access  Private (Developer)
 */
const removeSkill = asyncHandler(async (req, res) => {
  const { skillSlug } = req.params;

  const profile = await ProfileService.removeSkill(req.user._id, skillSlug);

  return ApiResponse.success(res, "Skill removed", profile);
});

/**
 * @desc    Pin a repository
 * @route   POST /api/profile/repos/pin
 * @access  Private (Developer)
 */
const pinRepo = asyncHandler(async (req, res) => {
  const { repoId } = req.body;

  const profile = await ProfileService.pinRepo(req.user._id, repoId);

  return ApiResponse.success(res, "Repository pinned", profile);
});

/**
 * @desc    Unpin a repository
 * @route   DELETE /api/profile/repos/pin/:repoId
 * @access  Private (Developer)
 */
const unpinRepo = asyncHandler(async (req, res) => {
  const { repoId } = req.params;

  const profile = await ProfileService.unpinRepo(req.user._id, repoId);

  return ApiResponse.success(res, "Repository unpinned", profile);
});

module.exports = {
  getDeveloperProfile,
  updateDeveloperProfile,
  getRecruiterProfile,
  updateRecruiterProfile,
  addSkill,
  removeSkill,
  pinRepo,
  unpinRepo,
};
