/**
 * @file src/utils/ApiResponse.js
 * @description Standardized API response structure
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Create a standardized API response
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Response message
   * @param {any} data - Response data
   */
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  /**
   * Send response to client
   * @param {Response} res - Express response object
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  // Static factory methods for common responses
  static success(res, message = "Success", data = null) {
    return new ApiResponse(200, message, data).send(res);
  }

  static created(res, message = "Created successfully", data = null) {
    return new ApiResponse(201, message, data).send(res);
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
