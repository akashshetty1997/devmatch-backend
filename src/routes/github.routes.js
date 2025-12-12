/**
 * @file src/routes/github.routes.js
 * @description GitHub API routes
 */

const express = require("express");
const router = express.Router();
const GitHubService = require("../services/GitHubService");
const RepoSnapshot = require("../models/RepoSnapshot");
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
 * @desc    Get repository details (with MongoDB caching)
 * @route   GET /api/github/repos/:owner/:repo
 * @access  Public
 */
router.get(
  "/repos/:owner/:repo",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;

    console.log("=== getRepoByFullName START ===");
    console.log("Looking for:", fullName);

    // Check local cache first
    let repoData = await RepoSnapshot.findOne({ fullName });

    console.log("Found in cache:", repoData ? "YES" : "NO");

    if (repoData) {
      console.log("Cached repo _id:", repoData._id);
    }

    // If found and doesn't need sync, return it
    if (repoData && !repoData.needsSync()) {
      console.log("Returning cached data with _id:", repoData._id.toString());
      return ApiResponse.success(res, "Repository retrieved", repoData);
    }

    // Fetch from GitHub
    console.log("Fetching from GitHub API...");
    const githubRepo = await GitHubService.getRepository(owner, repo);

    console.log("GitHub response received, githubId:", githubRepo.id);

    // Save/update in cache
    repoData = await RepoSnapshot.findOrCreateFromGitHub(
      githubRepo.id,
      githubRepo
    );

    console.log("Saved to database, _id:", repoData._id.toString());
    console.log("=== getRepoByFullName END ===");

    return ApiResponse.success(res, "Repository retrieved", repoData);
  })
);

/**
 * @desc    Sync repository to database
 * @route   POST /api/github/repos/:owner/:repo/sync
 * @access  Public
 */
router.post(
  "/repos/:owner/:repo/sync",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { owner, repo } = req.params;
    const fullName = `${owner}/${repo}`;

    // Fetch fresh data from GitHub
    const githubRepo = await GitHubService.getRepository(owner, repo);

    // Save/update in cache
    const repoData = await RepoSnapshot.findOrCreateFromGitHub(
      githubRepo.id,
      githubRepo
    );

    return ApiResponse.success(res, "Repository synced", repoData);
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
