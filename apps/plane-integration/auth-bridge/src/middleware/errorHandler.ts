/**
 * Error Handler Middleware
 * 
 * Centralized error handling for the Auth Bridge service
 */

import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  error: string;
  message: string;
  stack?: string;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const response: ErrorResponse = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
