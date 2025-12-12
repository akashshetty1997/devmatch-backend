/**
 * @file src/controllers/DeveloperController.js
 * @description Developer profile controller
 */

const User = require("../models/User");
const DeveloperProfile = require("../models/DeveloperProfile");
const Skill = require("../models/Skill");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPaginationMeta } = require("../utils/helpers");

/**
 * @desc    Get all developers (with filters)
 * @route   GET /api/developers
 * @access  Public (with optional auth)
 */
const getDevelopers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { q, skills, minExp, maxExp, country, openToWork, sort } = req.query;

  // Build filter
  const filter = { isPublic: true };

  // EXCLUDE LOGGED-IN USER FROM RESULTS
  if (req.user) {
    filter.user = { $ne: req.user._id };
  }

  // Search by name/headline
  if (q && q.trim()) {
    filter.$or = [
      { headline: { $regex: q, $options: "i" } },
      { bio: { $regex: q, $options: "i" } },
    ];
  }

  // Filter by skills
  if (skills && skills.trim()) {
    const skillArray = skills.split(",").map((s) => s.trim().toLowerCase());
    filter.skills = { $in: skillArray };
  }

  // Filter by experience
  if (minExp || maxExp) {
    filter.yearsOfExperience = {};
    if (minExp) {
      filter.yearsOfExperience.$gte = parseInt(minExp, 10);
    }
    if (maxExp) {
      filter.yearsOfExperience.$lte = parseInt(maxExp, 10);
    }
  }

  // Filter by country
  if (country && country.trim()) {
    filter["location.country"] = { $regex: country, $options: "i" };
  }

  // Filter by open to work
  if (openToWork === "true" || openToWork === true) {
    filter.isOpenToWork = true;
  }

  // Build sort
  let sortOption = { profileCompleteness: -1, createdAt: -1 };
  if (sort === "newest") {
    sortOption = { createdAt: -1 };
  } else if (sort === "experience") {
    sortOption = { yearsOfExperience: -1 };
  } else if (sort === "name") {
    sortOption = { "user.username": 1 };
  }

  const [developers, total] = await Promise.all([
    DeveloperProfile.find(filter)
      .populate("user", "username avatar")
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    DeveloperProfile.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return ApiResponse.success(res, "Developers retrieved successfully", {
    developers,
    pagination,
  });
});

/**
 * @desc    Get featured developers
 * @route   GET /api/developers/featured
 * @access  Public
 */
const getFeaturedDevelopers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 6;

  const developers = await DeveloperProfile.find({
    isPublic: true,
    isOpenToWork: true,
    profileCompleteness: { $gte: 50 },
  })
    .populate("user", "username avatar")
    .sort({ profileCompleteness: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return ApiResponse.success(res, "Featured developers retrieved", developers);
});

/**
 * @desc    Search developers
 * @route   GET /api/developers/search
 * @access  Public
 */
const searchDevelopers = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    throw ApiError.badRequest("Search query must be at least 2 characters");
  }

  const searchRegex = new RegExp(q.trim(), "i");

  const developers = await DeveloperProfile.find({
    isPublic: true,
    $or: [
      { headline: searchRegex },
      { bio: searchRegex },
      { skills: { $in: [searchRegex] } },
    ],
  })
    .populate("user", "username avatar")
    .limit(parseInt(limit, 10))
    .lean();

  return ApiResponse.success(res, "Search results", developers);
});

/**
 * @desc    Get developer by username
 * @route   GET /api/developers/:username
 * @access  Public
 */
const getDeveloperByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Prevent "me" from being treated as username
  if (username === "me") {
    throw ApiError.badRequest("Invalid username");
  }

  // Find user by username
  const user = await User.findOne({
    username: username.toLowerCase(),
    role: "DEVELOPER",
  }).lean();

  if (!user) {
    throw ApiError.notFound("Developer not found");
  }

  // Find developer profile
  const profile = await DeveloperProfile.findOne({ user: user._id })
    .populate("user", "username avatar email createdAt")
    .populate("pinnedRepos")
    .lean();

  if (!profile) {
    throw ApiError.notFound("Developer profile not found");
  }

  // Check if viewing own profile
  const isOwner = req.user && req.user._id.toString() === user._id.toString();

  // Hide private info if not owner
  if (!isOwner && !profile.isPublic) {
    throw ApiError.forbidden("This profile is private");
  }

  // Build response
  const response = {
    ...profile,
    isOwner,
  };

  // Remove sensitive info for non-owners
  if (!isOwner && response.user) {
    delete response.user.email;
  }

  return ApiResponse.success(res, "Developer profile retrieved", response);
});

/**
 * @desc    Get my developer profile
 * @route   GET /api/developers/me
 * @access  Private (Developer)
 */
const getMyProfile = asyncHandler(async (req, res) => {
  let profile = await DeveloperProfile.findOne({ user: req.user._id })
    .populate("pinnedRepos")
    .lean();

  if (!profile) {
    // Create profile if doesn't exist
    const newProfile = await DeveloperProfile.create({ user: req.user._id });
    profile = newProfile.toObject();
  }

  return ApiResponse.success(res, "Profile retrieved", profile);
});

