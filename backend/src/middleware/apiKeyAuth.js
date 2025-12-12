/**
 * @fileoverview API key authentication middleware for securing webhook and automation endpoints.
 * Implements multiple extraction methods and constant-time comparison for security.
 * @module middleware/apiKeyAuth
 */

const crypto = require('crypto');

/**
 * Middleware enforcing API key authentication for automation/webhook endpoints.
 * If N8N_API_KEY environment variable is not defined, the middleware is a no-op,
 * allowing the API to be used during development without extra configuration.
 * 
 * Supports API key extraction from:
 * - x-api-key header
 * - Authorization: Bearer <token> header
 * - api_key query parameter
 * 
 * @function apiKeyAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Object} Calls next() if authenticated, or returns 401 JSON response
 * @example
 * app.use('/api/webhooks', apiKeyAuth, webhookRoutes);
 */
module.exports = function apiKeyAuth(req, res, next) {
  const expected = process.env.N8N_API_KEY;

  // Skip authentication if API key is not configured (development mode)
  if (!expected) {
    return next();
  }

  const provided = extractApiKey(req);

  if (!provided) {
    return res.status(401).json({ error: 'API key is required' });
  }

  // Use constant-time comparison to avoid timing attacks when the app is exposed
  // beyond localhost (e.g. via a tunnel).
  const valid = safeCompare(provided, expected);

  if (!valid) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  return next();
};

/**
 * Extracts the API key from multiple possible sources in the request.
 * Checks in order: x-api-key header, Authorization header, query parameter.
 * 
 * @function extractApiKey
 * @param {Object} req - Express request object
 * @returns {string|null} The extracted API key or null if not found
 * @private
 * @example
 * const apiKey = extractApiKey(req); // Returns 'my-secret-key' or null
 */
function extractApiKey(req) {
  // Check x-api-key header
  if (req.headers['x-api-key']) {
    return req.headers['x-api-key'];
  }

  // Check Authorization: Bearer <token> header
  if (req.headers.authorization) {
    const [scheme, token] = req.headers.authorization.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token) {
      return token;
    }
  }

  // Check query parameter
  if (req.query.api_key) {
    return req.query.api_key;
  }

  return null;
}

/**
 * Performs constant-time comparison of two strings to prevent timing attacks.
 * Uses crypto.timingSafeEqual which ensures comparison time is independent of input values.
 * 
 * @function safeCompare
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} True if strings are equal, false otherwise
 * @private
 * @example
 * safeCompare('secret123', 'secret123'); // Returns true
 * safeCompare('secret123', 'wrong'); // Returns false
 */
function safeCompare(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  // Quick length check before constant-time comparison
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}
