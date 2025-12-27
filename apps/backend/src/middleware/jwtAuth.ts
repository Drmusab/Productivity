/**
 * @fileoverview JWT authentication middleware for securing user-authenticated endpoints.
 * Implements JWT token verification with Bearer scheme support.
 * @module middleware/jwtAuth
 */

import jwt from 'jsonwebtoken';

/**
 * JWT secret from environment variables with a fallback for development.
 * @constant {string}
 * @private
 */
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

/**
 * Middleware enforcing JWT token authentication for protected endpoints.
 * Extracts the Bearer token from the Authorization header and verifies it.
 * Sets `req.user` with the decoded token payload on successful verification.
 * 
 * @function authenticateToken
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Object} Calls next() if authenticated, or returns 401 JSON response
 * @example
 * router.get('/protected', authenticateToken, (req, res) => {
 *   res.json({ userId: req.user.id });
 * });
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (!token || scheme?.toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Authorization token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional JWT authentication middleware.
 * If a valid token is present, sets req.user. Otherwise, continues without error.
 * Useful for endpoints that have different behavior for authenticated vs anonymous users.
 * 
 * @function optionalAuth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void} Always calls next()
 * @example
 * router.get('/public', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     res.json({ message: `Hello, ${req.user.username}!` });
 *   } else {
 *     res.json({ message: 'Hello, guest!' });
 *   }
 * });
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (token && scheme?.toLowerCase() === 'bearer') {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token is invalid, but we continue without setting req.user
    }
  }

  next();
};

export { authenticateToken };
export { optionalAuth };
