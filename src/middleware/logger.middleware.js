/**
 * @file src/middleware/logger.middleware.js
 * @description Request logging middleware using Morgan
 */

const morgan = require("morgan");
const config = require("../config");
const logger = require("../utils/logger");

// Custom token for user ID
morgan.token("user-id", (req) => {
  return req.user?._id?.toString() || "anonymous";
});

// Custom token for response time in a readable format
morgan.token("response-time-ms", (req, res) => {
  const time = morgan["response-time"](req, res);
  return time ? `${parseFloat(time).toFixed(2)}ms` : "-";
});

// Define log format based on environment
const getFormat = () => {
  if (config.env === "development") {
    // Colorful, detailed format for development
    return ":method :url :status :response-time-ms - :user-id";
  }
  // JSON format for production (easier to parse)
  return JSON.stringify({
    method: ":method",
    url: ":url",
    status: ":status",
    responseTime: ":response-time-ms",
    userId: ":user-id",
    userAgent: ":user-agent",
    ip: ":remote-addr",
  });
};

// Stream logs to Winston
const stream = {
  write: (message) => {
    // Remove newline from morgan output
    const logMessage = message.trim();

    // Parse status code to determine log level
    const statusMatch = logMessage.match(/"status":"(\d+)"|:status (\d+)/);
    const status = statusMatch
      ? parseInt(statusMatch[1] || statusMatch[2], 10)
      : 200;

    if (status >= 500) {
      logger.error(logMessage);
    } else if (status >= 400) {
      logger.warn(logMessage);
    } else {
      logger.info(logMessage);
    }
  },
};

// Skip logging for certain routes (health checks, static files)
const skip = (req, res) => {
  const skipPaths = ["/health", "/favicon.ico"];
  return skipPaths.some((path) => req.url.startsWith(path));
};

const requestLogger = morgan(getFormat(), { stream, skip });

module.exports = requestLogger;