/**
 * @desc    Update my developer profile
 * @route   PUT /api/developers/me
 * @access  Private (Developer)
 */
const updateMyProfile = asyncHandler(async (req, res) => {
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

  // Filter body to allowed fields
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Normalize skills to lowercase
  if (updates.skills && Array.isArray(updates.skills)) {
    updates.skills = updates.skills.map((s) => s.toLowerCase().trim());
  }

  // Find and update (or create)
  let profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = new DeveloperProfile({ user: req.user._id, ...updates });
  } else {
    Object.assign(profile, updates);
  }

  await profile.save();

  // Return updated profile
  const updatedProfile = await DeveloperProfile.findById(profile._id)
    .populate("pinnedRepos")
    .lean();

  return ApiResponse.success(res, "Profile updated successfully", updatedProfile);
});

/**
 * @desc    Add skill to profile
 * @route   POST /api/developers/me/skills
 * @access  Private (Developer)
 */
const addSkill = asyncHandler(async (req, res) => {
  const { skill } = req.body;

  if (!skill || !skill.trim()) {
    throw ApiError.badRequest("Skill is required");
  }

  let profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = await DeveloperProfile.create({ user: req.user._id });
  }

  const skillSlug = skill.toLowerCase().trim();

  // Check if skill already exists
  if (profile.skills.includes(skillSlug)) {
    throw ApiError.badRequest("Skill already added");
  }

  profile.skills.push(skillSlug);
  await profile.save();

  // Increment skill usage count
  await Skill.incrementUsage([skillSlug]);

  return ApiResponse.success(res, "Skill added", { skills: profile.skills });
});

/**
 * @desc    Remove skill from profile
 * @route   DELETE /api/developers/me/skills/:skillSlug
 * @access  Private (Developer)
 */
const removeSkill = asyncHandler(async (req, res) => {
  const { skillSlug } = req.params;

  const profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    throw ApiError.notFound("Profile not found");
  }

  const normalizedSlug = skillSlug.toLowerCase().trim();

  // Check if skill exists
  if (!profile.skills.includes(normalizedSlug)) {
    throw ApiError.notFound("Skill not found in profile");
  }

  profile.skills = profile.skills.filter((s) => s !== normalizedSlug);
  await profile.save();

  // Decrement skill usage count
  await Skill.decrementUsage([normalizedSlug]);

  return ApiResponse.success(res, "Skill removed", { skills: profile.skills });
});

/**
 * @desc    Update all skills
 * @route   PUT /api/developers/me/skills
 * @access  Private (Developer)
 */
const updateSkills = asyncHandler(async (req, res) => {
  const { skills } = req.body;

  if (!Array.isArray(skills)) {
    throw ApiError.badRequest("Skills must be an array");
  }

  let profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = await DeveloperProfile.create({ user: req.user._id });
  }

  const oldSkills = [...profile.skills];
  const newSkills = skills.map((s) => s.toLowerCase().trim()).filter(Boolean);

  // Remove duplicates
  profile.skills = [...new Set(newSkills)];
  await profile.save();

  // Update usage counts
  const removedSkills = oldSkills.filter((s) => !profile.skills.includes(s));
  const addedSkills = profile.skills.filter((s) => !oldSkills.includes(s));

  if (removedSkills.length > 0) {
    await Skill.decrementUsage(removedSkills);
  }
  if (addedSkills.length > 0) {
    await Skill.incrementUsage(addedSkills);
  }

  return ApiResponse.success(res, "Skills updated", { skills: profile.skills });
});

/**
 * @desc    Get pinned repos
 * @route   GET /api/developers/me/pinned-repos
 * @access  Private (Developer)
 */
const getPinnedRepos = asyncHandler(async (req, res) => {
  const profile = await DeveloperProfile.findOne({ user: req.user._id })
    .populate("pinnedRepos")
    .lean();

  if (!profile) {
    return ApiResponse.success(res, "No pinned repos", []);
  }

  return ApiResponse.success(res, "Pinned repos retrieved", profile.pinnedRepos || []);
});

/**
 * @desc    Pin a repo
 * @route   POST /api/developers/me/pinned-repos
 * @access  Private (Developer)
 */
const pinRepo = asyncHandler(async (req, res) => {
  const { repoId } = req.body;

  if (!repoId) {
    throw ApiError.badRequest("Repo ID is required");
  }

  let profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = await DeveloperProfile.create({ user: req.user._id });
  }

  // Check if already pinned
  if (profile.pinnedRepos.some((id) => id.toString() === repoId)) {
    throw ApiError.badRequest("Repo already pinned");
  }

  // Check limit (max 6)
  if (profile.pinnedRepos.length >= 6) {
    throw ApiError.badRequest("Maximum 6 pinned repositories allowed");
  }

  profile.pinnedRepos.push(repoId);
  await profile.save();

  // Return updated pinned repos
  const updatedProfile = await DeveloperProfile.findById(profile._id)
    .populate("pinnedRepos")
    .lean();

  return ApiResponse.success(res, "Repo pinned", updatedProfile.pinnedRepos);
});

