/**
 * @file src/controllers/AdminController.js
 * @description Admin controller for dashboard and management
 */

const User = require("../models/User");
const Skill = require("../models/Skill");
const JobPost = require("../models/JobPost");
const Application = require("../models/Application");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPaginationMeta } = require("../utils/helpers");

// ==================== DASHBOARD ====================

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard/stats
 * @access  Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // User stats
  const [
    totalUsers,
    developers,
    recruiters,
    admins,
    newUsersThisWeek,
    bannedUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "DEVELOPER" }),
    User.countDocuments({ role: "RECRUITER" }),
    User.countDocuments({ role: "ADMIN" }),
    User.countDocuments({ createdAt: { $gte: weekAgo } }),
    User.countDocuments({ status: "BANNED" }),
  ]);

  // Job stats
  const [totalJobs, activeJobs, newJobsThisWeek] = await Promise.all([
    JobPost.countDocuments(),
    JobPost.countDocuments({ isActive: true }),
    JobPost.countDocuments({ createdAt: { $gte: weekAgo } }),
  ]);

  // Application stats (if you have Application model)
  let applicationStats = { total: 0, pending: 0, thisWeek: 0 };
  try {
    const [totalApps, pendingApps, appsThisWeek] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ status: "PENDING" }),
      Application.countDocuments({ createdAt: { $gte: weekAgo } }),
    ]);
    applicationStats = {
      total: totalApps,
      pending: pendingApps,
      thisWeek: appsThisWeek,
    };
  } catch (err) {
    // Application model might not exist
  }

  // Skill stats
  const [totalSkills, activeSkills] = await Promise.all([
    Skill.countDocuments(),
    Skill.countDocuments({ isActive: true }),
  ]);

  return ApiResponse.success(res, "Dashboard stats retrieved", {
    users: {
      total: totalUsers,
      developers,
      recruiters,
      admins,
      newThisWeek: newUsersThisWeek,
      banned: bannedUsers,
    },
    jobs: {
      total: totalJobs,
      active: activeJobs,
      inactive: totalJobs - activeJobs,
      newThisWeek: newJobsThisWeek,
    },
    applications: applicationStats,
    skills: {
      total: totalSkills,
      active: activeSkills,
      inactive: totalSkills - activeSkills,
    },
  });
});

/**
 * @desc    Get recent users
 * @route   GET /api/admin/dashboard/recent-users
 * @access  Admin
 */
const getRecentUsers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;

  const users = await User.find()
    .select("username email role status avatar createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return ApiResponse.success(res, "Recent users retrieved", { users });
});

/**
 * @desc    Get recent activity
 * @route   GET /api/admin/dashboard/activity
 * @access  Admin
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  // Build activity from recent events
  const activities = [];

  // Recent user registrations
  const recentUsers = await User.find()
    .select("username createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  recentUsers.forEach((user) => {
    activities.push({
      type: "USER_REGISTERED",
      message: `New user @${user.username} registered`,
      createdAt: user.createdAt,
    });
  });

  // Recent job posts
  const recentJobs = await JobPost.find()
    .select("title companyName createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  recentJobs.forEach((job) => {
    activities.push({
      type: "JOB_POSTED",
      message: `New job "${job.title}" posted by ${job.companyName}`,
      createdAt: job.createdAt,
    });
  });

  // Sort all activities by date and limit
  activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const limitedActivities = activities.slice(0, limit);

  return ApiResponse.success(res, "Recent activity retrieved", {
    activities: limitedActivities,
  });
});

// ==================== USER MANAGEMENT ====================

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Admin
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, role, status } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    filter.role = role;
  }

  if (status) {
    filter.status = status;
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return ApiResponse.success(res, "Users retrieved", { users, pagination });
});

/**
 * @desc    Get single user
 * @route   GET /api/admin/users/:userId
 * @access  Admin
 */
const getUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("-password").lean();

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return ApiResponse.success(res, "User retrieved", user);
});

/**
 * @desc    Update user role
 * @route   PATCH /api/admin/users/:userId/role
 * @access  Admin
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ["DEVELOPER", "RECRUITER", "ADMIN"];
  if (!validRoles.includes(role)) {
    throw ApiError.badRequest("Invalid role");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return ApiResponse.success(res, "User role updated", user);
});

/**
 * @desc    Ban user
 * @route   PATCH /api/admin/users/:userId/ban
 * @access  Admin
 */
const banUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { status: "BANNED" },
    { new: true }
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return ApiResponse.success(res, "User banned", user);
});

/**
 * @desc    Unban user
 * @route   PATCH /api/admin/users/:userId/unban
 * @access  Admin
 */
const unbanUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { status: "ACTIVE" },
    { new: true }
  ).select("-password");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return ApiResponse.success(res, "User unbanned", user);
});

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:userId
 * @access  Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  return ApiResponse.success(res, "User deleted");
});

