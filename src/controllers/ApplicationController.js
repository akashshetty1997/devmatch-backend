/**
 * @file src/controllers/ApplicationController.js
 * @description Job application endpoints
 */

const ApplicationService = require("../services/ApplicationService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Apply to a job
 * @route   POST /api/jobs/:jobId/applications
 * @access  Private (Developer only)
 */
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { coverLetter, resumeUrl } = req.body;

  const result = await ApplicationService.applyToJob(req.user._id, jobId, {
    coverLetter,
    resumeUrl,
  });

  if (!result.isNewApplication) {
    return ApiResponse.success(
      res,
      "You have already applied to this job",
      result
    );
  }

  return ApiResponse.created(res, "Application submitted successfully", result);
});

/**
 * @desc    Get applications for a job (recruiter)
 * @route   GET /api/jobs/:jobId/applications
 * @access  Private (Recruiter - job owner)
 */
const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { status, page, limit } = req.query;

  const result = await ApplicationService.getJobApplications(
    jobId,
    req.user._id,
    {
      status,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
    }
  );

  return ApiResponse.success(res, "Applications retrieved", result);
});

/**
 * @desc    Get my applications (developer)
 * @route   GET /api/applications/me
 * @access  Private (Developer)
 */
const getMyApplications = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;

  const result = await ApplicationService.getMyApplications(req.user._id, {
    status,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 20,
  });

  return ApiResponse.success(res, "Your applications retrieved", result);
});

/**
 * @desc    Get single application details
 * @route   GET /api/applications/:applicationId
 * @access  Private (Developer who applied or Recruiter who owns job)
 */
const getApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  const application = await ApplicationService.getApplicationById(
    applicationId,
    req.user._id,
    req.user.role
  );

  return ApiResponse.success(res, "Application retrieved", application);
});

/**
 * @desc    Update application status
 * @route   PATCH /api/applications/:applicationId/status
 * @access  Private (Recruiter - job owner)
 */
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status, note } = req.body;

  const result = await ApplicationService.updateApplicationStatus(
    applicationId,
    req.user._id,
    status,
    note
  );

  return ApiResponse.success(
    res,
    `Application status updated to ${status}`,
    result
  );
});

/**
 * @desc    Add recruiter notes
 * @route   PATCH /api/applications/:applicationId/notes
 * @access  Private (Recruiter - job owner)
 */
const addRecruiterNotes = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { notes } = req.body;

  const application = await ApplicationService.addRecruiterNotes(
    applicationId,
    req.user._id,
    notes
  );

  return ApiResponse.success(res, "Notes added", application);
});

/**
 * @desc    Withdraw application
 * @route   DELETE /api/applications/:applicationId
 * @access  Private (Developer who applied)
 */
const withdrawApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;

  await ApplicationService.withdrawApplication(applicationId, req.user._id);

  return ApiResponse.success(res, "Application withdrawn");
});

module.exports = {
  applyToJob,
  getJobApplications,
  getMyApplications,
  getApplication,
  updateApplicationStatus,
  addRecruiterNotes,
  withdrawApplication,
};
