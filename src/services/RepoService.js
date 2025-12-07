/**
 * @file src/services/RepoService.js
 * @description Repository business logic
 * Handles syncing with GitHub and local RepoSnapshot management
 */

const RepoSnapshot = require("../models/RepoSnapshot");
const GitHubService = require("./GitHubService");
const ApiError = require("../utils/ApiError");
const logger = require("../utils/logger");

class RepoService {
  /**
   * Search repositories via GitHub API
   * @param {string} query
   * @param {Object} options - { language, sort, page, limit }
   */
  async searchRepos(query, options = {}) {
    if (!query || query.trim().length < 2) {
      throw ApiError.badRequest("Search query must be at least 2 characters");
    }

    const { language, sort = "stars", page = 1, limit = 10 } = options;

    const result = await GitHubService.searchRepositories(query, {
      language,
      sort,
      page,
      perPage: limit,
    });

    // Transform to simplified format
    const repos = result.items.map((repo) => ({
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      ownerLogin: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      description: repo.description,
      htmlUrl: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      topics: repo.topics || [],
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
    }));

    return {
      repos,
      totalCount: result.total_count,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(Math.min(result.total_count, 1000) / limit),
      },
    };
  }

  /**
   * Get repository snapshot by ID (local)
   * @param {ObjectId} repoId
   * @param {boolean} forceSync - Force sync from GitHub
   */
  async getRepoById(repoId, forceSync = false) {
    const repo = await RepoSnapshot.findById(repoId);

    if (!repo) {
      throw ApiError.notFound("Repository not found");
    }

    // Check if needs sync
    if (forceSync || repo.needsSync()) {
      try {
        await this.syncRepo(repo);
      } catch (error) {
        logger.warn(`Failed to sync repo ${repo.fullName}: ${error.message}`);
        // Continue with stale data
      }
    }

    return repo;
  }

  /**
   * Get or create repository snapshot from GitHub data
   * @param {string} fullName - owner/repo format
   */
  async getOrCreateFromGitHub(fullName) {
    // Check if we have it locally first
    let repo = await RepoSnapshot.findOne({ fullName });

    if (repo && !repo.needsSync()) {
      return repo;
    }

    // Fetch from GitHub
    const githubData = await GitHubService.getRepositoryByFullName(fullName);

    // Create or update snapshot
    repo = await RepoSnapshot.findOrCreateFromGitHub(githubData.id, githubData);

    return repo;
  }

  /**
   * Get repository by GitHub ID
   * @param {number} githubId
   */
  async getRepoByGitHubId(githubId) {
    let repo = await RepoSnapshot.findOne({ githubId });

    if (repo && !repo.needsSync()) {
      return repo;
    }

    // If we have it but need sync, sync it
    if (repo) {
      await this.syncRepo(repo);
      return repo;
    }

    // We don't have it - need fullName to fetch
    // This method requires the repo to exist locally
    throw ApiError.notFound(
      "Repository not found. Use fullName to fetch from GitHub."
    );
  }

  /**
   * Sync repository data from GitHub
   * @param {RepoSnapshot} repo
   */
  async syncRepo(repo) {
    try {
      const githubData = await GitHubService.getRepositoryByFullName(
        repo.fullName
      );
      repo.updateFromGitHub(githubData);
      await repo.save();

      logger.info(`Synced repo: ${repo.fullName}`);
      return repo;
    } catch (error) {
      repo.syncError = error.message;
      await repo.save();
      throw error;
    }
  }

  /**
   * Load and cache README for a repository
   * @param {ObjectId} repoId
   */
  async loadReadme(repoId) {
    const repo = await RepoSnapshot.findById(repoId);

    if (!repo) {
      throw ApiError.notFound("Repository not found");
    }

    // Check if README needs refresh (older than 7 days)
    const needsRefresh =
      !repo.readmeFetchedAt ||
      Date.now() - repo.readmeFetchedAt.getTime() > 7 * 24 * 60 * 60 * 1000;

    if (repo.readme && !needsRefresh) {
      return repo.readme;
    }

    // Fetch README from GitHub
    try {
      const readme = await GitHubService.getReadme(repo.ownerLogin, repo.name);

      if (readme) {
        // Truncate if too long
        repo.readme = readme.substring(0, 50000);
        repo.readmeFetchedAt = new Date();
        await repo.save();
      }

      return repo.readme;
    } catch (error) {
      logger.warn(
        `Failed to fetch README for ${repo.fullName}: ${error.message}`
      );
      return repo.readme || null;
    }
  }

  /**
   * Load and cache languages for a repository
   * @param {ObjectId} repoId
   */
  async loadLanguages(repoId) {
    const repo = await RepoSnapshot.findById(repoId);

    if (!repo) {
      throw ApiError.notFound("Repository not found");
    }

    // If already have languages, return them
    if (repo.languages && repo.languages.length > 0) {
      return repo.languages;
    }

    // Fetch from GitHub
    try {
      const languagesData = await GitHubService.getLanguages(
        repo.ownerLogin,
        repo.name
      );

      // Calculate percentages
      const totalBytes = Object.values(languagesData).reduce(
        (a, b) => a + b,
        0
      );

      repo.languages = Object.entries(languagesData).map(([name, bytes]) => ({
        name,
        bytes,
        percentage: Math.round((bytes / totalBytes) * 100 * 10) / 10,
      }));

      await repo.save();
      return repo.languages;
    } catch (error) {
      logger.warn(
        `Failed to fetch languages for ${repo.fullName}: ${error.message}`
      );
      return repo.languages || [];
    }
  }

  /**
   * Get user's repositories from GitHub
   * @param {string} username
   * @param {Object} options
   */
  async getUserRepos(username, options = {}) {
    const { sort = "updated", page = 1, limit = 10 } = options;

    const repos = await GitHubService.getUserRepositories(username, {
      sort,
      page,
      perPage: limit,
    });

    return repos.map((repo) => ({
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      isPrivate: repo.private,
      isFork: repo.fork,
      updatedAt: repo.updated_at,
    }));
  }

  /**
   * Get trending repositories
   * @param {Object} options - { language, since }
   */
  async getTrendingRepos(options = {}) {
    const repos = await GitHubService.getTrendingRepositories(options);

    return repos.map((repo) => ({
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      ownerLogin: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      description: repo.description,
      htmlUrl: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics || [],
    }));
  }

  /**
   * Get repository details with all related data
   * @param {string} fullName - owner/repo
   * @param {ObjectId} viewerId - Current user (optional)
   */
  async getRepoDetails(fullName, viewerId = null) {
    // Get or create snapshot
    const repo = await this.getOrCreateFromGitHub(fullName);

    // Load README if not loaded
    if (!repo.readme) {
      await this.loadReadme(repo._id);
    }

    // Load languages if not loaded
    if (!repo.languages || repo.languages.length === 0) {
      await this.loadLanguages(repo._id);
    }

    // Get reviews for this repo
    const Review = require("../models/Review");
    const reviewStats = await Review.getRepoRating(repo._id);

    // Reload to get updated data
    await repo.populate("reviews");

    return {
      repo: repo.toObject(),
      reviewStats,
    };
  }

  /**
   * Search local repo snapshots
   * @param {string} query
   * @param {Object} options
   */
  async searchLocalRepos(query, options = {}) {
    const { language, page = 1, limit = 20 } = options;

    const searchQuery = {
      isPrivate: false,
    };

    if (query) {
      searchQuery.$text = { $search: query };
    }

    if (language) {
      searchQuery.language = language;
    }

    const skip = (page - 1) * limit;

    const [repos, total] = await Promise.all([
      RepoSnapshot.find(searchQuery)
        .sort(query ? { score: { $meta: "textScore" } } : { stars: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RepoSnapshot.countDocuments(searchQuery),
    ]);

    return {
      repos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new RepoService();
