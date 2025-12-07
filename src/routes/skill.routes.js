/**
 * @file src/routes/skill.routes.js
 * @description Skill routes - Public and Admin endpoints
 */

const express = require("express");
const router = express.Router();
const {
  getSkills,
  searchSkills,
  getAllSkillsAdmin,
  createSkill,
  updateSkill,
  deleteSkill,
  restoreSkill,
} = require("../controllers/SkillController");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateSkill } = require("../validators/skill.validator");

// ==================== PUBLIC ROUTES ====================

// GET /api/skills - Get all active skills
router.get("/", getSkills);

// GET /api/skills/search?q=react - Search skills
router.get("/search", searchSkills);

// ==================== ADMIN ROUTES ====================

// GET /api/skills/admin - Get all skills (including inactive)
router.get("/admin", protect, restrictTo("ADMIN"), getAllSkillsAdmin);

// POST /api/skills/admin - Create new skill
router.post("/admin", protect, restrictTo("ADMIN"), validateSkill, createSkill);

// PUT /api/skills/admin/:id - Update skill
router.put(
  "/admin/:id",
  protect,
  restrictTo("ADMIN"),
  validateSkill,
  updateSkill
);

// DELETE /api/skills/admin/:id - Delete skill
router.delete("/admin/:id", protect, restrictTo("ADMIN"), deleteSkill);

// PATCH /api/skills/admin/:id/restore - Restore deleted skill
router.patch("/admin/:id/restore", protect, restrictTo("ADMIN"), restoreSkill);

module.exports = router;
