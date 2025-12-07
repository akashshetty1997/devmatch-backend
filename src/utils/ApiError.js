/**
 * @file src/utils/ApiError.js
 * @description Custom API Error class for consistent error handling
 * Follows Single Responsibility Principle - only handles error structure
 */

class ApiError extends Error {
  /**
   * Create an API Error
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {boolean} isOperational - Is this a trusted operational error?
   * @param {string} stack - Error stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Static factory methods for common errors
  static badRequest(message = "Bad Request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(message = "Not Found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }

  static tooManyRequests(
    message = "Too many requests. Please try again later."
  ) {
    return new ApiError(429, message);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(500, message, false);
  }

  static tooManyRequests(message = "Too Many Requests") {
    return new ApiError(429, message);
  }
}

module.exports = ApiError;
