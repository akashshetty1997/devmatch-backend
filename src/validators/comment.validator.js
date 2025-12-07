/**
 * @file src/validators/comment.validator.js
 * @description Validation rules for comment endpoints
 */

const { body, param, validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Validate create/update comment
 */
const validateComment = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment must be 1-1000 characters"),

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
  validateComment,
};
