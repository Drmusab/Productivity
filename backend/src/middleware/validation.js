/**
 * @fileoverview Validation error handling middleware for express-validator.
 * Processes validation errors from express-validator and returns formatted error responses.
 * @module middleware/validation
 */

const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors from express-validator rules.
 * Checks for validation errors and returns a 400 response with formatted error details.
 * If no errors exist, passes control to the next middleware.
 * 
 * @function handleValidationErrors
 * @param {Object} req - Express request object containing validation results
 * @param {Object} res - Express response object for sending error response
 * @param {Function} next - Express next middleware function
 * @returns {void|Object} Calls next() if valid, or returns 400 JSON response with errors
 * @example
 * router.post('/tasks',
 *   body('title').notEmpty().withMessage('Title is required'),
 *   handleValidationErrors,
 *   createTask
 * );
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    
    return res.status(400).json({ 
      error: 'Validation failed',
      details: formattedErrors
    });
  }
  
  next();
};

module.exports = handleValidationErrors;
