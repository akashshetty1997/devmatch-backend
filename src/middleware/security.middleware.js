/**
 * @file src/middleware/security.middleware.js
 * @description Security middleware - helmet, sanitization, etc.
 */

const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");

/**
 * Helmet - Set security HTTP headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Sanitize data - Prevent NoSQL injection
 * Removes $ and . from req.body, req.query, req.params
 */
const sanitizeData = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized ${key} in request`);
  },
});

/**
 * Prevent HTTP Parameter Pollution
 * Whitelist allows duplicates for specific params (e.g., skills[]=js&skills[]=react)
 */
const preventParamPollution = hpp({
  whitelist: ["skills", "languages", "tags", "sort", "fields"],
});

/**
 * Custom XSS protection
 * Basic sanitization for common XSS patterns
 */
const xssProtection = (req, res, next) => {
  // Recursive function to sanitize strings
  const sanitize = (obj) => {
    if (typeof obj === "string") {
      return obj
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === "object") {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  // Only sanitize specific fields that might contain user input
  // Don't sanitize password, content, description as they need special handling
  if (req.body) {
    // Selectively sanitize fields prone to XSS
    const fieldsToSanitize = ["username", "name", "title", "headline"];
    fieldsToSanitize.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = sanitize(req.body[field]);
      }
    });
  }

  next();
};

module.exports = {
  securityHeaders,
  sanitizeData,
  preventParamPollution,
  xssProtection,
};
