/**
 * @file src/routes/auth.routes.js
 * @description Authentication routes
 */

const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateAvatar,
} = require("../controllers/AuthController");
const { protect } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter.middleware");
const {
  validateRegister,
  validateLogin,
  validatePasswordChange,
} = require("../validators");

// Public routes
router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);

// Protected routes - MUST have 'protect' middleware
router.post("/logout", protect, logout);
router.get("/me", protect, getMe); // <-- 'protect' should be here!
router.put("/password", protect, validatePasswordChange, changePassword);
router.put("/avatar", protect, updateAvatar);

module.exports = router;
