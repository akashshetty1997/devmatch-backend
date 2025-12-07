/**
 * @file src/config/database.js
 * @description MongoDB connection handler with event logging
 */

const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../utils/logger");

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB (for graceful shutdown)
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
};

module.exports = { connectDB, disconnectDB };
