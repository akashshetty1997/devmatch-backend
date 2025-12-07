/**
 * @file src/routes/like.routes.js
 * @description Like routes (nested under posts)
 */

const express = require("express");
const router = express.Router({ mergeParams: true }); // Access :postId from parent
const {
  likePost,
  unlikePost,
  toggleLike,
  getLikers,
} = require("../controllers/LikeController");
const { protect } = require("../middleware/auth.middleware");

// Public
router.get("/", getLikers);

// Protected
router.post("/", protect, likePost);
router.delete("/", protect, unlikePost);
router.post("/toggle", protect, toggleLike);

module.exports = router;
