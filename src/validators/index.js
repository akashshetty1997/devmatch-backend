/**
 * @file src/validators/index.js
 * @description Export all validators
 */

const {
  validateRegister,
  validateLogin,
  validatePasswordChange,
} = require("./auth.validator");
const {
  validateDeveloperProfile,
  validateRecruiterProfile,
} = require("./profile.validator");
const {
  validateCreateJob,
  validateUpdateJob,
  validateJobSearch,
} = require("./job.validator");
const { validateCreatePost, validateUpdatePost } = require("./post.validator");
const { validateComment } = require("./comment.validator");
const { validateReview, validateReviewUpdate } = require("./review.validator");
const {
  validateApplication,
  validateStatusUpdate,
  validateRecruiterNotes,
} = require("./application.validator");
const { validateUsername, validatePagination } = require("./follow.validator");
const { validateSkill } = require("./skill.validator");

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  validatePasswordChange,

  // Profile
  validateDeveloperProfile,
  validateRecruiterProfile,

  // Job
  validateCreateJob,
  validateUpdateJob,
  validateJobSearch,

  // Post
  validateCreatePost,
  validateUpdatePost,

  // Comment
  validateComment,

  // Review
  validateReview,
  validateReviewUpdate,

  // Application
  validateApplication,
  validateStatusUpdate,
  validateRecruiterNotes,

  // Follow
  validateUsername,
  validatePagination,

  // Skill
  validateSkill,
};