// ==================== SKILL MANAGEMENT ====================

/**
 * @desc    Get all skills (admin)
 * @route   GET /api/admin/skills
 * @access  Admin
 */
const getSkills = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, category, isActive } = req.query;

  const filter = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  if (category) {
    filter.category = category;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  const [skills, total] = await Promise.all([
    Skill.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Skill.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return ApiResponse.success(res, "Skills retrieved", { skills, pagination });
});

/**
 * @desc    Create skill
 * @route   POST /api/admin/skills
 * @access  Admin
 */
const createSkill = asyncHandler(async (req, res) => {
  const { name, category, icon } = req.body;

  const existingSkill = await Skill.findOne({
    name: { $regex: `^${name}$`, $options: "i" },
  });

  if (existingSkill) {
    throw ApiError.conflict(`Skill "${name}" already exists`);
  }

  const skill = await Skill.create({
    name,
    category,
    icon,
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });

  return ApiResponse.created(res, "Skill created", skill);
});

/**
 * @desc    Update skill
 * @route   PUT /api/admin/skills/:skillId
 * @access  Admin
 */
const updateSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;
  const { name, category, icon, isActive } = req.body;

  const skill = await Skill.findById(skillId);

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  if (name) skill.name = name;
  if (category) skill.category = category;
  if (icon !== undefined) skill.icon = icon;
  if (isActive !== undefined) skill.isActive = isActive;
  skill.updatedBy = req.user._id;

  await skill.save();

  return ApiResponse.success(res, "Skill updated", skill);
});

/**
 * @desc    Activate skill
 * @route   PATCH /api/admin/skills/:skillId/activate
 * @access  Admin
 */
const activateSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  const skill = await Skill.findByIdAndUpdate(
    skillId,
    { isActive: true },
    { new: true }
  );

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  return ApiResponse.success(res, "Skill activated", skill);
});

/**
 * @desc    Deactivate skill
 * @route   PATCH /api/admin/skills/:skillId/deactivate
 * @access  Admin
 */
const deactivateSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  const skill = await Skill.findByIdAndUpdate(
    skillId,
    { isActive: false },
    { new: true }
  );

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  return ApiResponse.success(res, "Skill deactivated", skill);
});

/**
 * @desc    Delete skill
 * @route   DELETE /api/admin/skills/:skillId
 * @access  Admin
 */
const deleteSkill = asyncHandler(async (req, res) => {
  const { skillId } = req.params;

  const skill = await Skill.findByIdAndDelete(skillId);

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  return ApiResponse.success(res, "Skill deleted");
});

// ==================== JOB MANAGEMENT ====================

/**
 * @desc    Get all jobs (admin)
 * @route   GET /api/admin/jobs
 * @access  Admin
 */
const getJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, status, featured } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { companyName: { $regex: search, $options: "i" } },
    ];
  }

  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  if (featured !== undefined) {
    filter.isFeatured = featured === "true";
  }

  const [jobs, total] = await Promise.all([
    JobPost.find(filter)
      .populate("recruiter", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    JobPost.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return ApiResponse.success(res, "Jobs retrieved", { jobs, pagination });
});

/**
 * @desc    Toggle job featured status
 * @route   PATCH /api/admin/jobs/:jobId/featured
 * @access  Admin
 */
const toggleJobFeatured = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { featured } = req.body;

  const job = await JobPost.findByIdAndUpdate(
    jobId,
    { isFeatured: featured },
    { new: true }
  );

  if (!job) {
    throw ApiError.notFound("Job not found");
  }

  return ApiResponse.success(res, "Job updated", job);
});

/**
 * @desc    Deactivate job
 * @route   PATCH /api/admin/jobs/:jobId/deactivate
 * @access  Admin
 */
const deactivateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await JobPost.findByIdAndUpdate(
    jobId,
    { isActive: false },
    { new: true }
  );

  if (!job) {
    throw ApiError.notFound("Job not found");
  }

  return ApiResponse.success(res, "Job deactivated", job);
});

/**
 * @desc    Delete job
 * @route   DELETE /api/admin/jobs/:jobId
 * @access  Admin
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await JobPost.findByIdAndDelete(jobId);

  if (!job) {
    throw ApiError.notFound("Job not found");
  }

  return ApiResponse.success(res, "Job deleted");
});

module.exports = {
  // Dashboard
  getDashboardStats,
  getRecentUsers,
  getRecentActivity,
  // Users
  getUsers,
  getUser,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  // Skills
  getSkills,
  createSkill,
  updateSkill,
  activateSkill,
  deactivateSkill,
  deleteSkill,
  // Jobs
  getJobs,
  toggleJobFeatured,
  deactivateJob,
  deleteJob,
};