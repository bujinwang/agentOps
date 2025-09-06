/**
 * Standardized API Response Formatter
 * Ensures consistent response format across all endpoints
 */

/**
 * Standardized success response
 * @param {Object} data - The data to return
 * @param {string} message - Success message
 * @param {Object} metadata - Additional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
const successResponse = (data, message = 'Success', metadata = {}) => {
  return {
    status: 'success',
    message,
    data,
    ...metadata,
    timestamp: new Date().toISOString()
  };
};

/**
 * Standardized error response
 * @param {string} message - Error message
 * @param {string} errorCode - Specific error code
 * @param {Object} details - Additional error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted error response
 */
const errorResponse = (message, errorCode = 'ERROR', details = null, statusCode = 400) => {
  return {
    status: 'error',
    message,
    error: {
      code: errorCode,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Standardized validation error response
 * @param {Array} errors - Array of validation errors
 * @returns {Object} Formatted validation error response
 */
const validationErrorResponse = (errors) => {
  return {
    status: 'error',
    message: 'Validation failed',
    error: {
      code: 'VALIDATION_ERROR',
      details: errors,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Standardized pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} Pagination metadata
 */
const paginationMetadata = (page, limit, totalItems) => {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
      limit,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    }
  };
};

/**
 * Standardized API response wrapper
 * @param {Object} res - Express response object
 * @param {Object} data - Response data
 * @param {string} message - Response message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional metadata
 */
const sendResponse = (res, data, message = 'Success', statusCode = 200, metadata = {}) => {
  return res.status(statusCode).json(successResponse(data, message, metadata));
};

/**
 * Standardized API error wrapper
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} errorCode - Error code
 * @param {Object} details - Error details
 * @param {number} statusCode - HTTP status code
 */
const sendError = (res, message, errorCode = 'ERROR', details = null, statusCode = 400) => {
  return res.status(statusCode).json(errorResponse(message, errorCode, details, statusCode));
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginationMetadata,
  sendResponse,
  sendError
};