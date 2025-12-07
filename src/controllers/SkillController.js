/**
 * @file src/controllers/SkillController.js
 * @description Skill management controller (Admin + Public endpoints)
 */

const Skill = require("../models/Skill");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { parsePagination, buildPaginationMeta } = require("../utils/helpers");

/**
 * @desc    Get all active skills (grouped by category)
 * @route   GET /api/skills
 * @access  Public
 */
const getSkills = asyncHandler(async (req, res) => {
  const { grouped } = req.query;

  if (grouped === "true") {
    // Return skills grouped by category
    const skills = await Skill.getGroupedByCategory();
    return ApiResponse.success(res, "Skills retrieved successfully", skills);
  }

  // Return flat list of active skills
  const skills = await Skill.find({ isActive: true })
    .select("name slug category icon")
    .sort({ category: 1, name: 1 })
    .lean();

  return ApiResponse.success(res, "Skills retrieved successfully", skills);
});

/**
 * @desc    Search skills by name (for autocomplete)
 * @route   GET /api/skills/search?q=react
 * @access  Public
 */
const searchSkills = asyncHandler(async (req, res) => {
  const { q, category, limit = 10 } = req.query;

  if (!q || q.length < 1) {
    throw ApiError.badRequest("Search query is required");
  }

  const query = {
    isActive: true,
    name: { $regex: q, $options: "i" },
  };

  if (category) {
    query.category = category;
  }

  const skills = await Skill.find(query)
    .select("name slug category")
    .limit(parseInt(limit, 10))
    .sort({ usageCount: -1, name: 1 })
    .lean();

  return ApiResponse.success(res, "Skills found", skills);
});

/**
 * @desc    Get all skills (Admin - includes inactive)
 * @route   GET /api/admin/skills
 * @access  Admin
 */
const getAllSkillsAdmin = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { category, isActive, search } = req.query;

  // Build filter
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const [skills, total] = await Promise.all([
    Skill.find(filter)
      .populate("createdBy", "username")
      .populate("updatedBy", "username")
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Skill.countDocuments(filter),
  ]);

  const pagination = buildPaginationMeta(total, page, limit);

  return ApiResponse.success(res, "Skills retrieved successfully", {
    skills,
    pagination,
  });
});

/**
 * @desc    Create new skill
 * @route   POST /api/admin/skills
 * @access  Admin
 */
const createSkill = asyncHandler(async (req, res) => {
  const { name, category, icon } = req.body;

  // Check if skill with same name exists
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

  return ApiResponse.created(res, "Skill created successfully", skill);
});

/**
 * @desc    Update skill
 * @route   PUT /api/admin/skills/:id
 * @access  Admin
 */
const updateSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, category, icon, isActive } = req.body;

  const skill = await Skill.findById(id);

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  // Check if new name conflicts with existing skill
  if (name && name !== skill.name) {
    const existingSkill = await Skill.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingSkill) {
      throw ApiError.conflict(`Skill "${name}" already exists`);
    }
  }

  // Update fields
  if (name) skill.name = name;
  if (category) skill.category = category;
  if (icon !== undefined) skill.icon = icon;
  if (isActive !== undefined) skill.isActive = isActive;
  skill.updatedBy = req.user._id;

  await skill.save();

  return ApiResponse.success(res, "Skill updated successfully", skill);
});

/**
 * @desc    Delete skill (soft delete - set isActive to false)
 * @route   DELETE /api/admin/skills/:id
 * @access  Admin
 */
const deleteSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;

  const skill = await Skill.findById(id);

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  if (permanent === "true") {
    // Permanent delete (only if usageCount is 0)
    if (skill.usageCount > 0) {
      throw ApiError.badRequest(
        `Cannot permanently delete skill with ${skill.usageCount} usages. Deactivate it instead.`
      );
    }
    await skill.deleteOne();
    return ApiResponse.success(res, "Skill permanently deleted");
  }

  // Soft delete
  skill.isActive = false;
  skill.updatedBy = req.user._id;
  await skill.save();

  return ApiResponse.success(res, "Skill deactivated successfully", skill);
});

/**
 * @desc    Restore soft-deleted skill
 * @route   PATCH /api/admin/skills/:id/restore
 * @access  Admin
 */
const restoreSkill = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const skill = await Skill.findById(id);

  if (!skill) {
    throw ApiError.notFound("Skill not found");
  }

  if (skill.isActive) {
    throw ApiError.badRequest("Skill is already active");
  }

  skill.isActive = true;
  skill.updatedBy = req.user._id;
  await skill.save();

  return ApiResponse.success(res, "Skill restored successfully", skill);
});

module.exports = {
  getSkills,
  searchSkills,
  getAllSkillsAdmin,
  createSkill,
  updateSkill,
  deleteSkill,
  restoreSkill,
};
