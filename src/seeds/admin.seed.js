/**
 * @file src/seeds/admin.seed.js
 * @description Seed admin user
 */

const User = require("../models/User");
const { ROLES } = require("../config/constants");

const seedAdmin = async () => {
  console.log("👤 Seeding admin user...");

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@devmatch.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log(`   Admin already exists (${adminEmail}). Skipping.`);
      return existingAdmin;
    }

    const admin = await User.create({
      username: "admin",
      email: adminEmail,
      password: adminPassword,
      role: ROLES.ADMIN,
    });

    console.log(`   ✅ Admin created: ${admin.email}`);
    return admin;
  } catch (error) {
    console.error("   ❌ Error seeding admin:", error.message);
    throw error;
  }
};

module.exports = seedAdmin;
