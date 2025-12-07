/**
 * @file src/routes/repo.routes.js
 * @description Repository routes
 */

const express = require("express");
const router = express.Router();
const {
  searchRepos,
  getRepoDetails,
  getRepoById,
  getUserRepos,
  getTrendingRepos,
  getRepoReadme,
  searchLocalRepos,
} = require("../controllers/RepoController");
const { optionalAuth } = require("../middleware/auth.middleware");
const { githubLimiter } = require("../middleware/rateLimiter.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// Public routes with GitHub rate limiting
router.get("/search", githubLimiter, searchRepos);
router.get("/trending", githubLimiter, getTrendingRepos);
router.get("/user/:username", githubLimiter, getUserRepos);

// Local search (no rate limiting)
router.get("/local/search", searchLocalRepos);

// Get repo by ID (local snapshot)
router.get("/:repoId", validateObjectId("repoId"), getRepoById);
router.get("/:repoId/readme", validateObjectId("repoId"), getRepoReadme);

// Get repo details by owner/repo (fetches from GitHub)
router.get(
  "/details/:owner/:repo",
  githubLimiter,
  optionalAuth,
  getRepoDetails
);

module.exports = router;
