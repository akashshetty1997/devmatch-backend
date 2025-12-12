/**
 * @file src/config/index.js
 * @description Central configuration - loads and validates environment variables
 */

const dotenv = require("dotenv");
const path = require("path");

// Load .env file from root directory
dotenv.config({ path: path.join(__dirname, "../../.env") });

const config = {
  // Server
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 5000,

  // MongoDB
  mongoUri: process.env.MONGODB_URI,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expire: process.env.JWT_EXPIRE || "7d",
  },

  // GitHub API
  github: {
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    token: process.env.GITHUB_TOKEN || null,
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || null,
  },

  // CORS - Frontend URL
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",

  // Rate Limiting (increased for better UX)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500, // Increased from 100
  },
};

/**
 * Validate required environment variables on startup
 * Fail fast if critical config is missing
 */
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"];
const missing = requiredEnvVars.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
}

module.exports = config;
