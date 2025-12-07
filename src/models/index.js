/**
 * @file src/models/index.js
 * @description Central export for all models
 * Import pattern: const { User, Post, Follow } = require('./models');
 */

const User = require("./User");
const DeveloperProfile = require("./DeveloperProfile");
const RecruiterProfile = require("./RecruiterProfile");
const RepoSnapshot = require("./RepoSnapshot");
const JobPost = require("./JobPost");
const Post = require("./Post");
const Comment = require("./Comment");
const Like = require("./Like");
const Review = require("./Review");
const Application = require("./Application");
const Follow = require("./Follow");
const Activity = require("./Activity");
const Skill = require("./Skill");

module.exports = {
  User,
  DeveloperProfile,
  RecruiterProfile,
  RepoSnapshot,
  JobPost,
  Post,
  Comment,
  Like,
  Review,
  Application,
  Follow,
  Activity,
  Skill,
};
