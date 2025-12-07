/**
 * @file src/routes/github.routes.js
 * @description GitHub API routes
 */

const express = require("express");
const router = express.Router();
const GitHubService = require("../services/GitHubService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { optionalAuth } = require("../middleware/auth.middleware");

/**
 * @desc    Search GitHub repositories
 * @route   GET /api/github/search/repos
 * @access  Public
 */
router.get(
  "/search/repos",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q, language, sort, order, page, perPage } = req.query;

    if (!q || !q.trim()) {
      return ApiResponse.success(res, "Search query required", {
        items: [],
        total_count: 0,
      });
    }

    const results = await GitHubService.searchRepositories(q.trim(), {
      language,
      sort: sort || "stars",
      order: order || "desc",
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 10,
    });

    return ApiResponse.success(res, "Repositories found", results);
  })
);

/**
 * @desc    Get repository details
 * @route   GET /api/github/repos/:owner/:repo
 * @access  Public
 */
router.get(
  "/repos/:owner/:repo",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;

    const repository = await GitHubService.getRepository(owner, repo);

    return ApiResponse.success(res, "Repository found", repository);
  })
);

/**
 * @desc    Get user's repositories
 * @route   GET /api/github/users/:username/repos
 * @access  Public
 */
router.get(
  "/users/:username/repos",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { username } = req.params;
    const { type, sort, direction, page, perPage } = req.query;

    const repos = await GitHubService.getUserRepositories(username, {
      type,
      sort,
      direction,
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 10,
    });

    return ApiResponse.success(res, "User repositories found", repos);
  })
);

/**
 * @desc    Get trending repositories
 * @route   GET /api/github/trending
 * @access  Public
 */
router.get(
  "/trending",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { language, since } = req.query;

    const repos = await GitHubService.getTrendingRepositories({
      language,
      since: since || "weekly",
    });

    return ApiResponse.success(res, "Trending repositories", repos);
  })
);

module.exports = router;
