/**
 * @file src/services/index.js
 * @description Export all services
 */

const FollowService = require("./FollowService");
const LikeService = require("./LikeService");
const CommentService = require("./CommentService");
const ReviewService = require("./ReviewService");
const ApplicationService = require("./ApplicationService");
const ActivityService = require("./ActivityService");

module.exports = {
  FollowService,
  LikeService,
  CommentService,
  ReviewService,
  ApplicationService,
  ActivityService,
};
