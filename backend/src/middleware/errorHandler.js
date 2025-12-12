/**
 * @fileoverview Centralized error handling middleware for the Express application.
 * Provides custom error class, error sanitization, and consistent error responses.
 * @module middleware/errorHandler
 */

const logger = require('../utils/logger');

/**
 * Custom application error class with additional properties for HTTP status and details.
 * All operational errors should use this class for consistent error handling.
 * 
 * @class AppError
 * @extends Error
 * @property {number} statusCode - HTTP status code for the error (default: 500)
 * @property {*} details - Additional error details (can be string, object, or array)
 * @property {boolean} isOperational - Flag indicating this is an expected operational error
 * @example
 * throw new AppError('Task not found', 404);
 * throw new AppError('Validation failed', 400, { field: 'title', message: 'Required' });
 */
class AppError extends Error {
  /**
   * Creates an AppError instance.
   * 
   * @constructor
   * @param {string} message - Human-readable error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {*} [details=null] - Additional error details or context
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Fields to exclude from error logs for security reasons.
 * These fields will be replaced with '[REDACTED]' in log output.
 * @constant {string[]}
 * @private
 */
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization'];

/**
 * Sanitizes request body by redacting sensitive fields from logs.
 * Creates a shallow copy and replaces sensitive field values with '[REDACTED]'.
 * 
 * @function sanitizeBody
 * @param {Object} body - Request body object to sanitize
 * @returns {Object} Sanitized copy of the body with sensitive fields redacted
 * @private
 * @example
 * const clean = sanitizeBody({ username: 'admin', password: 'secret' });
 * // Returns: { username: 'admin', password: '[REDACTED]' }
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  SENSITIVE_FIELDS.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Express error handling middleware that processes all errors in the application.
 * Handles different error types (validation, authentication, database) and returns
 * appropriate HTTP responses. Logs all errors with sanitized request details.
 * 
 * @function errorHandler
 * @param {Error} err - Error object from Express or custom AppError
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (unused)
 * @returns {Object} JSON response with error details
 * @example
 * app.use(errorHandler); // Register as last middleware
 */
const errorHandler = (err, req, res, next) => {
  // Set defaults
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error for debugging (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    logger.error('Request error occurred', {
      message: err.message,
      statusCode,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: sanitizeBody(req.body)
    });
  }

  // Handle specific error types with custom status codes and messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'Database constraint violation';
    details = 'The operation conflicts with existing data';
  } else if (err.code === 'SQLITE_ERROR') {
    statusCode = 500;
    message = 'Database error occurred';
    details = process.env.NODE_ENV === 'development' ? err.message : 'Internal database error';
  }

  // Build response object
  const response = {
    error: message,
    statusCode
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development for easier debugging
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Wrapper for async route handlers to catch promise rejections.
 * Eliminates the need for try-catch blocks in every async route handler.
 * 
 * @function asyncHandler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function that catches errors
 * @example
 * router.get('/tasks', asyncHandler(async (req, res) => {
 *   const tasks = await getTasks();
 *   res.json(tasks);
 * }));
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  asyncHandler
};
