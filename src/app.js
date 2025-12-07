/**
 * @file src/app.js
 * @description Express app configuration
 */

const express = require("express");
const cookieParser = require("cookie-parser");
const routes = require("./routes");
const {
  corsMiddleware,
  securityHeaders,
  sanitizeData,
  preventParamPollution,
  xssProtection,
  requestLogger,
  apiLimiter,
  errorConverter,
  errorHandler,
  notFound,
} = require("./middleware");

const app = express();

// ==================== MIDDLEWARE ====================

// Security headers
app.use(securityHeaders);

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Cookie parsing
app.use(cookieParser());

// Data sanitization
app.use(sanitizeData);
app.use(xssProtection);

// Prevent parameter pollution
app.use(preventParamPollution);

// Request logging
app.use(requestLogger);

// Rate limiting
app.use("/api", apiLimiter);

// ==================== ROUTES ====================

// API routes
app.use("/api", routes);

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to DevMatch API",
    documentation: "/api/health",
  });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use(notFound);

// Convert errors to ApiError
app.use(errorConverter);

// Global error handler
app.use(errorHandler);

module.exports = app;
