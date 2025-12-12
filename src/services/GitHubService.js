/**
 * @file src/services/GitHubService.js
 * @description GitHub API integration
 * Thin wrapper around GitHub REST API
 */

const axios = require("axios");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");
const RepoSnapshot = require("../models/RepoSnapshot");

class GitHubService {
  constructor() {
    this.client = axios.create({
      baseURL: config.github.apiUrl,
      timeout: 10000,
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevMatch-App",
        ...(config.github.token && {
          Authorization: `token ${config.github.token}`,
        }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;

          if (status === 404) {
            throw ApiError.notFound("GitHub resource not found");
          }

          if (status === 403) {
            const resetTime = error.response.headers["x-ratelimit-reset"];
            logger.warn(`GitHub rate limit exceeded. Resets at: ${resetTime}`);
            throw ApiError.tooManyRequests(
              "GitHub API rate limit exceeded. Please try again later."
            );
          }

          if (status === 401) {
            throw ApiError.unauthorized("GitHub authentication failed");
          }

          throw ApiError.badRequest(data.message || "GitHub API error");
        }

        throw ApiError.internal("Failed to connect to GitHub API");
      }
    );
  }

  /**
   * Search repositories
   * @param {string} query - Search query
   * @param {Object} options - { language, sort, order, page, perPage }
   * @returns {Promise<{ items: Array, total_count: number }>}
   */
  async searchRepositories(query, options = {}) {
    const {
      language,
      sort = "stars",
      order = "desc",
      page = 1,
      perPage = 10,
    } = options;

    let searchQuery = query;
    if (language) {
      searchQuery += ` language:${language}`;
    }

    const response = await this.client.get("/search/repositories", {
      params: {
        q: searchQuery,
        sort,
        order,
        page,
        per_page: Math.min(perPage, 100),
      },
    });

    return {
      items: response.data.items,
      total_count: response.data.total_count,
      page,
      perPage,
    };
  }

  /**
   * Get repository by owner and name
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Object>}
   */
  async getRepository(owner, repo) {
    const response = await this.client.get(`/repos/${owner}/${repo}`);
    return response.data;
  }

  /**
   * Get repository by full name (owner/repo)
   * @param {string} fullName
   * @returns {Promise<Object>}
   */
  async getRepositoryByFullName(fullName) {
    const response = await this.client.get(`/repos/${fullName}`);
    return response.data;
  }

