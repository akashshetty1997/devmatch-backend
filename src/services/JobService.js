/**
 * @file src/services/JobService.js
 * @description Job post business logic
 */

const JobPost = require("../models/JobPost");
const User = require("../models/User");
const RecruiterProfile = require("../models/RecruiterProfile");
const ApiError = require("../utils/ApiError");
const { ROLES } = require("../config/constants");

class JobService {
  /**
   * Create a new job post
   * @param {ObjectId} recruiterId
   * @param {Object} jobData
   */
  async createJob(recruiterId, jobData) {
    // Verify user is a recruiter
    const recruiter = await User.findById(recruiterId);
    if (!recruiter || recruiter.role !== ROLES.RECRUITER) {
      throw ApiError.forbidden("Only recruiters can create job posts");
    }

    // Get company name from profile if not provided
    if (!jobData.companyName) {
      const profile = await RecruiterProfile.findOne({ user: recruiterId });
      if (profile) {
        jobData.companyName = profile.companyName;
      } else {
        throw ApiError.badRequest("Company name is required");
      }
    }

    const job = await JobPost.create({
      ...jobData,
      recruiter: recruiterId,
    });

    await job.populate("recruiter", "username avatar");

    return job;
  }

  /**
   * Get job by ID
   * @param {ObjectId} jobId
   * @param {ObjectId} viewerId - Current user (optional)
   */
  async getJobById(jobId, viewerId = null) {
    const job = await JobPost.findById(jobId)
      .populate("recruiter", "username avatar")
      .populate("linkedRepos", "name fullName description stars language");

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    // Increment view count (don't count recruiter's own views)
    if (!viewerId || !job.recruiter._id.equals(viewerId)) {
      await job.incrementViews();
    }

    // Get application count
    const Application = require("../models/Application");
    const applicationCount = await Application.countDocuments({
      jobPost: jobId,
    });

    // Check if viewer has applied
    let hasApplied = false;
    if (viewerId) {
      const existingApplication = await Application.findOne({
        applicant: viewerId,
        jobPost: jobId,
      });
      hasApplied = !!existingApplication;
    }

    return {
      ...job.toObject(),
      applicationCount,
      hasApplied,
    };
  }

