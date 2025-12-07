/**
 * @file src/controllers/GitHubController.js
 * @description GitHub API controller - proxies requests to GitHub
 */

const axios = require("axios");
const RepoSnapshot = require("../models/RepoSnapshot");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const config = require("../config");

// GitHub API base URL
const GITHUB_API = config.github?.apiUrl || "https://api.github.com";
const GITHUB_TOKEN = config.github?.token;

// Create axios instance for GitHub
const githubApi = axios.create({
  baseURL: GITHUB_API,
  headers: {
    Accept: "application/vnd.github.v3+json",
    ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
  },
});

/**
 * @desc    Search GitHub repositories
 * @route   GET /api/github/search/repos
 * @access  Public
 */
const searchRepos = asyncHandler(async (req, res) => {
  const {
    q,
    language,
    sort = "stars",
    order = "desc",
    page = 1,
    per_page = 12,
  } = req.query;

  if (!q || !q.trim()) {
    throw ApiError.badRequest("Search query is required");
  }

  // Build GitHub search query
  let searchQuery = q.trim();
  if (language) {
    searchQuery += ` language:${language}`;
  }

  try {
    const response = await githubApi.get("/search/repositories", {
      params: {
        q: searchQuery,
        sort,
        order,
        page: parseInt(page, 10),
        per_page: parseInt(per_page, 10),
      },
    });

    const { items, total_count } = response.data;

    // Transform to our format
    const repos = items.map((repo) => ({
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
      openIssues: repo.open_issues_count,
      topics: repo.topics || [],
      license: repo.license?.spdx_id || null,
      isPrivate: repo.private,
      isFork: repo.fork,
      githubCreatedAt: repo.created_at,
      githubUpdatedAt: repo.updated_at,
      githubPushedAt: repo.pushed_at,
    }));

    return ApiResponse.success(res, "Repositories found", {
      repos,
      totalCount: total_count,
      page: parseInt(page, 10),
      perPage: parseInt(per_page, 10),
    });
  } catch (error) {
    console.error("GitHub API error:", error.response?.data || error.message);

    if (error.response?.status === 403) {
      throw ApiError.tooManyRequests(
        "GitHub API rate limit exceeded. Please try again later."
      );
    }

    throw ApiError.internal("Failed to search GitHub repositories");
  }
});

/**
 * @desc    Get trending repositories
 * @route   GET /api/github/trending
 * @access  Public
 */
const getTrendingRepos = asyncHandler(async (req, res) => {
  const { language, since = "weekly", limit = 10 } = req.query;

  // Calculate date for "since"
  const dateMap = {
    daily: 1,
    weekly: 7,
    monthly: 30,
  };
  const daysAgo = dateMap[since] || 7;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const dateStr = date.toISOString().split("T")[0];

  // Build search query
  let searchQuery = `created:>${dateStr}`;
  if (language) {
    searchQuery += ` language:${language}`;
  }

  try {
    const response = await githubApi.get("/search/repositories", {
      params: {
        q: searchQuery,
        sort: "stars",
        order: "desc",
        per_page: parseInt(limit, 10),
      },
    });

    const repos = response.data.items.map((repo) => ({
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
      githubCreatedAt: repo.created_at,
    }));

    return ApiResponse.success(res, "Trending repositories", repos);
  } catch (error) {
    console.error("GitHub API error:", error.response?.data || error.message);
    throw ApiError.internal("Failed to fetch trending repositories");
  }
});

/**
 * @desc    Get user's repositories
 * @route   GET /api/github/users/:username/repos
 * @access  Public
 */
const getUserRepos = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const { page = 1, per_page = 10, sort = "updated" } = req.query;

  try {
    const response = await githubApi.get(`/users/${username}/repos`, {
      params: {
        sort,
        direction: "desc",
        page: parseInt(page, 10),
        per_page: parseInt(per_page, 10),
      },
    });

    const repos = response.data.map((repo) => ({
      githubId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics || [],
      githubUpdatedAt: repo.updated_at,
    }));

    return ApiResponse.success(res, "User repositories", repos);
  } catch (error) {
    if (error.response?.status === 404) {
      throw ApiError.notFound("GitHub user not found");
    }
    throw ApiError.internal("Failed to fetch user repositories");
  }
});

/**
 * @desc    Get repo by ID (from local cache or GitHub)
 * @route   GET /api/github/repos/:id
 * @access  Public
 */
