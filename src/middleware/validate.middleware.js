/**
 * @file src/middleware/validate.middleware.js
 * @description Request validation middleware using express-validator
 */

const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

/**
 * Validate request and throw error if validation fails
 * Use after express-validator rules
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    // Create readable error message
    const message = errorMessages.map((e) => e.message).join(", ");

    throw ApiError.badRequest(message);
  }

  next();
};

/**
 * Validate MongoDB ObjectId in params
 */
const validateObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      throw ApiError.badRequest(`${paramName} is required`);
    }

    // Check if valid MongoDB ObjectId format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      throw ApiError.badRequest(`Invalid ${paramName} format`);
    }

    next();
  };
};

module.exports = {
  validate,
  validateObjectId,
};