  /**
   * Update job post
   * @param {ObjectId} jobId
   * @param {ObjectId} recruiterId
   * @param {Object} updateData
   */
  async updateJob(jobId, recruiterId, updateData) {
    const job = await JobPost.findById(jobId);

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    if (!job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden("You can only update your own job posts");
    }

    // Update allowed fields
    const allowedFields = [
      "title",
      "description",
      "location",
      "workType",
      "requiredSkills",
      "preferredSkills",
      "minYearsExperience",
      "maxYearsExperience",
      "salary",
      "employmentType",
      "applicationDeadline",
      "externalApplicationUrl",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        job[field] = updateData[field];
      }
    });

    await job.save();
    await job.populate("recruiter", "username avatar");

    return job;
  }

  /**
   * Toggle job active status
   * @param {ObjectId} jobId
   * @param {ObjectId} recruiterId
   */
  async toggleJobStatus(jobId, recruiterId) {
    const job = await JobPost.findById(jobId);

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    if (!job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden("You can only update your own job posts");
    }

    job.isActive = !job.isActive;
    await job.save();

    return {
      job,
      message: job.isActive ? "Job post activated" : "Job post deactivated",
    };
  }

  /**
   * Delete job post
   * @param {ObjectId} jobId
   * @param {ObjectId} recruiterId
   * @param {boolean} isAdmin
   */
  async deleteJob(jobId, recruiterId, isAdmin = false) {
    const job = await JobPost.findById(jobId);

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    if (!isAdmin && !job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden("You can only delete your own job posts");
    }

    await job.deleteOne();

    return { deleted: true };
  }

  /**
   * Search jobs with filters
   * @param {Object} filters - { q, skills, workType, country, maxExperience, employmentType }
   * @param {Object} options - { page, limit }
   */
  async searchJobs(filters = {}, options = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const query = { isActive: true };

    // Text search using regex (more reliable than $text index)
    if (filters.q && filters.q.trim()) {
      query.$or = [
        { title: { $regex: filters.q, $options: "i" } },
        { companyName: { $regex: filters.q, $options: "i" } },
        { description: { $regex: filters.q, $options: "i" } },
      ];
    }

    // Parse skills if string
    if (filters.skills) {
      const skillsArray =
        typeof filters.skills === "string"
          ? filters.skills.split(",").map((s) => s.trim().toLowerCase())
          : filters.skills;

      if (skillsArray.length > 0) {
        query.requiredSkills = { $in: skillsArray };
      }
    }

    // Work type filter
    if (filters.workType && filters.workType.trim()) {
      query.workType = filters.workType.toUpperCase();
    }

    // Country filter
    if (filters.country && filters.country.trim()) {
      query["location.country"] = { $regex: filters.country, $options: "i" };
    }

    // Experience filter
    if (filters.maxExperience && !isNaN(filters.maxExperience)) {
      query.minYearsExperience = { $lte: parseInt(filters.maxExperience, 10) };
    }

    // Employment type filter
    if (filters.employmentType && filters.employmentType.trim()) {
      query.employmentType = filters.employmentType.toUpperCase();
    }

    try {
      const [jobs, total] = await Promise.all([
        JobPost.find(query)
          .populate("recruiter", "username avatar")
          .sort({ isFeatured: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        JobPost.countDocuments(query),
      ]);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("searchJobs error:", error);
      throw ApiError.internal("Failed to search jobs");
    }
  }

  /**
   * Get featured jobs
   * @param {number} limit
   */
  async getFeaturedJobs(limit = 5) {
    try {
      const jobs = await JobPost.find({
        isActive: true,
        isFeatured: true,
      })
        .populate("recruiter", "username avatar")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return jobs;
    } catch (error) {
      console.error("getFeaturedJobs error:", error);
      throw ApiError.internal("Failed to get featured jobs");
    }
  }

  /**
   * Get jobs by recruiter
   * @param {ObjectId} recruiterId
   * @param {Object} options - { isActive, page, limit }
   */
  async getRecruiterJobs(recruiterId, options = {}) {
    const { isActive, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = { recruiter: recruiterId };
    if (isActive !== undefined) {
      query.isActive = isActive === "true" || isActive === true;
    }

    try {
      const [jobs, total] = await Promise.all([
        JobPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        JobPost.countDocuments(query),
      ]);

      // Get application counts for each job
      const Application = require("../models/Application");
      const jobsWithCounts = await Promise.all(
        jobs.map(async (job) => {
          const applicationCount = await Application.countDocuments({
            jobPost: job._id,
          });
          return { ...job, applicationCount };
        })
      );

      return {
        jobs: jobsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("getRecruiterJobs error:", error);
      throw ApiError.internal("Failed to get recruiter jobs");
    }
  }

  /**
   * Get recent jobs
   * @param {number} limit
   */
  async getRecentJobs(limit = 10) {
    try {
      const jobs = await JobPost.find({ isActive: true })
        .populate("recruiter", "username avatar")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return jobs;
    } catch (error) {
      console.error("getRecentJobs error:", error);
      throw ApiError.internal("Failed to get recent jobs");
    }
  }

  /**
   * Link repository to job post
   * @param {ObjectId} jobId
   * @param {ObjectId} recruiterId
   * @param {ObjectId} repoId
   */
  async linkRepo(jobId, recruiterId, repoId) {
    const job = await JobPost.findById(jobId);

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    if (!job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden("You can only update your own job posts");
    }

    if (!job.linkedRepos.includes(repoId)) {
      job.linkedRepos.push(repoId);
      await job.save();
    }

    return job;
  }

  /**
   * Unlink repository from job post
   * @param {ObjectId} jobId
   * @param {ObjectId} recruiterId
   * @param {ObjectId} repoId
   */
  async unlinkRepo(jobId, recruiterId, repoId) {
    const job = await JobPost.findById(jobId);

    if (!job) {
      throw ApiError.notFound("Job post not found");
    }

    if (!job.recruiter.equals(recruiterId)) {
      throw ApiError.forbidden("You can only update your own job posts");
    }

    job.linkedRepos = job.linkedRepos.filter(
      (id) => id.toString() !== repoId.toString()
    );
    await job.save();

    return job;
  }
}

module.exports = new JobService();