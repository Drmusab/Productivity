/**
 * @fileoverview Input sanitization utilities for security.
 * Provides functions to sanitize and validate user input to prevent XSS and injection attacks.
 * @module utils/sanitizer
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} input - User input containing potential HTML
 * @returns {string} Sanitized string
 */
function sanitizeHTML(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const htmlEntities = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '&': '&amp;'
  };

  return input.replace(/[<>"'\/&]/g, char => htmlEntities[char]);
}

/**
 * Sanitize string for safe SQL-like queries (additional layer beyond parameterized queries)
 * @param {string} input - User input
 * @returns {string} Sanitized string
 */
function sanitizeSQL(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove SQL keywords and special characters that could be used in injection
  const dangerous = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|WHERE|OR|AND|--|;|'|")\b)/gi;
  return input.replace(dangerous, '').trim();
}

/**
 * Validate and sanitize email addresses
 * @param {string} email - Email address to validate
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize URLs to prevent javascript: and data: protocol attacks
 * @param {string} url - URL to sanitize
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript):/i;
  if (dangerousProtocols.test(trimmed)) {
    return null;
  }

  // Only allow http, https, and relative URLs
  const validProtocols = /^(https?:\/\/|\/)/i;
  if (!validProtocols.test(trimmed) && trimmed.length > 0) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize file names to prevent directory traversal attacks
 * @param {string} filename - File name to sanitize
 * @returns {string} Sanitized file name
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255); // Limit length
}

/**
 * Sanitize markdown content to allow safe formatting while preventing XSS
 * @param {string} markdown - Markdown content
 * @returns {string} Sanitized markdown
 */
function sanitizeMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Remove script tags and dangerous HTML
  let sanitized = markdown.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, ''); // Remove event handlers
  
  return sanitized;
}

/**
 * Sanitize JSON input
 * @param {*} input - Input to sanitize
 * @param {number} maxDepth - Maximum depth of nested objects (default: 10)
 * @returns {*} Sanitized object
 */
function sanitizeJSON(input, maxDepth = 10) {
  if (maxDepth === 0) {
    return null;
  }

  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === 'string') {
    return sanitizeHTML(input);
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeJSON(item, maxDepth - 1));
  }

  if (typeof input === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      const sanitizedKey = sanitizeHTML(key);
      sanitized[sanitizedKey] = sanitizeJSON(value, maxDepth - 1);
    }
    return sanitized;
  }

  return null;
}

/**
 * Validate and sanitize numeric input
 * @param {*} input - Input to validate
 * @param {Object} options - Validation options {min, max, integer}
 * @returns {number|null} Sanitized number or null if invalid
 */
function sanitizeNumber(input, options = {}) {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    return null;
  }

  if (options.integer && !Number.isInteger(num)) {
    return null;
  }

  if (options.min !== undefined && num < options.min) {
    return options.min;
  }

  if (options.max !== undefined && num > options.max) {
    return options.max;
  }

  return num;
}

/**
 * Remove null bytes from string
 * @param {string} input - Input string
 * @returns {string} String without null bytes
 */
function removeNullBytes(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input.replace(/\0/g, '');
}

module.exports = {
  sanitizeHTML,
  sanitizeSQL,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFilename,
  sanitizeMarkdown,
  sanitizeJSON,
  sanitizeNumber,
  removeNullBytes
};
