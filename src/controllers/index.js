/**
 * @file src/controllers/index.js
 * @description Export all controllers
 */

const FollowController = require("./FollowController");
const LikeController = require("./LikeController");
const CommentController = require("./CommentController");
const ReviewController = require("./ReviewController");
const ApplicationController = require("./ApplicationController");
const ActivityController = require("./ActivityController");
const PostController = require("./PostController");
const GitHubController = require("./GitHubController");

module.exports = {
  FollowController,
  LikeController,
  CommentController,
  ReviewController,
  ApplicationController,
  ActivityController,
  PostController,
  GitHubController,
};
