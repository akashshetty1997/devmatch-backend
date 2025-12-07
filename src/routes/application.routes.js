/**
 * @file src/routes/application.routes.js
 * @description Application routes
 */

const express = require("express");
const router = express.Router();
const {
  applyToJob,
  getJobApplications,
  getMyApplications,
  getApplication,
  updateApplicationStatus,
  addRecruiterNotes,
  withdrawApplication,
} = require("../controllers/ApplicationController");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Developer: Get my applications
router.get("/me", protect, restrictTo("DEVELOPER"), getMyApplications);

// Get single application
router.get(
  "/:applicationId",
  protect,
  validateObjectId("applicationId"),
  getApplication
);

// Update application status (Recruiter)
router.patch(
  "/:applicationId/status",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("applicationId"),
  updateApplicationStatus
);

// Add recruiter notes
router.patch(
  "/:applicationId/notes",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("applicationId"),
  addRecruiterNotes
);

// Withdraw application (Developer)
router.delete(
  "/:applicationId",
  protect,
  restrictTo("DEVELOPER"),
  validateObjectId("applicationId"),
  withdrawApplication
);

module.exports = router;
