/**
 * @file src/validators/skill.validator.js
 * @description Validation rules for skill endpoints
 */

const { body, validationResult } = require("express-validator");
const { SKILL_CATEGORIES } = require("../config/constants");
const ApiError = require("../utils/ApiError");

const validateSkill = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Skill name is required")
    .isLength({ max: 50 })
    .withMessage("Skill name cannot exceed 50 characters"),

  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isIn(Object.values(SKILL_CATEGORIES))
    .withMessage(
      `Category must be one of: ${Object.values(SKILL_CATEGORIES).join(", ")}`
    ),

  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon cannot exceed 100 characters"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  // Check validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const messages = errors.array().map((err) => err.msg);
      throw ApiError.badRequest(messages.join(", "));
    }
    next();
  },
];

module.exports = { validateSkill };
