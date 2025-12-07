/**
 * @file src/models/Follow.js
 * @description Follow relationship model - User follows User
 * Many-to-Many via join collection (better than embedded arrays for scalability)
 *
 * MongoDB Best Practices:
 * - ObjectId refs with indexes for fast lookups
 * - Compound unique index prevents duplicate follows
 * - Separate indexes for both directions (who I follow / who follows me)
 */

const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    // The user who is following
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Follower is required"],
      index: true, // Fast lookup: "who am I following?"
    },

    // The user being followed
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Following user is required"],
      index: true, // Fast lookup: "who follows me?"
    },
  },
  {
    timestamps: true, // createdAt = when followed
  }
);

// ==================== INDEXES ====================

// Compound unique index - prevents duplicate follow relationships
followSchema.index({ follower: 1, following: 1 }, { unique: true });

// Compound index for efficient "get followers" query with sort
followSchema.index({ following: 1, createdAt: -1 });

// Compound index for efficient "get following" query with sort
followSchema.index({ follower: 1, createdAt: -1 });

// ==================== HOOKS ====================

/**
 * Pre-save: Prevent self-follow
 */
followSchema.pre("save", function (next) {
  if (this.follower.equals(this.following)) {
    const error = new Error("Users cannot follow themselves");
    error.statusCode = 400;
    return next(error);
  }
  next();
});

// ==================== STATICS ====================

/**
 * Check if user A follows user B
 * @param {ObjectId} followerId
 * @param {ObjectId} followingId
 * @returns {Promise<boolean>}
 */
followSchema.statics.isFollowing = async function (followerId, followingId) {
  const follow = await this.findOne({
    follower: followerId,
    following: followingId,
  });
  return !!follow;
};

/**
 * Create follow relationship (idempotent)
 * @param {ObjectId} followerId
 * @param {ObjectId} followingId
 * @returns {Promise<Follow>}
 */
followSchema.statics.follow = async function (followerId, followingId) {
  try {
    const follow = await this.create({
      follower: followerId,
      following: followingId,
    });
    return { follow, created: true };
  } catch (error) {
    // Duplicate key error means already following
    if (error.code === 11000) {
      const existing = await this.findOne({
        follower: followerId,
        following: followingId,
      });
      return { follow: existing, created: false };
    }
    throw error;
  }
};

/**
 * Remove follow relationship
 * @param {ObjectId} followerId
 * @param {ObjectId} followingId
 * @returns {Promise<boolean>} true if deleted, false if didn't exist
 */
followSchema.statics.unfollow = async function (followerId, followingId) {
  const result = await this.deleteOne({
    follower: followerId,
    following: followingId,
  });
  return result.deletedCount > 0;
};

/**
 * Get followers of a user (paginated)
 * @param {ObjectId} userId
 * @param {Object} options - { skip, limit }
 */
followSchema.statics.getFollowers = function (userId, options = {}) {
  return this.find({ following: userId })
    .populate("follower", "username avatar role")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get users that a user follows (paginated)
 * @param {ObjectId} userId
 * @param {Object} options - { skip, limit }
 */
followSchema.statics.getFollowing = function (userId, options = {}) {
  return this.find({ follower: userId })
    .populate("following", "username avatar role")
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 20);
};

/**
 * Get follower/following counts
 * @param {ObjectId} userId
 * @returns {Promise<{ followers: number, following: number }>}
 */
followSchema.statics.getCounts = async function (userId) {
  const [followers, following] = await Promise.all([
    this.countDocuments({ following: userId }),
    this.countDocuments({ follower: userId }),
  ]);
  return { followers, following };
};

/**
 * Get IDs of users that userId follows (for feed filtering)
 * @param {ObjectId} userId
 * @returns {Promise<ObjectId[]>}
 */
followSchema.statics.getFollowingIds = async function (userId) {
  const follows = await this.find({ follower: userId })
    .select("following")
    .lean();
  return follows.map((f) => f.following);
};

const Follow = mongoose.model("Follow", followSchema);

module.exports = Follow;
