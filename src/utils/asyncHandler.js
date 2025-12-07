/**
 * @file src/utils/asyncHandler.js
 * @description Wrapper for async route handlers to catch errors
 * Eliminates need for try-catch in every controller
 */

/**
 * Wrap async function to handle errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
