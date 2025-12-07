/**
 * @file src/routes/user.routes.js
 * @description User routes
 */

const express = require("express");
const router = express.Router();
const {
  getUserByUsername,
  getUserPosts,
  searchUsers,
  getRecentUsers,
  getFeaturedDevelopers,
} = require("../controllers/UserController");
const { optionalAuth } = require("../middleware/auth.middleware");

// Public routes
router.get("/", searchUsers);
router.get("/recent", getRecentUsers);
router.get("/featured/developers", getFeaturedDevelopers);

// User profile (with optional auth for personalized data)
router.get("/:username", optionalAuth, getUserByUsername);
router.get("/:username/posts", optionalAuth, getUserPosts);

module.exports = router;
