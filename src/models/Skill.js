/**
 * @file src/models/Skill.js
 * @description Skill model - Admin manageable skills with categories
 *
 * Structure:
 * - name: Display name (e.g., "Vue.js")
 * - slug: URL-friendly key (e.g., "vue-js") - unique identifier
 * - category: Skill category (FRONTEND, BACKEND, etc.)
 * - isActive: Soft delete flag
 * - usageCount: Track popularity (optional, for sorting)
 */

const mongoose = require("mongoose");
const { SKILL_CATEGORIES } = require("../config/constants");

const skillSchema = new mongoose.Schema(
  {
    // Display name shown to users
    name: {
      type: String,
      required: [true, "Skill name is required"],
      trim: true,
      maxlength: [50, "Skill name cannot exceed 50 characters"],
    },

    // URL-friendly unique identifier (auto-generated from name)
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Category for grouping skills
    category: {
      type: String,
      required: [true, "Skill category is required"],
      enum: {
        values: Object.values(SKILL_CATEGORIES),
        message: "Invalid skill category",
      },
      index: true,
    },

    // Soft delete - inactive skills won't show in dropdowns
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Track how many users/jobs use this skill (for popularity sorting)
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional icon or color for frontend display
    icon: {
      type: String,
      default: null,
    },

    // Admin who created/modified
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries
skillSchema.index({ category: 1, isActive: 1, name: 1 });
skillSchema.index({ name: "text" }); // Text search

/**
 * Pre-save hook: Generate slug from name
 */
skillSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
      .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
  }
  next();
});

/**
 * Static method: Get all active skills grouped by category
 * @returns {Promise<Object>} Skills grouped by category
 */
skillSchema.statics.getGroupedByCategory = async function () {
  const skills = await this.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();

  // Group by category
  const grouped = skills.reduce((acc, skill) => {
    const category = skill.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push({
      id: skill._id,
      name: skill.name,
      slug: skill.slug,
      icon: skill.icon,
    });
    return acc;
  }, {});

  return grouped;
};

/**
 * Static method: Get skills by slugs (for validation)
 * @param {string[]} slugs - Array of skill slugs
 * @returns {Promise<Skill[]>}
 */
skillSchema.statics.findBySlugs = async function (slugs) {
  return this.find({
    slug: { $in: slugs },
    isActive: true,
  }).lean();
};

/**
 * Static method: Validate skill slugs exist
 * @param {string[]} slugs - Array of skill slugs to validate
 * @returns {Promise<boolean>}
 */
skillSchema.statics.validateSlugs = async function (slugs) {
  if (!slugs || slugs.length === 0) return true;

  const count = await this.countDocuments({
    slug: { $in: slugs },
    isActive: true,
  });

  return count === slugs.length;
};

/**
 * Static method: Increment usage count for skills
 * @param {string[]} slugs - Array of skill slugs
 */
skillSchema.statics.incrementUsage = async function (slugs) {
  if (!slugs || slugs.length === 0) return;

  await this.updateMany({ slug: { $in: slugs } }, { $inc: { usageCount: 1 } });
};

/**
 * Static method: Decrement usage count for skills
 * @param {string[]} slugs - Array of skill slugs
 */
skillSchema.statics.decrementUsage = async function (slugs) {
  if (!slugs || slugs.length === 0) return;

  await this.updateMany(
    { slug: { $in: slugs }, usageCount: { $gt: 0 } },
    { $inc: { usageCount: -1 } }
  );
};

const Skill = mongoose.model("Skill", skillSchema);

module.exports = Skill;
