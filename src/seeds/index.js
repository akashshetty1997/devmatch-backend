/**
 * @file src/seeds/index.js
 * @description Run all seeds
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { connectDB, disconnectDB } = require("../config/database");

const runSeeds = async () => {
  try {
    await connectDB();
    console.log("🌱 Starting database seeding...\n");

    // Seed skills
    await require("./skills.seed")();

    // Seed admin
    await require("./admin.seed")();

    console.log("\n✅ All seeds completed successfully!");
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

runSeeds();
