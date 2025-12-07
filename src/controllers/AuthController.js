/**
 * @file src/controllers/AuthController.js
 * @description Authentication endpoints
 */

const AuthService = require("../services/AuthService");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const result = await AuthService.register(req.body);

  // Set cookie (optional - for web clients)
  res.cookie("token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return ApiResponse.created(res, "Registration successful", result);
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);

  // Set cookie
  res.cookie("token", result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ApiResponse.success(res, "Login successful", result);
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  return ApiResponse.success(res, "Logout successful");
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await AuthService.getCurrentUser(req.user._id);

  return ApiResponse.success(res, "User retrieved", user);
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await AuthService.changePassword(req.user._id, currentPassword, newPassword);

  return ApiResponse.success(res, "Password changed successfully");
});

/**
 * @desc    Update avatar
 * @route   PUT /api/auth/avatar
 * @access  Private
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const { avatarUrl } = req.body;

  const user = await AuthService.updateAvatar(req.user._id, avatarUrl);

  return ApiResponse.success(res, "Avatar updated", user);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateAvatar,
};
