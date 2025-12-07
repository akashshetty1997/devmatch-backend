/**
 * @file src/utils/helpers.js
 * @description Utility helper functions used across the application
 */

const { PAGINATION } = require("../config/constants");

/**
 * Parse pagination parameters from query string
 * @param {object} query - Express query object
 * @returns {object} Pagination options { page, limit, skip }
 */
const parsePagination = (query) => {
  let page = parseInt(query.page, 10) || PAGINATION.DEFAULT_PAGE;
  let limit = parseInt(query.limit, 10) || PAGINATION.DEFAULT_LIMIT;

  // Ensure positive values
  page = Math.max(1, page);
  limit = Math.min(Math.max(1, limit), PAGINATION.MAX_LIMIT);

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata for response
 * @param {number} total - Total number of documents
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Remove undefined/null fields from object
 * @param {object} obj - Object to clean
 * @returns {object} Cleaned object
 */
const cleanObject = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)
  );
};

/**
 * Pick specific fields from object
 * @param {object} obj - Source object
 * @param {string[]} keys - Keys to pick
 * @returns {object} New object with only specified keys
 */
const pick = (obj, keys) => {
  return keys.reduce((acc, key) => {
    if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
  cleanObject,
  pick,
};
