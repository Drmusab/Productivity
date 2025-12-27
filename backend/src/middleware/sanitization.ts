/**
 * @fileoverview Request sanitization middleware for input security.
 * Sanitizes all user input to prevent XSS, SQL injection, and other attacks.
 * @module middleware/sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizeHTML, sanitizeMarkdown, removeNullBytes } from '../utils/sanitizer';

/**
 * Maximum allowed depths for nested objects/arrays
 */
const MAX_NESTING_DEPTH = 10;

/**
 * Fields that should be sanitized as HTML
 */
const HTML_FIELDS = ['title', 'name', 'label', 'subject'];

/**
 * Fields that should be sanitized as Markdown
 */
const MARKDOWN_FIELDS = ['description', 'content', 'body', 'notes'];

/**
 * Fields that should never be sanitized (IDs, tokens, etc.)
 */
const SKIP_FIELDS = ['id', 'token', 'api_key', 'password', 'password_hash', 'secret'];

/**
 * Recursively sanitize an object
 * @param obj - Object to sanitize
 * @param depth - Current nesting depth
 * @returns Sanitized object
 */
function sanitizeObject(obj: any, depth: number = 0): any {
  if (depth > MAX_NESTING_DEPTH) {
    throw new Error('Maximum nesting depth exceeded');
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return removeNullBytes(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip certain fields
      if (SKIP_FIELDS.includes(key.toLowerCase())) {
        sanitized[key] = value;
        continue;
      }

      // Sanitize key
      const sanitizedKey = sanitizeHTML(key);

      // Sanitize value based on field type
      if (typeof value === 'string') {
        if (HTML_FIELDS.includes(key.toLowerCase())) {
          sanitized[sanitizedKey] = sanitizeHTML(value);
        } else if (MARKDOWN_FIELDS.includes(key.toLowerCase())) {
          sanitized[sanitizedKey] = sanitizeMarkdown(value);
        } else {
          sanitized[sanitizedKey] = removeNullBytes(value);
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 * Protects against XSS, SQL injection, and other injection attacks
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): Response | void => {
  try {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error: any) {
    // If sanitization fails, reject the request
    return res.status(400).json({
      error: 'Invalid request data',
      message: error.message,
      statusCode: 400
    });
  }
};

/**
 * Middleware to sanitize only request body (lighter version)
 * Use for routes where query/params are already validated
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction): Response | void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (error: any) {
    return res.status(400).json({
      error: 'Invalid request body',
      message: error.message,
      statusCode: 400
    });
  }
};

/**
 * Create custom sanitization middleware with specific field configurations
 * @param htmlFields - Fields to sanitize as HTML
 * @param markdownFields - Fields to sanitize as Markdown
 * @returns Sanitization middleware
 */
export const createSanitizer = (
  htmlFields: string[] = HTML_FIELDS,
  markdownFields: string[] = MARKDOWN_FIELDS
) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    try {
      const customSanitize = (obj: any, depth: number = 0): any => {
        if (depth > MAX_NESTING_DEPTH || !obj || typeof obj !== 'object') {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(item => customSanitize(item, depth + 1));
        }

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (SKIP_FIELDS.includes(key.toLowerCase())) {
            result[key] = value;
          } else if (typeof value === 'string') {
            if (htmlFields.includes(key.toLowerCase())) {
              result[key] = sanitizeHTML(value);
            } else if (markdownFields.includes(key.toLowerCase())) {
              result[key] = sanitizeMarkdown(value);
            } else {
              result[key] = removeNullBytes(value);
            }
          } else if (typeof value === 'object' && value !== null) {
            result[key] = customSanitize(value, depth + 1);
          } else {
            result[key] = value;
          }
        }
        return result;
      };

      if (req.body) req.body = customSanitize(req.body);
      if (req.query) req.query = customSanitize(req.query);
      if (req.params) req.params = customSanitize(req.params);

      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Invalid request data',
        message: error.message,
        statusCode: 400
      });
    }
  };
};
