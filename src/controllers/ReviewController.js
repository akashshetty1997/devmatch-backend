/**
 * @file src/controllers/ReviewController.js
 * @description Review endpoints
 */

const ReviewService = require("../services/ReviewService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User"); // Import User model
const ApiError = require("../utils/ApiError"); // Import ApiError
const Review = require("../models/Review"); // Import Review model

/**
 * @desc    Create a review for a developer
 * @route   POST /api/reviews/developer/:developerId
 * @access  Private
 */
const reviewDeveloper = asyncHandler(async (req, res) => {
  const { developerId } = req.params;
  const { rating, content, title } = req.body;

  const review = await ReviewService.reviewDeveloper(
    req.user._id,
    developerId,
    { rating, content, title }
  );

  return ApiResponse.created(res, "Review created", review);
});

/**
 * @desc    Create a review for a repo
 * @route   POST /api/reviews/repo/:repoId
 * @access  Private
 */
const reviewRepo = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const { rating, content, title } = req.body;

  const review = await ReviewService.reviewRepo(req.user._id, repoId, {
    rating,
    content,
    title,
  });

  return ApiResponse.created(res, "Review created", review);
});

/**
 * @desc    Get reviews for a developer
 * @route   GET /api/reviews/developer/:developerId
 * @access  Public
 */
const getDeveloperReviews = asyncHandler(async (req, res) => {
  const { developerId } = req.params;
  const { page, limit } = req.query;

  const result = await ReviewService.getDeveloperReviews(developerId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Reviews retrieved", result);
});

/**
 * @desc    Get reviews for a repo
 * @route   GET /api/reviews/repo/:repoId
 * @access  Public
 */
const getRepoReviews = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const { page, limit } = req.query;

  const result = await ReviewService.getRepoReviews(repoId, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Reviews retrieved", result);
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:reviewId
 * @access  Private (owner only)
 */
const updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, content, title } = req.body;

  const review = await ReviewService.updateReview(reviewId, req.user._id, {
    rating,
    content,
    title,
  });

  return ApiResponse.success(res, "Review updated", review);
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:reviewId
 * @access  Private (owner or admin)
 */
const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const isAdmin = req.user.role === "ADMIN";

  await ReviewService.deleteReview(reviewId, req.user._id, isAdmin);

  return ApiResponse.success(res, "Review deleted");
});

/**
 * @desc    Get reviews by current user
 * @route   GET /api/reviews/me
 * @access  Private
 */
const getMyReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await ReviewService.getReviewsByUser(req.user._id, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Your reviews retrieved", result);
});

/**
 * @desc    Get reviews by username (public)
 * @route   GET /api/reviews/user/:username
 * @access  Public
 */
const getUserReviews = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Find user by username
  const user = await User.findOne({ username: username.toLowerCase() });
  
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  const [reviews, total] = await Promise.all([
    Review.find({ reviewer: user._id })
      .populate("repo", "name fullName description stars language")
      .populate("developer", "headline githubUsername")
      .populate("reviewer", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean(),
    Review.countDocuments({ reviewer: user._id }),
  ]);

  return ApiResponse.success(res, "User reviews retrieved", {
    reviews,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  });
});

module.exports = {
  reviewDeveloper,
  reviewRepo,
  getDeveloperReviews,
  getRepoReviews,
  updateReview,
  deleteReview,
  getMyReviews,
  getUserReviews, 
};
