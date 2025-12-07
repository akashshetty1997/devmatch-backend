/**
 * @file src/server.js
 * @description Server entry point
 */

const app = require("./app");
const config = require("./config");
const { connectDB, disconnectDB } = require("./config/database");
const logger = require("./utils/logger");

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...");
  logger.error(err.name, err.message);
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(
        `Server running in ${config.env} mode on port ${config.port}`
      );
      logger.info(`API available at http://localhost:${config.port}/api`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      logger.error("UNHANDLED REJECTION! Shutting down...");
      logger.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      server.close(async () => {
        await disconnectDB();
        logger.info("Process terminated.");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received. Shutting down gracefully...");
      server.close(async () => {
        await disconnectDB();
        logger.info("Process terminated.");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
