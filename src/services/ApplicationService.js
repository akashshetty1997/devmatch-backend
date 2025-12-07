/**
 * @file src/services/ApplicationService.js
 * @description Job application business logic
 */

const Application = require("../models/Application");
const JobPost = require("../models/JobPost");
const User = require("../models/User");
const DeveloperProfile = require("../models/DeveloperProfile");
const Activity = require("../models/Activity");
const ApiError = require("../utils/ApiError");
const { APPLICATION_STATUS } = require("../config/constants");

class ApplicationService {
  /**
   * Apply to a job
   * @param {ObjectId} developerId
   * @param {ObjectId} jobPostId
   * @param {Object} data - { coverLetter, resumeUrl }
   */
  async applyToJob(developerId, jobPostId, data = {}) {
    // Verify user is a developer
    const developer = await User.findOne({
      _id: developerId,
      role: "DEVELOPER",
    });

    if (!developer) {
      throw ApiError.forbidden("Only developers can apply to jobs");
    }

    // Verify job exists and is active
    const job = await JobPost.findOne({
      _id: jobPostId,
      isActive: true,
    });

    if (!job) {
      throw ApiError.notFound(
        "Job not found or no longer accepting applications"
      );
    }

    // Check deadline
    if (job.applicationDeadline && new Date() > job.applicationDeadline) {
      throw ApiError.badRequest("Application deadline has passed");
    }

    // Get developer profile for skills match
    const devProfile = await DeveloperProfile.findOne({ user: developerId });
    let skillsMatchPercent = 0;

    if (devProfile && job.requiredSkills.length > 0) {
      skillsMatchPercent = job.calculateSkillsMatch(devProfile.skills || []);
    }

    // Create application
    const result = await Application.apply(developerId, jobPostId, {
      coverLetter: data.coverLetter,
      resumeUrl: data.resumeUrl,
      skillsMatchPercent,
    });

    // Log activity for recruiter if new application
    if (result.created) {
      await Activity.logApplication(
        developerId,
        job.recruiter,
        jobPostId,
        result.application._id
      );
    }

    return {
      application: result.application,
      isNewApplication: result.created,
      skillsMatch: skillsMatchPercent,
    };
  }

  /**
   * Get applications for a job (recruiter only)
   * @param {ObjectId} jobPostId
   * @param {ObjectId} recruiterId
   * @param {Object} options - { status, page, limit }
   */
  async getJobApplications(jobPostId, recruiterId, options = {}) {
    // Verify job belongs to recruiter
    const job = await JobPost.findById(jobPostId);

    if (!job) {
      throw ApiError.notFound("Job not found");
    }

    if (!job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden(
        "You can only view applications for your own jobs"
      );
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [applications, total, stats] = await Promise.all([
      Application.getByJob(jobPostId, { status: options.status, skip, limit }),
      Application.countDocuments({
        jobPost: jobPostId,
        ...(options.status && { status: options.status }),
      }),
      Application.getJobStats(jobPostId),
    ]);

    return {
      applications,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get applications by developer (their own applications)
   * @param {ObjectId} developerId
   * @param {Object} options
   */
  async getMyApplications(developerId, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      Application.getByDeveloper(developerId, {
        status: options.status,
        skip,
        limit,
      }),
      Application.countDocuments({
        developer: developerId,
        ...(options.status && { status: options.status }),
      }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update application status (recruiter only)
   * @param {ObjectId} applicationId
   * @param {ObjectId} recruiterId
   * @param {string} newStatus
   * @param {string} note - Optional note
   */
  async updateApplicationStatus(
    applicationId,
    recruiterId,
    newStatus,
    note = ""
  ) {
    // Validate status
    if (!Object.values(APPLICATION_STATUS).includes(newStatus)) {
      throw ApiError.badRequest("Invalid application status");
    }

    const application = await Application.findById(applicationId).populate(
      "jobPost",
      "recruiter title"
    );

    if (!application) {
      throw ApiError.notFound("Application not found");
    }

    // Verify recruiter owns the job
    if (!application.jobPost.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden(
        "You can only update applications for your own jobs"
      );
    }

    const oldStatus = application.status;

    // Update status with history
    await application.updateStatus(newStatus, recruiterId, note);

    // Log activity for developer
    await Activity.logStatusChange(
      recruiterId,
      application.developer,
      applicationId,
      newStatus
    );

    return {
      application,
      previousStatus: oldStatus,
      newStatus,
    };
  }

  /**
   * Add recruiter notes to application
   * @param {ObjectId} applicationId
   * @param {ObjectId} recruiterId
   * @param {string} notes
   */
  async addRecruiterNotes(applicationId, recruiterId, notes) {
    const application = await Application.findById(applicationId).populate(
      "jobPost",
      "recruiter"
    );

    if (!application) {
      throw ApiError.notFound("Application not found");
    }

    if (!application.jobPost.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden(
        "You can only add notes to applications for your own jobs"
      );
    }

    application.recruiterNotes = notes;
    await application.save();

    return application;
  }

  /**
   * Get single application details
   * @param {ObjectId} applicationId
   * @param {ObjectId} userId
   * @param {string} userRole
   */
  async getApplicationById(applicationId, userId, userRole) {
    const application = await Application.findById(applicationId)
      .populate("developer", "username avatar role")
      .populate("jobPost", "title companyName recruiter location workType");

    if (!application) {
      throw ApiError.notFound("Application not found");
    }

    // Check access: either the developer who applied or the recruiter who owns the job
    const isDeveloper = application.developer._id.equals(userId);
    const isRecruiter = application.jobPost.recruiter.equals(userId);
    const isAdmin = userRole === "ADMIN";

    if (!isDeveloper && !isRecruiter && !isAdmin) {
      throw ApiError.forbidden("You do not have access to this application");
    }

    // Hide recruiter notes from developer
    if (isDeveloper && !isAdmin) {
      application.recruiterNotes = undefined;
    }

    return application;
  }

  /**
   * Withdraw application (developer only)
   * @param {ObjectId} applicationId
   * @param {ObjectId} developerId
   */
  async withdrawApplication(applicationId, developerId) {
    const application = await Application.findById(applicationId);

    if (!application) {
      throw ApiError.notFound("Application not found");
    }

    if (!application.developer.equals(developerId)) {
      throw ApiError.forbidden("You can only withdraw your own applications");
    }

    // Only allow withdrawal if still pending
    if (application.status !== APPLICATION_STATUS.PENDING) {
      throw ApiError.badRequest("Can only withdraw pending applications");
    }

    await Application.deleteOne({ _id: applicationId });

    return { withdrawn: true };
  }
}

module.exports = new ApplicationService();
