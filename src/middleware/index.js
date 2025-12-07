/**
 * @file src/middleware/index.js
 * @description Export all middleware from single entry point
 */

const {
  protect,
  optionalAuth,
  restrictTo,
  ownerOrAdmin,
} = require("./auth.middleware");
const {
  errorConverter,
  errorHandler,
  notFound,
} = require("./error.middleware");
const { validate, validateObjectId } = require("./validate.middleware");
const {
  apiLimiter,
  authLimiter,
  aiLimiter,
  githubLimiter,
} = require("./rateLimiter.middleware");
const {
  securityHeaders,
  sanitizeData,
  preventParamPollution,
  xssProtection,
} = require("./security.middleware");
const corsMiddleware = require("./cors.middleware");
const requestLogger = require("./logger.middleware");

module.exports = {
  // Auth
  protect,
  optionalAuth,
  restrictTo,
  ownerOrAdmin,

  // Error handling
  errorConverter,
  errorHandler,
  notFound,

  // Validation
  validate,
  validateObjectId,

  // Rate limiting
  apiLimiter,
  authLimiter,
  aiLimiter,
  githubLimiter,

  // Security
  securityHeaders,
  sanitizeData,
  preventParamPollution,
  xssProtection,
  corsMiddleware,

  // Logging
  requestLogger,
};
