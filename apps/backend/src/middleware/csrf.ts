/**
 * @fileoverview CSRF (Cross-Site Request Forgery) protection middleware.
 * Implements double-submit cookie pattern for stateless CSRF protection.
 * @module middleware/csrf
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthenticationError } from './errorHandler';

/**
 * Generate a random CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Safe methods that don't require CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Paths that should be excluded from CSRF protection
 * (e.g., webhook endpoints, public APIs)
 */
const EXCLUDED_PATHS = [
  '/api/webhooks',
  '/api/integrations/test-n8n-webhook',
  '/api/health',
  '/api-docs'
];

/**
 * CSRF protection middleware using double-submit cookie pattern
 * 
 * For state-changing requests (POST, PUT, DELETE, PATCH):
 * 1. Client must include CSRF token in request header: X-CSRF-Token
 * 2. Token must match the one stored in cookie: csrf-token
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Skip CSRF for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    // Generate and set CSRF token for safe requests so it's available for subsequent requests
    if (!req.cookies?.['csrf-token']) {
      const token = generateCsrfToken();
      res.cookie('csrf-token', token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      res.setHeader('X-CSRF-Token', token);
    }
    return next();
  }

  // Skip CSRF for excluded paths (webhooks, etc.)
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip CSRF if using API key authentication
  if (req.headers['x-api-key'] || req.query.api_key) {
    return next();
  }

  // Get token from header
  const headerToken = req.headers['x-csrf-token'] as string;
  const cookieToken = req.cookies?.['csrf-token'];

  // Verify token exists
  if (!headerToken || !cookieToken) {
    return next(new AuthenticationError('CSRF token missing'));
  }

  // Verify tokens match (constant-time comparison to prevent timing attacks)
  if (!crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(cookieToken))) {
    return next(new AuthenticationError('CSRF token mismatch'));
  }

  next();
};

/**
 * Middleware to generate and attach CSRF token to response
 * Use this for routes that need to provide a CSRF token
 */
export const provideCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = generateCsrfToken();
  
  res.cookie('csrf-token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });

  // Also include in response body for easy access
  (req as any).csrfToken = token;
  
  next();
};

/**
 * Helper to get CSRF token from request
 */
export const getCsrfToken = (req: Request): string | undefined => {
  return (req as any).csrfToken || req.cookies?.['csrf-token'];
};
