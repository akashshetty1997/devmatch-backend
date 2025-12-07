/**
 * @file src/validators/job.validator.js
 * @description Validation rules for job endpoints
 */

const { body, query, validationResult } = require("express-validator");
const { WORK_TYPES } = require("../config/constants");
const ApiError = require("../utils/ApiError");

/**
 * Validate create job
 */
const validateCreateJob = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),

  body("companyName")
    .trim()
    .notEmpty()
    .withMessage("Company name is required")
    .isLength({ max: 100 })
    .withMessage("Company name cannot exceed 100 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  body("workType")
    .notEmpty()
    .withMessage("Work type is required")
    .isIn(Object.values(WORK_TYPES))
    .withMessage(
      `Work type must be one of: ${Object.values(WORK_TYPES).join(", ")}`
    ),

  body("location.city")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("City cannot exceed 100 characters"),

  body("location.state")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("State cannot exceed 100 characters"),

  body("location.country")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Country cannot exceed 100 characters"),

  body("requiredSkills")
    .optional()
    .isArray()
    .withMessage("Required skills must be an array"),

  body("requiredSkills.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Skill name cannot exceed 50 characters"),

  body("preferredSkills")
    .optional()
    .isArray()
    .withMessage("Preferred skills must be an array"),

  body("minYearsExperience")
    .optional()
    .isInt({ min: 0, max: 30 })
    .withMessage("Min years experience must be between 0 and 30"),

  body("maxYearsExperience")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Max years experience must be between 0 and 50"),

  body("salary.min")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Minimum salary must be a positive number"),

  body("salary.max")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Maximum salary must be a positive number"),

  body("salary.currency")
    .optional()
    .trim()
    .isLength({ max: 3 })
    .withMessage("Currency code must be 3 characters"),

  body("salary.isVisible")
    .optional()
    .isBoolean()
    .withMessage("Salary visibility must be a boolean"),

  body("employmentType")
    .optional()
    .isIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"])
    .withMessage("Invalid employment type"),

  body("applicationDeadline")
    .optional()
    .isISO8601()
    .withMessage("Application deadline must be a valid date"),

  body("externalApplicationUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("External application URL must be a valid URL"),

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
 * Validate update job (all fields optional)
 */
const validateUpdateJob = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Description cannot exceed 5000 characters"),

  body("workType")
    .optional()
    .isIn(Object.values(WORK_TYPES))
    .withMessage(
      `Work type must be one of: ${Object.values(WORK_TYPES).join(", ")}`
    ),

  // ... same as create but all optional

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
 * Validate job search query
 */
const validateJobSearch = [
  query("q")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters"),

  query("workType")
    .optional()
    .isIn(Object.values(WORK_TYPES))
    .withMessage(
      `Work type must be one of: ${Object.values(WORK_TYPES).join(", ")}`
    ),

  query("skills").optional(),

  query("country").optional().trim().isLength({ max: 100 }),

  query("maxExperience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Max experience must be a positive number"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

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
  validateCreateJob,
  validateUpdateJob,
  validateJobSearch,
};
