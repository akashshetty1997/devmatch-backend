/**
 * @file src/routes/post.routes.js
 * @description Post routes with nested likes and comments
 */

const express = require("express");
const router = express.Router();
const PostController = require("../controllers/PostController");
const { protect, optionalAuth } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Import nested routers
const likeRoutes = require("./like.routes");
const { nestedRouter: commentRoutes } = require("./comment.routes");

// Public routes
router.get("/", optionalAuth, PostController.getFeed);
router.get(
  "/:postId",
  optionalAuth,
  validateObjectId("postId"),
  PostController.getPost
);

// Protected routes
router.post("/", protect, PostController.createPost);
router.put(
  "/:postId",
  protect,
  validateObjectId("postId"),
  PostController.updatePost
);
router.delete(
  "/:postId",
  protect,
  validateObjectId("postId"),
  PostController.deletePost
);

// Nested routes
router.use("/:postId/likes", validateObjectId("postId"), likeRoutes);
router.use("/:postId/comments", validateObjectId("postId"), commentRoutes);

module.exports = router;
