/**
 * @file src/middleware/auth.middleware.js
 * @description Authentication & Authorization middleware
 * - JWT verification
 * - Role-based access control
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Protect routes - Verify JWT token
 * Attaches user object to req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Check for token in cookies (optional - for web clients)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw ApiError.unauthorized("Access denied. No token provided.");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw ApiError.unauthorized("User not found. Token is invalid.");
    }

    // Check if user is banned
    if (user.status === "BANNED") {
      throw ApiError.forbidden("Your account has been banned.");
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw ApiError.unauthorized("Invalid token.");
    }
    if (error.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Token has expired. Please login again.");
    }
    throw error;
  }
});

/**
 * Optional authentication - Attach user if token exists, but don't require it
 * Useful for routes that show different content for logged-in users
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select("-password");

    if (user && user.status === "ACTIVE") {
      req.user = user;
    }
  } catch (error) {
    // Token invalid or expired, continue without user
  }

  next();
});

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized("Access denied. Please login.");
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Access denied. This action requires one of these roles: ${roles.join(
          ", "
        )}`
      );
    }

    next();
  };
};

/**
 * Check if user owns the resource or is admin
 * @param {string} resourceUserIdField - Field name containing user ID in req.params or resource
 */
const ownerOrAdmin = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized("Access denied. Please login.");
    }

    // Admin can access anything
    if (req.user.role === "ADMIN") {
      return next();
    }

    // Check ownership - resource must be attached by previous middleware
    const resourceUserId =
      req.resource?.[resourceUserIdField] || req.params[resourceUserIdField];

    if (!resourceUserId) {
      throw ApiError.internal(
        "Resource user ID not found for ownership check."
      );
    }

    if (req.user._id.toString() !== resourceUserId.toString()) {
      throw ApiError.forbidden("Access denied. You do not own this resource.");
    }

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  restrictTo,
  ownerOrAdmin,
};
