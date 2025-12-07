/**
 * @file src/routes/profile.routes.js
 * @description Profile management routes
 */

const express = require("express");
const router = express.Router();
const {
  getDeveloperProfile,
  updateDeveloperProfile,
  getRecruiterProfile,
  updateRecruiterProfile,
  addSkill,
  removeSkill,
  pinRepo,
  unpinRepo,
} = require("../controllers/ProfileController");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  validateDeveloperProfile,
  validateRecruiterProfile,
} = require("../validators");

// All routes are protected
router.use(protect);

// Developer profile routes
router
  .route("/developer")
  .get(restrictTo("DEVELOPER"), getDeveloperProfile)
  .put(
    restrictTo("DEVELOPER"),
    validateDeveloperProfile,
    updateDeveloperProfile
  );

// Recruiter profile routes
router
  .route("/recruiter")
  .get(restrictTo("RECRUITER"), getRecruiterProfile)
  .put(
    restrictTo("RECRUITER"),
    validateRecruiterProfile,
    updateRecruiterProfile
  );

// Skills management (Developer only)
router.post("/skills", restrictTo("DEVELOPER"), addSkill);
router.delete("/skills/:skillSlug", restrictTo("DEVELOPER"), removeSkill);

// Pinned repos management (Developer only)
router.post("/repos/pin", restrictTo("DEVELOPER"), pinRepo);
router.delete("/repos/pin/:repoId", restrictTo("DEVELOPER"), unpinRepo);

module.exports = router;
