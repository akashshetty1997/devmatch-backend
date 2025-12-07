/**
 * @file src/controllers/RepoController.js
 * @description Repository endpoints
 */

const RepoService = require('../services/RepoService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Search repositories (GitHub API)
 * @route   GET /api/repos/search
 * @access  Public
 */
const searchRepos = asyncHandler(async (req, res) => {
  const { q, language, sort, page, limit } = req.query;

  const result = await RepoService.searchRepos(q, {
    language,
    sort,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  return ApiResponse.success(res, 'Repositories found', result);
});

/**
 * @desc    Get repository details by full name
 * @route   GET /api/repos/details/:owner/:repo
 * @access  Public
 */
const getRepoDetails = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const fullName = `${owner}/${repo}`;
  const viewerId = req.user?._id || null;

  const result = await RepoService.getRepoDetails(fullName, viewerId);

  return ApiResponse.success(res, 'Repository details retrieved', result);
});

/**
 * @desc    Get repository by ID (local snapshot)
 * @route   GET /api/repos/:repoId
 * @access  Public
 */
const getRepoById = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const { sync } = req.query;

  const repo = await RepoService.getRepoById(repoId, sync === 'true');

  return ApiResponse.success(res, 'Repository retrieved', repo);
});

/**
 * @desc    Get user's GitHub repositories
 * @route   GET /api/repos/user/:username
 * @access  Public
 */
const getUserRepos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { sort, page, limit } = req.query;

  const repos = await RepoService.getUserRepos(username, {
    sort,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  return ApiResponse.success(res, 'User repositories retrieved', repos);
});

/**
 * @desc    Get trending repositories
 * @route   GET /api/repos/trending
 * @access  Public
 */
const getTrendingRepos = asyncHandler(async (req, res) => {
  const { language, since } = req.query;

  const repos = await RepoService.getTrendingRepos({ language, since });

  return ApiResponse.success(res, 'Trending repositories retrieved', repos);
});

/**
 * @desc    Load README for a repository
 * @route   GET /api/repos/:repoId/readme
 * @access  Public
 */
const getRepoReadme = asyncHandler(async (req, res) => {
  const { repoId } = req.params;

  const readme = await RepoService.loadReadme(repoId);

  return ApiResponse.success(res, 'README retrieved', { readme });
});

/**
 * @desc    Search local repository snapshots
 * @route   GET /api/repos/local/search
 * @access  Public
 */
const searchLocalRepos = asyncHandler(async (req, res) => {
  const { q, language, page, limit } = req.query;

  const result = await RepoService.searchLocalRepos(q, {
    language,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, 'Local repositories found', result);
});

module.exports = {
  searchRepos,
  getRepoDetails,
  getRepoById,
  getUserRepos,
  getTrendingRepos,
  getRepoReadme,
  searchLocalRepos,
};