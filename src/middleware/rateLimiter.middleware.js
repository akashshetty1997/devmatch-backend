/**
 * @file src/middleware/rateLimiter.middleware.js
 * @description Rate limiting to prevent abuse
 */

const rateLimit = require("express-rate-limit");
const config = require("../config");
const ApiError = require("../utils/ApiError");

/**
 * General API rate limiter
 * Default: 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    throw ApiError.tooManyRequests(
      "Too many requests. Please try again later."
    );
  },
});

/**
 * Strict rate limiter for auth routes
 * 10 requests per 15 minutes (for login, register, password reset)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * AI endpoint rate limiter
 * 20 requests per hour (AI calls are expensive)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: "AI request limit reached. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GitHub API rate limiter
 * 30 requests per minute
 */
const githubLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    success: false,
    message: "GitHub API rate limit reached. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  aiLimiter,
  githubLimiter,
};
