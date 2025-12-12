/**
 * @file src/controllers/JobController.js
 * @description Job post endpoints
 */

const JobService = require("../services/JobService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Create a new job post
 * @route   POST /api/jobs
 * @access  Private (Recruiter)
 */
const createJob = asyncHandler(async (req, res) => {
  const job = await JobService.createJob(req.user._id, req.body);

  return ApiResponse.created(res, "Job post created", job);
});

/**
 * @desc    Get job by ID
 * @route   GET /api/jobs/:jobId
 * @access  Public
 */
const getJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const viewerId = req.user?._id || null;

  const job = await JobService.getJobById(jobId, viewerId);

  return ApiResponse.success(res, "Job retrieved", job);
});

/**
 * @desc    Update job post
 * @route   PUT /api/jobs/:jobId
 * @access  Private (Recruiter - owner)
 */
const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await JobService.updateJob(jobId, req.user._id, req.body);

  return ApiResponse.success(res, "Job updated", job);
});

/**
 * @desc    Toggle job status (active/inactive)
 * @route   PATCH /api/jobs/:jobId/status
 * @access  Private (Recruiter - owner)
 */
const toggleJobStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const result = await JobService.toggleJobStatus(jobId, req.user._id);

  return ApiResponse.success(res, result.message, result.job);
});

/**
 * @desc    Delete job post
 * @route   DELETE /api/jobs/:jobId
 * @access  Private (Recruiter - owner or Admin)
 */
const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const isAdmin = req.user.role === "ADMIN";

  await JobService.deleteJob(jobId, req.user._id, isAdmin);

  return ApiResponse.success(res, "Job deleted");
});

/**
 * @desc    Search jobs
 * @route   GET /api/jobs
 * @access  Public
 */
const getJobs = asyncHandler(async (req, res) => {
  const { q, skills, workType, country, maxExperience, page, limit } =
    req.query;

  const result = await JobService.searchJobs(
    {
      q,
      skills,
      workType,
      country,
      maxExperience: parseInt(maxExperience, 10),
    },
    {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    }
  );

  return ApiResponse.success(res, "Jobs retrieved", result);
});

/**
 * @desc    Get featured jobs (fallback to latest if none)
 * @route   GET /api/jobs/featured
 * @access  Public
 */
const getFeaturedJobs = asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const parsedLimit = parseInt(limit, 10) || 5;

  // Try to get featured jobs first
  let jobs = await JobService.getFeaturedJobs(parsedLimit);

  // If no featured jobs, get recent jobs instead
  if (!jobs || jobs.length === 0) {
    jobs = await JobService.getRecentJobs(parsedLimit);
  }

  return ApiResponse.success(res, "Featured jobs retrieved", jobs);
});

/**
 * @desc    Get my job posts (recruiter)
 * @route   GET /api/jobs/me
 * @access  Private (Recruiter)
 */
const getMyJobs = asyncHandler(async (req, res) => {
  const { isActive, page, limit } = req.query;

  const result = await JobService.getRecruiterJobs(req.user._id, {
    isActive,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Your jobs retrieved", result);
});

/**
 * @desc    Get recent jobs
 * @route   GET /api/jobs/recent
 * @access  Public
 */
const getRecentJobs = asyncHandler(async (req, res) => {
  const { limit } = req.query;

  const jobs = await JobService.getRecentJobs(parseInt(limit, 10) || 10);

  return ApiResponse.success(res, "Recent jobs retrieved", jobs);
});

module.exports = {
  createJob,
  getJob,
  updateJob,
  toggleJobStatus,
  deleteJob,
  getJobs,
  getFeaturedJobs,
  getMyJobs,
  getRecentJobs,
};
