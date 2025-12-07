/**
 * @file src/controllers/ActivityController.js
 * @description Activity/notification endpoints
 */

const ActivityService = require("../services/ActivityService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get activity feed
 * @route   GET /api/activity
 * @access  Private
 */
const getFeed = asyncHandler(async (req, res) => {
  const { type, unreadOnly, page, limit } = req.query;

  const result = await ActivityService.getFeed(req.user._id, {
    type,
    unreadOnly: unreadOnly === "true",
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Activity feed retrieved", result);
});

/**
 * @desc    Get unread count
 * @route   GET /api/activity/unread/count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await ActivityService.getUnreadCount(req.user._id);

  return ApiResponse.success(res, "Unread count retrieved", {
    unreadCount: count,
  });
});

/**
 * @desc    Mark activities as read
 * @route   POST /api/activity/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { activityIds } = req.body; // Optional array of IDs

  await ActivityService.markAsRead(req.user._id, activityIds || []);

  return ApiResponse.success(res, "Activities marked as read");
});

/**
 * @desc    Mark single activity as read
 * @route   PATCH /api/activity/:activityId/read
 * @access  Private
 */
const markOneAsRead = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  const activity = await ActivityService.markOneAsRead(
    activityId,
    req.user._id
  );

  return ApiResponse.success(res, "Activity marked as read", activity);
});

/**
 * @desc    Delete an activity
 * @route   DELETE /api/activity/:activityId
 * @access  Private
 */
const deleteActivity = asyncHandler(async (req, res) => {
  const { activityId } = req.params;

  await ActivityService.deleteActivity(activityId, req.user._id);

  return ApiResponse.success(res, "Activity deleted");
});

/**
 * @desc    Clear all activities
 * @route   DELETE /api/activity/all
 * @access  Private
 */
const clearAll = asyncHandler(async (req, res) => {
  const result = await ActivityService.clearAll(req.user._id);

  return ApiResponse.success(res, "All activities cleared", result);
});

module.exports = {
  getFeed,
  getUnreadCount,
  markAsRead,
  markOneAsRead,
  deleteActivity,
  clearAll,
};
