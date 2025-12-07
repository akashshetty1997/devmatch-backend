/**
 * @file src/routes/admin.routes.js
 * @description Admin routes for dashboard, user management, skills, jobs
 */

const express = require("express");
const router = express.Router();
const AdminController = require("../controllers/AdminController");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All admin routes require authentication and ADMIN role
router.use(protect);
router.use(restrictTo("ADMIN"));

// ==================== DASHBOARD ====================
router.get("/dashboard/stats", AdminController.getDashboardStats);
router.get("/dashboard/recent-users", AdminController.getRecentUsers);
router.get("/dashboard/activity", AdminController.getRecentActivity);

// ==================== USER MANAGEMENT ====================
router.get("/users", AdminController.getUsers);
router.get("/users/:userId", AdminController.getUser);
router.patch("/users/:userId/role", AdminController.updateUserRole);
router.patch("/users/:userId/ban", AdminController.banUser);
router.patch("/users/:userId/unban", AdminController.unbanUser);
router.delete("/users/:userId", AdminController.deleteUser);

// ==================== SKILL MANAGEMENT ====================
router.get("/skills", AdminController.getSkills);
router.post("/skills", AdminController.createSkill);
router.put("/skills/:skillId", AdminController.updateSkill);
router.patch("/skills/:skillId/activate", AdminController.activateSkill);
router.patch("/skills/:skillId/deactivate", AdminController.deactivateSkill);
router.delete("/skills/:skillId", AdminController.deleteSkill);

// ==================== JOB MANAGEMENT ====================
router.get("/jobs", AdminController.getJobs);
router.patch("/jobs/:jobId/featured", AdminController.toggleJobFeatured);
router.patch("/jobs/:jobId/deactivate", AdminController.deactivateJob);
router.delete("/jobs/:jobId", AdminController.deleteJob);

module.exports = router;