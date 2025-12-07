/**
 * @file src/routes/follow.routes.js
 * @description Follow routes
 */

const express = require("express");
const router = express.Router();
const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  checkFollowStatus,
} = require("../controllers/FollowController");
const { protect } = require("../middleware/auth.middleware");

// Public routes
router.get("/:username/followers", getFollowers);
router.get("/:username/following", getFollowing);

// Protected routes
router.post("/:username/follow", protect, followUser);
router.delete("/:username/follow", protect, unfollowUser);
router.get("/:username/follow/status", protect, checkFollowStatus);

module.exports = router;
