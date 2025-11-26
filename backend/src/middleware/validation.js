/**
 * Middleware to handle validation errors from express-validator
 */
const { validationResult } = require('express-validator');

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