const getRepoById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log("=== getRepoById START ===");
  console.log("1. Received ID:", id);

  let repo = null;

  // Check if it's a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    console.log("2. ID matches MongoDB ObjectId format, searching by _id...");
    repo = await RepoSnapshot.findById(id).lean();
    console.log("3. Found by _id:", repo ? "YES" : "NO");
  }

  // If not found by ObjectId, try githubId
  if (!repo) {
    const githubId = parseInt(id, 10);
    console.log("4. Parsed as githubId:", githubId);

    if (isNaN(githubId)) {
      console.log("5. ERROR: Invalid githubId (NaN)");
      throw ApiError.badRequest("Invalid repository ID format");
    }

    console.log("6. Searching in RepoSnapshot by githubId...");
    repo = await RepoSnapshot.findOne({ githubId }).lean();
    console.log("7. Found in local cache:", repo ? "YES" : "NO");

    // If still not found locally, fetch from GitHub and cache it
    if (!repo) {
      console.log("8. Not in cache, fetching from GitHub...");
      console.log("9. GitHub URL: https://api.github.com/repositories/" + githubId);

      // Use native https module to bypass any axios interceptors
      const https = require("https");

      try {
        const githubRepo = await new Promise((resolve, reject) => {
          const options = {
            hostname: "api.github.com",
            path: `/repositories/${githubId}`,
            method: "GET",
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "DevMatch-App",
              ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
            },
          };

          console.log("10. Request options:", JSON.stringify(options, null, 2));

          const request = https.request(options, (response) => {
            console.log("11. Response received, status:", response.statusCode);
            console.log("12. Response headers:", JSON.stringify(response.headers, null, 2));

            let data = "";

            response.on("data", (chunk) => {
              data += chunk;
            });

            response.on("end", () => {
              console.log("13. Response complete, data length:", data.length);
              console.log("14. First 500 chars of response:", data.substring(0, 500));

              if (response.statusCode === 200) {
                try {
                  const parsed = JSON.parse(data);
                  console.log("15. Successfully parsed JSON, repo name:", parsed.full_name);
                  resolve(parsed);
                } catch (e) {
                  console.log("15. ERROR parsing JSON:", e.message);
                  reject({ status: 500, message: "Failed to parse response" });
                }
              } else if (response.statusCode === 404) {
                console.log("15. GitHub returned 404");
                reject({ status: 404, message: "Not found" });
              } else if (response.statusCode === 403) {
                console.log("15. GitHub returned 403 (rate limited)");
                reject({ status: 403, message: "Rate limited" });
              } else {
                console.log("15. GitHub returned unexpected status:", response.statusCode);
                reject({
                  status: response.statusCode,
                  message: `GitHub API error: ${response.statusCode}`,
                });
              }
            });
          });

          request.on("error", (error) => {
            console.log("11. REQUEST ERROR:", error.message);
            reject({ status: 500, message: error.message });
          });

          request.setTimeout(10000, () => {
            console.log("11. REQUEST TIMEOUT");
            request.destroy();
            reject({ status: 500, message: "Request timeout" });
          });

          console.log("10b. Sending request...");
          request.end();
        });

        console.log("16. GitHub fetch successful, saving to cache...");

        // Save to local cache
        const savedRepo = await RepoSnapshot.findOrCreateFromGitHub(
          githubId,
          githubRepo
        );
        console.log("17. Saved to cache, _id:", savedRepo._id);

        repo = savedRepo.toObject ? savedRepo.toObject() : savedRepo;
        console.log("18. Converted to object");

      } catch (error) {
        console.log("ERROR CAUGHT:", error);
        console.log("Error status:", error.status);
        console.log("Error message:", error.message);

        if (error.status === 404) {
          throw ApiError.notFound("Repository not found on GitHub");
        }
        if (error.status === 403) {
          throw ApiError.tooManyRequests(
            "GitHub API rate limit exceeded. Please try again later."
          );
        }

        throw ApiError.internal("Failed to fetch repository from GitHub");
      }
    }
  }

  if (!repo) {
    console.log("19. ERROR: repo is still null");
    throw ApiError.notFound("Repository not found");
  }

  console.log("20. SUCCESS! Returning repo:", repo.fullName || repo.name);
  console.log("=== getRepoById END ===");

  return ApiResponse.success(res, "Repository retrieved", repo);
});

/**
 * @desc    Get repo by owner/name
 * @route   GET /api/github/repos/:owner/:repo
 * @access  Public
 */
