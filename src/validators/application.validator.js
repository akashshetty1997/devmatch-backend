/**
 * @file src/validators/application.validator.js
 * @description Validation rules for application endpoints
 */

const { body, validationResult } = require("express-validator");
const { APPLICATION_STATUS } = require("../config/constants");
const ApiError = require("../utils/ApiError");

/**
 * Validate job application
 */
const validateApplication = [
  body("coverLetter")
    .optional()
    .trim()
    .isLength({ max: 3000 })
    .withMessage("Cover letter cannot exceed 3000 characters"),

  body("resumeUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Resume URL must be a valid URL")
    .isLength({ max: 500 })
    .withMessage("Resume URL cannot exceed 500 characters"),

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
 * Validate status update
 */
const validateStatusUpdate = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(Object.values(APPLICATION_STATUS))
    .withMessage(
      `Status must be one of: ${Object.values(APPLICATION_STATUS).join(", ")}`
    ),

  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note cannot exceed 500 characters"),

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
 * Validate recruiter notes
 */
const validateRecruiterNotes = [
  body("notes")
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Notes cannot exceed 2000 characters"),

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
  validateApplication,
  validateStatusUpdate,
  validateRecruiterNotes,
};
