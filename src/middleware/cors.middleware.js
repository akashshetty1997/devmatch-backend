/**
 * @file src/middleware/cors.middleware.js
 * @description CORS configuration
 */

const cors = require("cors");
const config = require("../config");

/**
 * CORS options
 * Allows requests from frontend URL and handles credentials
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // List of allowed origins
    const allowedOrigins = [
      config.clientUrl,
      "http://localhost:3000",
      "http://localhost:5173", // Vite default
    ];

    // In production, be more strict
    if (config.env === "production") {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  credentials: true, // Allow cookies
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit"],
  maxAge: 86400, // Cache preflight for 24 hours
};

const corsMiddleware = cors(corsOptions);

module.exports = corsMiddleware;