/**
 * @desc    Unpin a repo
 * @route   DELETE /api/developers/me/pinned-repos/:repoId
 * @access  Private (Developer)
 */
const unpinRepo = asyncHandler(async (req, res) => {
  const { repoId } = req.params;

  const profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    throw ApiError.notFound("Profile not found");
  }

  // Check if repo is pinned
  if (!profile.pinnedRepos.some((id) => id.toString() === repoId)) {
    throw ApiError.notFound("Repo not found in pinned repos");
  }

  profile.pinnedRepos = profile.pinnedRepos.filter(
    (id) => id.toString() !== repoId
  );
  await profile.save();

  // Return updated pinned repos
  const updatedProfile = await DeveloperProfile.findById(profile._id)
    .populate("pinnedRepos")
    .lean();

  return ApiResponse.success(res, "Repo unpinned", updatedProfile.pinnedRepos || []);
});

/**
 * @desc    Update work preferences
 * @route   PUT /api/developers/me/work-preferences
 * @access  Private (Developer)
 */
const updateWorkPreferences = asyncHandler(async (req, res) => {
  const { isOpenToWork, preferredWorkTypes } = req.body;

  let profile = await DeveloperProfile.findOne({ user: req.user._id });

  if (!profile) {
    profile = await DeveloperProfile.create({ user: req.user._id });
  }

  if (isOpenToWork !== undefined) {
    profile.isOpenToWork = isOpenToWork;
  }

  if (preferredWorkTypes && Array.isArray(preferredWorkTypes)) {
    // Validate work types
    const validTypes = ["REMOTE", "ONSITE", "HYBRID"];
    profile.preferredWorkTypes = preferredWorkTypes.filter((t) =>
      validTypes.includes(t)
    );
  }

  await profile.save();

  return ApiResponse.success(res, "Work preferences updated", {
    isOpenToWork: profile.isOpenToWork,
    preferredWorkTypes: profile.preferredWorkTypes,
  });
});

/**
 * @desc    Get developer's pinned repos by username (public)
 * @route   GET /api/developers/:username/pinned-repos
 * @access  Public
 */
const getDeveloperPinnedRepos = asyncHandler(async (req, res) => {
  const { username } = req.params;

  // Find user by username
  const user = await User.findOne({ 
    username: username.toLowerCase(), 
    role: "DEVELOPER" 
  });
  
  if (!user) {
    throw ApiError.notFound("Developer not found");
  }

  // Find developer profile with pinned repos populated
  const profile = await DeveloperProfile.findOne({ user: user._id })
    .populate("pinnedRepos");

  if (!profile) {
    throw ApiError.notFound("Developer profile not found");
  }

  // Check if profile is public (skip check if viewing own profile)
  const isOwnProfile = req.user && req.user._id.equals(user._id);
  if (!profile.isPublic && !isOwnProfile) {
    throw ApiError.forbidden("This profile is private");
  }

  return ApiResponse.success(res, "Pinned repos retrieved", {
    pinnedRepos: profile.pinnedRepos || [],
  });
});

/**
 * @desc    Get developer's GitHub repos by username (public)
 * @route   GET /api/developers/:username/repos
 * @access  Public
 */
const getDeveloperRepos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Find user by username
  const user = await User.findOne({ 
    username: username.toLowerCase(), 
    role: "DEVELOPER" 
  });
  
  if (!user) {
    throw ApiError.notFound("Developer not found");
  }

  // Find developer profile
  const profile = await DeveloperProfile.findOne({ user: user._id });

  if (!profile) {
    throw ApiError.notFound("Developer profile not found");
  }

  // Check if profile is public (skip check if viewing own profile)
  const isOwnProfile = req.user && req.user._id.equals(user._id);
  if (!profile.isPublic && !isOwnProfile) {
    throw ApiError.forbidden("This profile is private");
  }

  // If developer has GitHub username, fetch repos from GitHub
  if (profile.githubUsername) {
    try {
      const GitHubService = require("../services/GitHubService");
      const repos = await GitHubService.getUserRepositories(profile.githubUsername, {
        page: parseInt(page, 10),
        perPage: parseInt(limit, 10),
        sort: "updated",
        direction: "desc",
      });

      return ApiResponse.success(res, "Repositories retrieved", {
        repos,
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: repos.length,
        },
      });
    } catch (error) {
      console.error("Failed to fetch GitHub repos:", error.message);
      return ApiResponse.success(res, "Repositories retrieved", {
        repos: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: 0,
        },
      });
    }
  }

  // No GitHub username connected
  return ApiResponse.success(res, "No GitHub username connected", {
    repos: [],
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: 0,
    },
  });
});

module.exports = {
  getDevelopers,
  getFeaturedDevelopers,
  searchDevelopers,
  getDeveloperByUsername,
  getMyProfile,
  updateMyProfile,
  addSkill,
  removeSkill,
  updateSkills,
  getPinnedRepos,
  pinRepo,
  unpinRepo,
  updateWorkPreferences,
  getDeveloperPinnedRepos,
  getDeveloperRepos, 
};