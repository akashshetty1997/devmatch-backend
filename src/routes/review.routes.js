/**
 * @file src/routes/review.routes.js
 * @description Review routes
 */

const express = require("express");
const router = express.Router();
const {
  reviewDeveloper,
  reviewRepo,
  getDeveloperReviews,
  getRepoReviews,
  updateReview,
  deleteReview,
  getMyReviews,
} = require("../controllers/ReviewController");
const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Get my reviews
router.get("/me", protect, getMyReviews);

// Developer reviews
router
  .route("/developer/:developerId")
  .get(validateObjectId("developerId"), getDeveloperReviews)
  .post(protect, validateObjectId("developerId"), reviewDeveloper);

// Repo reviews
router
  .route("/repo/:repoId")
  .get(validateObjectId("repoId"), getRepoReviews)
  .post(protect, validateObjectId("repoId"), reviewRepo);

// Single review operations
router
  .route("/:reviewId")
  .put(protect, validateObjectId("reviewId"), updateReview)
  .delete(protect, validateObjectId("reviewId"), deleteReview);

module.exports = router;
