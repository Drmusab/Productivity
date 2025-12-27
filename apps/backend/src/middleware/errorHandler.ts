/**
 * @fileoverview Centralized error handling middleware for the Express application.
 * Provides custom error classes, error sanitization, and consistent error responses.
 * @module middleware/errorHandler
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '../utils/logger';

/**
 * Base custom application error class with additional properties for HTTP status and details.
 */
class AppError extends Error {
  statusCode: number;
  details: any;
  isOperational: boolean;
  code?: string;

  constructor(message: string, statusCode: number = 500, details: any = null, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for input validation failures
 */
class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details: any = null) {
    super(message, 400, details, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error for failed authentication
 */
class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, null, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error for insufficient permissions
 */
class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, null, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error for missing resources
 */
class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, null, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error for duplicate or conflicting data
 */
class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, null, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

/**
 * Database error for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details: any = null) {
    super(message, 500, details, 'DATABASE_ERROR');
    this.name = 'DatabaseError';
  }
}

/**
 * Rate limit error for too many requests
 */
class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, null, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

/**
 * Fields to exclude from error logs for security reasons.
 */
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization', 'password_hash', 'jwt', 'bearer'];

/**
 * Sanitizes request body by redacting sensitive fields from logs.
 * Uses deep traversal to catch nested sensitive data.
 */
const sanitizeBody = (body: any, depth: number = 0): any => {
  if (depth > 5 || !body || typeof body !== 'object') {
    return body;
  }
  
  if (Array.isArray(body)) {
    return body.map(item => sanitizeBody(item, depth + 1));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Generate unique correlation ID for request tracking
 */
const generateCorrelationId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Express error handling middleware that processes all errors in the application.
 * Provides comprehensive error logging, sanitization, and consistent responses.
 */
const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): void => {
  // Generate correlation ID for tracking
  const correlationId = generateCorrelationId();
  
  // Set defaults
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;
  let code = err.code || 'INTERNAL_SERVER_ERROR';

  // Log error for debugging (skip in test environment)
  if (process.env.NODE_ENV !== 'test') {
    const logLevel = statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]('Request error occurred', {
      correlationId,
      message: err.message,
      statusCode,
      code,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      body: sanitizeBody(req.body),
      isOperational: err.isOperational || false
    });
  }

  // Handle specific error types with custom status codes and messages
  if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    statusCode = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    message = 'Database constraint violation';
    code = 'CONSTRAINT_VIOLATION';
    details = 'The operation conflicts with existing data';
  } else if (err.code === 'SQLITE_ERROR') {
    statusCode = 500;
    message = 'Database error occurred';
    code = 'DATABASE_ERROR';
    details = process.env.NODE_ENV === 'development' ? err.message : 'Internal database error';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    code = 'SERVICE_UNAVAILABLE';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
    code = 'FILE_TOO_LARGE';
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
    code = 'INVALID_FILE_FIELD';
  }

  // Build response object
  const response: any = {
    error: message,
    statusCode,
    code,
    correlationId
  };

  if (details) {
    response.details = details;
  }

  // Include stack trace in development for easier debugging
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack.split('\n').map((line: string) => line.trim());
  }

  // Add timestamp
  response.timestamp = new Date().toISOString();

  // Security: Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500 && !err.isOperational) {
    response.error = 'Internal server error';
    delete response.details;
  }

  res.status(statusCode).json(response);
};

/**
 * Wrapper for async route handlers to catch promise rejections.
 * Ensures all async errors are properly caught and passed to error handler.
 */
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Helper to create error responses with consistent format
 */
const createErrorResponse = (
  statusCode: number,
  message: string,
  details?: any,
  code?: string
) => {
  return new AppError(message, statusCode, details, code);
};

export { 
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  createErrorResponse
};
