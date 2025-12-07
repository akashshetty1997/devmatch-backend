/**
 * @file src/routes/index.js
 * @description Central route mounting
 */

const express = require("express");
const router = express.Router();

// Import all route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const profileRoutes = require("./profile.routes");
const repoRoutes = require("./repo.routes");
const jobRoutes = require("./job.routes");
const postRoutes = require("./post.routes");
const skillRoutes = require("./skill.routes");
const reviewRoutes = require("./review.routes");
const applicationRoutes = require("./application.routes");
const activityRoutes = require("./activity.routes");
const followRoutes = require("./follow.routes");
const { commentRouter } = require("./comment.routes");
const adminRoutes = require("./admin.routes"); 
const developerRoutes = require("./developer.routes");
const githubRoutes = require("./github.routes");



// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/users", followRoutes);
router.use("/profile", profileRoutes);
router.use("/repos", repoRoutes);
router.use("/jobs", jobRoutes);
router.use("/posts", postRoutes);
router.use("/skills", skillRoutes);
router.use("/reviews", reviewRoutes);
router.use("/applications", applicationRoutes);
router.use("/activity", activityRoutes);
router.use("/comments", commentRouter);
router.use("/admin", adminRoutes); 
router.use("/developers", developerRoutes);
router.use("/github", githubRoutes);


// Health check
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "DevMatch API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

module.exports = router;