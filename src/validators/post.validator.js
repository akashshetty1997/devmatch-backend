/**
 * @file src/validators/post.validator.js
 * @description Validation rules for post endpoints
 */

const { body, validationResult } = require("express-validator");
const { POST_TYPES } = require("../config/constants");
const ApiError = require("../utils/ApiError");

/**
 * Validate create post
 */
const validateCreatePost = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Post content is required")
    .isLength({ min: 1, max: 2000 })
    .withMessage("Post content must be 1-2000 characters"),

  body("type")
    .optional()
    .isIn(Object.values(POST_TYPES))
    .withMessage(
      `Post type must be one of: ${Object.values(POST_TYPES).join(", ")}`
    ),

  body("repoId").optional().isMongoId().withMessage("Invalid repo ID format"),

  body("jobPostId")
    .optional()
    .isMongoId()
    .withMessage("Invalid job post ID format"),

  // Custom validation: if type is SHARE_REPO, repoId is required
  (req, res, next) => {
    const errors = validationResult(req);

    if (req.body.type === POST_TYPES.SHARE_REPO && !req.body.repoId) {
      errors.errors.push({
        msg: "Repo ID is required for SHARE_REPO posts",
        path: "repoId",
      });
    }

    if (req.body.type === POST_TYPES.SHARE_JOB && !req.body.jobPostId) {
      errors.errors.push({
        msg: "Job Post ID is required for SHARE_JOB posts",
        path: "jobPostId",
      });
    }

    if (!errors.isEmpty()) {
      const messages = errors.array().map((err) => err.msg);
      throw ApiError.badRequest(messages.join(", "));
    }
    next();
  },
];

/**
 * Validate update post
 */
const validateUpdatePost = [
  body("content")
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Post content must be 1-2000 characters"),

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
  validateCreatePost,
  validateUpdatePost,
};
