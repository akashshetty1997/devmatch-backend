/**
 * @file src/config/constants.js
 * @description Application constants - easy to modify in one place
 * NOTE: Skills are now managed in database via Skill model
 */

// User Roles
const ROLES = Object.freeze({
  DEVELOPER: "DEVELOPER",
  RECRUITER: "RECRUITER",
  ADMIN: "ADMIN",
});

// User Account Status
const USER_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  BANNED: "BANNED",
});

// Job Application Status Flow
const APPLICATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  REVIEWED: "REVIEWED",
  SHORTLISTED: "SHORTLISTED",
  REJECTED: "REJECTED",
});

// Social Post Types
const POST_TYPES = Object.freeze({
  TEXT: "TEXT",
  SHARE_REPO: "SHARE_REPO",
  SHARE_JOB: "SHARE_JOB",
});

// Activity Feed Types
const ACTIVITY_TYPES = Object.freeze({
  FOLLOW: "FOLLOW",
  LIKE: "LIKE",
  COMMENT: "COMMENT",
  APPLICATION: "APPLICATION",
  STATUS_CHANGE: "STATUS_CHANGE",
  REVIEW: "REVIEW",
});

// Job Work Types
const WORK_TYPES = Object.freeze({
  REMOTE: "REMOTE",
  ONSITE: "ONSITE",
  HYBRID: "HYBRID",
});

// Skill Categories (used in Skill model)
const SKILL_CATEGORIES = Object.freeze({
  LANGUAGE: "LANGUAGE",
  FRONTEND: "FRONTEND",
  BACKEND: "BACKEND",
  DATABASE: "DATABASE",
  DEVOPS: "DEVOPS",
  MOBILE: "MOBILE",
  TOOLS: "TOOLS",
  SOFT_SKILL: "SOFT_SKILL",
  OTHER: "OTHER",
});

// Pagination Defaults
const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
});

// HTTP Status Codes
const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
});

module.exports = {
  ROLES,
  USER_STATUS,
  APPLICATION_STATUS,
  POST_TYPES,
  ACTIVITY_TYPES,
  WORK_TYPES,
  SKILL_CATEGORIES,
  PAGINATION,
  HTTP_STATUS,
};
