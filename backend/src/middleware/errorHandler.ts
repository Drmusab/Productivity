/**
 * @fileoverview Centralized error handling middleware for the Express application.
 * Provides custom error class, error sanitization, and consistent error responses.
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger = require('../utils/logger');

/**
 * Custom application error class with additional properties for HTTP status and details.
 */
class AppError extends Error {
  statusCode: number;
  details: any;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Fields to exclude from error logs for security reasons.
 */
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization'];

/**
 * Sanitizes request body by redacting sensitive fields from logs.
 */
const sanitizeBody = (body: any): any => {
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
 */
const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
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
  const response: any = {
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
 */
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export = {
  AppError,
  errorHandler,
  asyncHandler
};
