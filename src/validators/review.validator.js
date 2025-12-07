/**
 * @file src/validators/review.validator.js
 * @description Validation rules for review endpoints
 */

const { body, validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Validate create/update review
 */
const validateReview = [
  body("rating")
    .notEmpty()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("content")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Review content cannot exceed 2000 characters"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map((err) => err.msg);
      throw ApiError.badRequest(messages.join(", "));
    }
    next();
  },
];

/**
 * Validate update review (rating optional)
 */
const validateReviewUpdate = [
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),

  body("content")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Review content cannot exceed 2000 characters"),

  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map((err) => err.msg);
      throw ApiError.badRequest(messages.join(", "));
    }
    next();
  },
];

module.exports = {
  validateReview,
  validateReviewUpdate,
};
