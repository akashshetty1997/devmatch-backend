/**
 * @file src/routes/developer.routes.js
 * @description Developer profile routes
 */

const express = require("express");
const router = express.Router();
const DeveloperController = require("../controllers/DeveloperController");
const { protect, optionalAuth, restrictTo } = require("../middleware/auth.middleware");

// ==================== PUBLIC STATIC ROUTES (must come first) ====================

// GET /api/developers - Get all developers (exclude self if logged in)
router.get("/", optionalAuth, DeveloperController.getDevelopers);

// GET /api/developers/featured - Get featured developers
router.get("/featured", optionalAuth, DeveloperController.getFeaturedDevelopers);

// GET /api/developers/search - Search developers
router.get("/search", optionalAuth, DeveloperController.searchDevelopers);

// ==================== PROTECTED /me ROUTES (must come BEFORE /:username) ====================

// GET /api/developers/me - Get my developer profile
router.get(
  "/me",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.getMyProfile
);

// PUT /api/developers/me - Update my developer profile
router.put(
  "/me",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.updateMyProfile
);

// PUT /api/developers/me/work-preferences - Update work preferences
router.put(
  "/me/work-preferences",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.updateWorkPreferences
);

// ==================== SKILLS ====================

router.post(
  "/me/skills",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.addSkill
);

router.put(
  "/me/skills",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.updateSkills
);

router.delete(
  "/me/skills/:skillSlug",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.removeSkill
);

// ==================== PINNED REPOS ====================

router.get(
  "/me/pinned-repos",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.getPinnedRepos
);

router.post(
  "/me/pinned-repos",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.pinRepo
);

router.delete(
  "/me/pinned-repos/:repoId",
  protect,
  restrictTo("DEVELOPER"),
  DeveloperController.unpinRepo
);

// ==================== DYNAMIC ROUTE (must come LAST) ====================

// GET /api/developers/:username - Get developer by username
router.get(
  "/:username",
  optionalAuth,
  DeveloperController.getDeveloperByUsername
);

module.exports = router;