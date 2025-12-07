/**
 * @file src/routes/job.routes.js
 * @description Job routes with nested applications
 */

const express = require("express");
const router = express.Router();
const JobController = require("../controllers/JobController");
const {
  applyToJob,
  getJobApplications,
} = require("../controllers/ApplicationController");
const {
  protect,
  optionalAuth,
  restrictTo,
} = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Public routes
router.get("/", optionalAuth, JobController.getJobs);
router.get("/featured", JobController.getFeaturedJobs);
router.get(
  "/:jobId",
  optionalAuth,
  validateObjectId("jobId"),
  JobController.getJob
);

// Protected routes - Recruiter only
router.post("/", protect, restrictTo("RECRUITER"), JobController.createJob);
router.put(
  "/:jobId",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("jobId"),
  JobController.updateJob
);
router.patch(
  "/:jobId/status",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("jobId"),
  JobController.toggleJobStatus
);
router.delete(
  "/:jobId",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("jobId"),
  JobController.deleteJob
);

// Nested application routes
router.post(
  "/:jobId/applications",
  protect,
  restrictTo("DEVELOPER"),
  validateObjectId("jobId"),
  applyToJob
);

router.get(
  "/:jobId/applications",
  protect,
  restrictTo("RECRUITER"),
  validateObjectId("jobId"),
  getJobApplications
);

module.exports = router;
