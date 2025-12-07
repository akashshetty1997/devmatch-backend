/**
 * @file src/validators/auth.validator.js
 * @description Validation rules for auth endpoints
 */

const { body, validationResult } = require("express-validator");
const { ROLES } = require("../config/constants");
const ApiError = require("../utils/ApiError");

/**
 * Validate registration
 */
const validateRegister = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters")
    .matches(/^[a-z0-9_-]+$/)
    .withMessage(
      "Username can only contain lowercase letters, numbers, underscores, and hyphens"
    )
    .toLowerCase(),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

  body("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn([ROLES.DEVELOPER, ROLES.RECRUITER])
    .withMessage("Role must be either DEVELOPER or RECRUITER"),

  // Developer-specific fields
  body("headline")
    .if(body("role").equals(ROLES.DEVELOPER))
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Headline cannot exceed 120 characters"),

  // Recruiter-specific fields
  body("companyName")
    .if(body("role").equals(ROLES.RECRUITER))
    .notEmpty()
    .withMessage("Company name is required for recruiters")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name cannot exceed 100 characters"),

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
 * Validate login
 */
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail(),

  body("password").notEmpty().withMessage("Password is required"),

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
 * Validate password change
 */
const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),

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
  validateRegister,
  validateLogin,
  validatePasswordChange,
};
