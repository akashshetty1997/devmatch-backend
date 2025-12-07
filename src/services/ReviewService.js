/**
 * @file src/services/ReviewService.js
 * @description Review business logic
 */

const Review = require("../models/Review");
const User = require("../models/User");
const RepoSnapshot = require("../models/RepoSnapshot");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");

class ReviewService {
  /**
   * Create a review for a developer
   * @param {ObjectId} reviewerId
   * @param {ObjectId} developerId
   * @param {Object} data - { rating, content, title }
   */
  async reviewDeveloper(reviewerId, developerId, data) {
    // Verify developer exists and is actually a developer
    const developer = await User.findOne({
      _id: developerId,
      role: "DEVELOPER",
      status: "ACTIVE",
    });

    if (!developer) {
      throw ApiError.notFound("Developer not found");
    }

    // Can't review yourself
    if (reviewerId.equals(developerId)) {
      throw ApiError.badRequest("You cannot review yourself");
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      reviewer: reviewerId,
      developer: developerId,
      isDeleted: false,
    });

    if (existingReview) {
      throw ApiError.conflict("You have already reviewed this developer");
    }

    // Create review
    const review = await Review.create({
      reviewer: reviewerId,
      developer: developerId,
      rating: data.rating,
      content: data.content || "",
      title: data.title || null,
    });

    // Log activity
    await Activity.logReview(reviewerId, developerId, review._id);

    await review.populate("reviewer", "username avatar role");

    return review;
  }

  /**
   * Create a review for a repo
   * @param {ObjectId} reviewerId
   * @param {ObjectId} repoId
   * @param {Object} data - { rating, content, title }
   */
  async reviewRepo(reviewerId, repoId, data) {
    // Verify repo exists
    const repo = await RepoSnapshot.findById(repoId);

    if (!repo) {
      throw ApiError.notFound("Repository not found");
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      reviewer: reviewerId,
      repo: repoId,
      isDeleted: false,
    });

    if (existingReview) {
      throw ApiError.conflict("You have already reviewed this repository");
    }

    // Create review
    const review = await Review.create({
      reviewer: reviewerId,
      repo: repoId,
      rating: data.rating,
      content: data.content || "",
      title: data.title || null,
    });

    await review.populate("reviewer", "username avatar role");

    return review;
  }

  /**
   * Get reviews for a developer
   * @param {ObjectId} developerId
   * @param {Object} options
   */
  async getDeveloperReviews(developerId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [reviews, total, rating] = await Promise.all([
      Review.getByDeveloper(developerId, { skip, limit }),
      Review.countDocuments({ developer: developerId, isDeleted: false }),
      Review.getDeveloperRating(developerId),
    ]);

    return {
      reviews,
      rating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get reviews for a repo
   * @param {ObjectId} repoId
   * @param {Object} options
   */
  async getRepoReviews(repoId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [reviews, total, rating] = await Promise.all([
      Review.getByRepo(repoId, { skip, limit }),
      Review.countDocuments({ repo: repoId, isDeleted: false }),
      Review.getRepoRating(repoId),
    ]);

    return {
      reviews,
      rating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a review
   * @param {ObjectId} reviewId
   * @param {ObjectId} userId
   * @param {Object} data - { rating, content, title }
   */
  async updateReview(reviewId, userId, data) {
    const review = await Review.findOne({
      _id: reviewId,
      isDeleted: false,
    });

    if (!review) {
      throw ApiError.notFound("Review not found");
    }

    if (!review.reviewer.equals(userId)) {
      throw ApiError.forbidden("You can only edit your own reviews");
    }

    // Update fields
    if (data.rating !== undefined) review.rating = data.rating;
    if (data.content !== undefined) review.content = data.content;
    if (data.title !== undefined) review.title = data.title;

    await review.save();
    await review.populate("reviewer", "username avatar role");

    return review;
  }

  /**
   * Delete a review
   * @param {ObjectId} reviewId
   * @param {ObjectId} userId
   * @param {boolean} isAdmin
   */
  async deleteReview(reviewId, userId, isAdmin = false) {
    const review = await Review.findOne({
      _id: reviewId,
      isDeleted: false,
    });

    if (!review) {
      throw ApiError.notFound("Review not found");
    }

    if (!isAdmin && !review.reviewer.equals(userId)) {
      throw ApiError.forbidden("You can only delete your own reviews");
    }

    review.isDeleted = true;
    await review.save();

    return { deleted: true };
  }

  /**
   * Get reviews written by a user
   * @param {ObjectId} userId
   * @param {Object} options
   */
  async getReviewsByUser(userId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ reviewer: userId, isDeleted: false })
        .populate("developer", "username avatar")
        .populate("repo", "name fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ reviewer: userId, isDeleted: false }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ReviewService();
