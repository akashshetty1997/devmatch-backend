/**
 * @file src/routes/activity.routes.js
 * @description Activity/notification routes
 */

const express = require("express");
const router = express.Router();
const {
  getFeed,
  getUnreadCount,
  markAsRead,
  markOneAsRead,
  deleteActivity,
  clearAll,
} = require("../controllers/ActivityController");
const { protect } = require("../middleware/auth.middleware");
const { validateObjectId } = require("../middleware/validate.middleware");

// All routes are protected
router.use(protect);

// Get activity feed
router.get("/", getFeed);

// Get unread count
router.get("/unread/count", getUnreadCount);

// Mark as read (batch or all)
router.post("/read", markAsRead);

// Mark single as read
router.patch(
  "/:activityId/read",
  validateObjectId("activityId"),
  markOneAsRead
);

// Delete single activity
router.delete("/:activityId", validateObjectId("activityId"), deleteActivity);

// Clear all activities
router.delete("/all", clearAll);

module.exports = router;
