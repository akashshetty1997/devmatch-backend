/**
 * @file src/models/User.js
 * @description Base User model - handles authentication and core user data
 * All users (Developer, Recruiter, Admin) share this base model
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { ROLES, USER_STATUS } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    // Unique username for profile URL
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-z0-9_-]+$/,
        "Username can only contain lowercase letters, numbers, underscores, and hyphens",
      ],
    },

    // Email for authentication
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/,
        "Please provide a valid email",
      ],
    },

    // Hashed password
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include in queries by default
    },

    // User role
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "Invalid role",
      },
      required: [true, "Role is required"],
    },

    // Account status
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },

    // Profile picture URL
    avatar: {
      type: String,
      default: null,
    },

    // Password reset fields
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Last login tracking
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
userSchema.index({ role: 1, status: 1 });

// ==================== VIRTUALS ====================

/**
 * Virtual: Get user's profile based on role
 * Populated separately to avoid circular dependency
 */
userSchema.virtual("developerProfile", {
  ref: "DeveloperProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

userSchema.virtual("recruiterProfile", {
  ref: "RecruiterProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});

// ==================== HOOKS ====================

/**
 * Pre-save: Hash password before saving
 */
userSchema.pre("save", async function (next) {
  // Only hash if password is modified
  if (!this.isModified("password")) {
    return next();
  }

  // Hash password with bcrypt
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ==================== METHODS ====================

/**
 * Compare password with hashed password
 * @param {string} candidatePassword - Plain text password to check
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Generate JWT token
 * @returns {string} JWT token
 */
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expire,
    }
  );
};

/**
 * Return user data without sensitive fields
 * @returns {Object}
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    avatar: this.avatar,
    createdAt: this.createdAt,
  };
};

// ==================== STATICS ====================

/**
 * Find user by email (include password for auth)
 * @param {string} email
 * @returns {Promise<User>}
 */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select("+password");
};

/**
 * Check if email is already taken
 * @param {string} email
 * @param {string} excludeUserId - Exclude this user from check (for updates)
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({
    email: email.toLowerCase(),
    _id: { $ne: excludeUserId },
  });
  return !!user;
};

/**
 * Check if username is already taken
 * @param {string} username
 * @param {string} excludeUserId
 * @returns {Promise<boolean>}
 */
userSchema.statics.isUsernameTaken = async function (username, excludeUserId) {
  const user = await this.findOne({
    username: username.toLowerCase(),
    _id: { $ne: excludeUserId },
  });
  return !!user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
