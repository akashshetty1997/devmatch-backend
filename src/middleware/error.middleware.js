/**
 * @file src/middleware/error.middleware.js
 * @description Global error handling middleware
 * Catches all errors and sends consistent response
 */

const config = require("../config");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

/**
 * Convert non-ApiError errors to ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  next(error);
};

/**
 * Handle specific MongoDB errors
 */
const handleMongoError = (err) => {
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return ApiError.conflict(`${field} '${value}' already exists.`);
  }

  // Validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return ApiError.badRequest(messages.join(", "));
  }

  // Cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  return err;
};

/**
 * Final error handler - sends response to client
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Handle MongoDB specific errors
  error = handleMongoError(error);

  // Convert to ApiError if needed
  if (!(error instanceof ApiError)) {
    error = new ApiError(500, error.message || "Internal Server Error", false);
  }

  const { statusCode, message, isOperational, stack } = error;

  // Log error
  if (!isOperational) {
    logger.error(
      `${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`,
      {
        stack,
        body: req.body,
        user: req.user?._id,
      }
    );
  } else if (config.env === "development") {
    logger.debug(`${statusCode} - ${message}`);
  }

  // Send response
  const response = {
    success: false,
    message,
    ...(config.env === "development" && { stack }),
  };

  res.status(statusCode).json(response);
};

/**
 * Handle 404 - Route not found
 */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
};

module.exports = {
  errorConverter,
  errorHandler,
  notFound,
};
