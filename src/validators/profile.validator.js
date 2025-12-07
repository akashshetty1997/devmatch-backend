/**
 * @file src/validators/profile.validator.js
 * @description Validation rules for profile endpoints
 */

const { body, validationResult } = require("express-validator");
const { WORK_TYPES } = require("../config/constants");
const ApiError = require("../utils/ApiError");

/**
 * Validate developer profile update
 */
const validateDeveloperProfile = [
  body("headline")
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage("Headline cannot exceed 120 characters"),

  body("bio")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Bio cannot exceed 2000 characters"),

  body("skills").optional().isArray().withMessage("Skills must be an array"),

  body("skills.*")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Skill name cannot exceed 50 characters"),

  body("yearsOfExperience")
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage("Years of experience must be between 0 and 50"),

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

  body("isOpenToWork")
    .optional()
    .isBoolean()
    .withMessage("isOpenToWork must be a boolean"),

  body("preferredWorkTypes")
    .optional()
    .isArray()
    .withMessage("Preferred work types must be an array"),

  body("preferredWorkTypes.*")
    .optional()
    .isIn(Object.values(WORK_TYPES))
    .withMessage(
      `Work type must be one of: ${Object.values(WORK_TYPES).join(", ")}`
    ),

  body("githubUsername")
    .optional()
    .trim()
    .isLength({ max: 39 })
    .withMessage("GitHub username cannot exceed 39 characters")
    .matches(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i)
    .withMessage("Invalid GitHub username format"),

  body("portfolioUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Portfolio URL must be a valid URL"),

  body("linkedinUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("LinkedIn URL must be a valid URL"),

  body("twitterUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Twitter URL must be a valid URL"),

  body("websiteUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Website URL must be a valid URL"),

  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean"),

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
 * Validate recruiter profile update
 */
const validateRecruiterProfile = [
  body("companyName")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Company name cannot exceed 100 characters"),

  body("companyWebsite")
    .optional()
    .trim()
    .isURL()
    .withMessage("Company website must be a valid URL"),

  body("companyDescription")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Company description cannot exceed 1000 characters"),

  body("companySize")
    .optional()
    .isIn(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .withMessage("Invalid company size"),

  body("industry")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Industry cannot exceed 100 characters"),

  body("positionTitle")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Position title cannot exceed 100 characters"),

  body("hiringRegions")
    .optional()
    .isArray()
    .withMessage("Hiring regions must be an array"),

  body("hiringRegions.*").optional().trim().isLength({ max: 100 }),

  body("linkedinUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("LinkedIn URL must be a valid URL"),

  body("isPublic")
    .optional()
    .isBoolean()
    .withMessage("isPublic must be a boolean"),

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
  validateDeveloperProfile,
  validateRecruiterProfile,
};