  /**
   * Get repository README
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<string|null>}
   */
  async getReadme(owner, repo) {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}/readme`, {
        headers: {
          Accept: "application/vnd.github.v3.raw",
        },
      });
      return response.data;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get repository languages
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Object>} - { language: bytes }
   */
  async getLanguages(owner, repo) {
    const response = await this.client.get(`/repos/${owner}/${repo}/languages`);
    return response.data;
  }

  /**
   * Get user's repositories
   * @param {string} username
   * @param {Object} options - { type, sort, direction, page, perPage }
   * @returns {Promise<Array>}
   */
  async getUserRepositories(username, options = {}) {
    const {
      type = "owner",
      sort = "updated",
      direction = "desc",
      page = 1,
      perPage = 10,
    } = options;

    const response = await this.client.get(`/users/${username}/repos`, {
      params: {
        type,
        sort,
        direction,
        page,
        per_page: Math.min(perPage, 100),
      },
    });

    return response.data;
  }

  /**
   * Get GitHub user profile
   * @param {string} username
   * @returns {Promise<Object>}
   */
  async getUser(username) {
    const response = await this.client.get(`/users/${username}`);
    return response.data;
  }

  /**
   * Check if GitHub username exists
   * @param {string} username
   * @returns {Promise<boolean>}
   */
  async userExists(username) {
    try {
      await this.client.get(`/users/${username}`);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get repository contributors
   * @param {string} owner
   * @param {string} repo
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getContributors(owner, repo, options = {}) {
    const { page = 1, perPage = 10 } = options;

    const response = await this.client.get(
      `/repos/${owner}/${repo}/contributors`,
      {
        params: {
          page,
          per_page: Math.min(perPage, 100),
        },
      }
    );

    return response.data;
  }

  /**
   * Get repository commits (recent)
   * @param {string} owner
   * @param {string} repo
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getCommits(owner, repo, options = {}) {
    const { page = 1, perPage = 10 } = options;

    const response = await this.client.get(`/repos/${owner}/${repo}/commits`, {
      params: {
        page,
        per_page: Math.min(perPage, 100),
      },
    });

    return response.data;
  }

  /**
   * Get rate limit status
   * @returns {Promise<Object>}
   */
  async getRateLimit() {
    const response = await this.client.get("/rate_limit");
    return response.data.rate;
  }

  /**
   * Get trending repositories (using search with date filter)
   * @param {Object} options - { language, since }
   * @returns {Promise<Array>}
   */
  async getTrendingRepositories(options = {}) {
    const { language, since = "weekly" } = options;

    // Calculate date based on 'since' parameter
    const date = new Date();
    switch (since) {
      case "daily":
        date.setDate(date.getDate() - 1);
        break;
      case "weekly":
        date.setDate(date.getDate() - 7);
        break;
      case "monthly":
        date.setMonth(date.getMonth() - 1);
        break;
      default:
        date.setDate(date.getDate() - 7);
    }

    const dateStr = date.toISOString().split("T")[0];
    let query = `created:>${dateStr}`;

    if (language) {
      query += ` language:${language}`;
    }

    const result = await this.searchRepositories(query, {
      sort: "stars",
      order: "desc",
      perPage: 25,
    });

    return result.items;
  }

  /**
   * Sync repository data with database (fetch from GitHub and update/create snapshot)
   * @param {string} owner
   * @param {string} repo
   * @returns {Promise<Object>} - Updated RepoSnapshot
   */
  async syncRepository(owner, repo) {
    const RepoSnapshot = require("../models/RepoSnapshot");

    try {
      // Fetch from GitHub
      const ghRepo = await this.getRepository(owner, repo);

      // Use existing static method to find or create
      const savedRepo = await RepoSnapshot.findOrCreateFromGitHub(ghRepo.id, ghRepo);

      // Fetch and update README if not present or stale
      if (!savedRepo.readme || !savedRepo.readmeFetchedAt) {
        try {
          const readme = await this.getReadme(owner, repo);
          if (readme) {
            savedRepo.readme = readme;
            savedRepo.readmeFetchedAt = new Date();
          }
        } catch (err) {
          logger.debug(`No README for ${owner}/${repo}`);
        }
      }

      // Fetch and update languages if not present
      if (!savedRepo.languages || savedRepo.languages.length === 0) {
        try {
          const languages = await this.getLanguages(owner, repo);
          const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
          savedRepo.languages = Object.entries(languages).map(([name, bytes]) => ({
            name,
            bytes,
            percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
          }));
        } catch (err) {
          logger.debug(`No languages for ${owner}/${repo}`);
        }
      }

      await savedRepo.save();
      
      logger.info(`Repository synced: ${ghRepo.full_name} (ID: ${ghRepo.id})`);
      
      return savedRepo;
    } catch (error) {
      logger.error(`Failed to sync repository ${owner}/${repo}:`, error.message);
      
      if (error.statusCode === 404) {
        throw ApiError.notFound(`Repository ${owner}/${repo} not found on GitHub`);
      }
      
      throw error;
    }
  }

  /**
   * Get repository by ID from cache or GitHub
   * @param {number|string} repoId - GitHub repository ID
   * @returns {Promise<Object>} - RepoSnapshot or fresh GitHub data
   */
  async getRepositoryById(repoId) {
    const githubId = parseInt(repoId, 10);

    if (isNaN(githubId)) {
      throw ApiError.badRequest("Invalid repository ID");
    }

    // Check cache first
    let snapshot = await RepoSnapshot.findOne({ githubId });

    if (snapshot) {
      // Check if data is fresh (less than 1 hour old)
      const hoursSinceSync = snapshot.lastSyncedAt
        ? (Date.now() - snapshot.lastSyncedAt.getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceSync < 1) {
        return snapshot;
      }
    }

    // Fetch from GitHub by ID
    try {
      const response = await this.client.get(`/repositories/${githubId}`);
      const githubRepo = response.data;

      // Sync to cache
      const [owner, repo] = githubRepo.full_name.split("/");
      snapshot = await this.syncRepository(owner, repo);

      return snapshot;
    } catch (error) {
      // If GitHub fetch fails but we have cached data, return it
      if (snapshot) {
        logger.warn(
          `GitHub fetch failed for repo ID ${githubId}, returning cached data`
        );
        return snapshot;
      }

      throw error;
    }
  }

  /**
   * Bulk sync multiple repositories
   * @param {Array<{owner: string, repo: string}>} repositories
   * @returns {Promise<Array>} - Array of synced RepoSnapshots
   */
  async bulkSyncRepositories(repositories) {
    const results = await Promise.allSettled(
      repositories.map(({ owner, repo }) => this.syncRepository(owner, repo))
    );

    const successful = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const failed = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (failed.length > 0) {
      logger.warn(`${failed.length} repositories failed to sync:`, failed);
    }

    return successful;
  }
}

module.exports = new GitHubService();
