/**
 * @file src/middleware/rateLimiter.middleware.js
 * @description Rate limiting to prevent abuse
 */

const rateLimit = require("express-rate-limit");
const config = require("../config");
const ApiError = require("../utils/ApiError");

/**
 * General API rate limiter
 * 500 requests per 15 minutes
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
 * 30 requests per 15 minutes (increased from 10)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * AI endpoint rate limiter
 * 50 requests per hour (increased from 20)
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: "AI request limit reached. Please try again after an hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GitHub API rate limiter
 * 60 requests per minute (increased from 30)
 */
const githubLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
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
