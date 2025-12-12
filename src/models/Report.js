/**
 * @file src/models/Report.js
 * @description Report model for flagged content
 */

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["POST", "COMMENT", "USER", "JOB"],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        "SPAM",
        "HARASSMENT",
        "HATE_SPEECH",
        "INAPPROPRIATE",
        "FAKE",
        "COPYRIGHT",
        "OTHER",
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["PENDING", "REVIEWED", "RESOLVED"],
      default: "PENDING",
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The user being reported (for USER type) or content owner
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Reference to the reported content
    reportedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    reportedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    reportedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
    },
    // Resolution details
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
    action: {
      type: String,
      enum: ["DISMISS", "WARN", "REMOVE", "BAN"],
    },
    adminNotes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ reportedUser: 1 });

module.exports = mongoose.model("Report", reportSchema);
