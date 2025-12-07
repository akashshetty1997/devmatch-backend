/**
 * @file src/routes/comment.routes.js
 * @description Comment routes
 */

const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controllers/CommentController");
const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Nested routes under /api/posts/:postId/comments
router.route("/").get(getComments).post(protect, createComment);

// Standalone routes for /api/comments/:commentId
const commentRouter = express.Router();

commentRouter
  .route("/:commentId")
  .put(protect, validateObjectId("commentId"), updateComment)
  .delete(protect, validateObjectId("commentId"), deleteComment);

module.exports = { nestedRouter: router, commentRouter };