const getRepoByFullName = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const fullName = `${owner}/${repo}`;

  // Check local cache first
  let repoData = await RepoSnapshot.findOne({ fullName }).lean();

  if (repoData && !repoData.needsSync?.()) {
    return ApiResponse.success(res, "Repository retrieved", repoData);
  }

  // Fetch from GitHub
  try {
    const response = await githubApi.get(`/repos/${owner}/${repo}`);
    const githubRepo = response.data;

    // Save/update in cache
    repoData = await RepoSnapshot.findOrCreateFromGitHub(
      githubRepo.id,
      githubRepo
    );

    return ApiResponse.success(res, "Repository retrieved", repoData);
  } catch (error) {
    if (error.response?.status === 404) {
      throw ApiError.notFound("Repository not found on GitHub");
    }
    throw ApiError.internal("Failed to fetch repository");
  }
});

/**
 * @desc    Get repo README
 * @route   GET /api/github/repos/:id/readme
 * @access  Public
 */
const getRepoReadme = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log("=== getRepoReadme START ===");
  console.log("README requested for ID:", id);

  let repo = null;

  // Check if it's a valid MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    console.log("Searching by MongoDB _id...");
    repo = await RepoSnapshot.findById(id);
  }

  // If not found, try by githubId
  if (!repo) {
    const githubId = parseInt(id, 10);
    console.log("Searching by githubId:", githubId);
    if (!isNaN(githubId)) {
      repo = await RepoSnapshot.findOne({ githubId });
    }
  }

  console.log("Repo found:", repo ? repo.fullName : "NO");

  if (!repo) {
    throw ApiError.notFound("Repository not found in cache");
  }

  // Check if we have cached README (less than 24 hours old)
  if (repo.readme && repo.readmeFetchedAt) {
    const hoursSinceFetch =
      (Date.now() - repo.readmeFetchedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceFetch < 24) {
      console.log("Returning cached README, length:", repo.readme.length);
      console.log("=== getRepoReadme END ===");
      return ApiResponse.success(res, "README retrieved", {
        readme: repo.readme,
      });
    }
  }

  // Fetch from GitHub using native https
  console.log("Fetching README from GitHub for:", repo.fullName);
  const https = require("https");

  try {
    const readmeContent = await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.github.com",
        path: `/repos/${repo.fullName}/readme`,
        method: "GET",
        headers: {
          Accept: "application/vnd.github.raw",
          "User-Agent": "DevMatch-App",
          ...(GITHUB_TOKEN && { Authorization: `token ${GITHUB_TOKEN}` }),
        },
      };

      console.log("GitHub README request path:", options.path);

      const request = https.request(options, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          console.log("GitHub README response status:", response.statusCode);
          if (response.statusCode === 200) {
            resolve(data);
          } else if (response.statusCode === 404) {
            console.log("No README exists for this repo");
            resolve(null);
          } else {
            reject(new Error(`GitHub returned ${response.statusCode}`));
          }
        });
      });

      request.on("error", (error) => {
        console.log("README request error:", error.message);
        reject(error);
      });

      request.setTimeout(10000, () => {
        request.destroy();
        reject(new Error("Request timeout"));
      });

      request.end();
    });

    // Cache the README
    repo.readme = readmeContent;
    repo.readmeFetchedAt = new Date();
    await repo.save();

    console.log("README fetched and cached, length:", readmeContent?.length || 0);
    console.log("=== getRepoReadme END ===");

    return ApiResponse.success(res, "README retrieved", {
      readme: readmeContent,
    });
  } catch (error) {
    console.error("README fetch error:", error.message);
    console.log("=== getRepoReadme END (error) ===");
    return ApiResponse.success(res, "Failed to fetch README", { readme: null });
  }
});

/**
 * @desc    Sync repo from GitHub (refresh cache)
 * @route   POST /api/github/repos/:id/sync
 * @access  Public
 */
const syncRepo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const repo = await RepoSnapshot.findById(id);

  if (!repo) {
    throw ApiError.notFound("Repository not found");
  }

  try {
    const response = await githubApi.get(`/repos/${repo.fullName}`);
    repo.updateFromGitHub(response.data);
    await repo.save();

    return ApiResponse.success(res, "Repository synced", repo);
  } catch (error) {
    repo.syncError = error.message;
    await repo.save();
    throw ApiError.internal("Failed to sync repository");
  }
});

module.exports = {
  searchRepos,
  getTrendingRepos,
  getUserRepos,
  getRepoById,
  getRepoByFullName,
  getRepoReadme,
  syncRepo,
};
