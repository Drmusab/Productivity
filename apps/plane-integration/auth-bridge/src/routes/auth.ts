/**
 * Auth Routes
 * 
 * Handles authentication endpoints for unified SSO
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { UserMappingService } from '../services/userMappingService';
import { SessionService } from '../services/sessionService';

const router = Router();
const authService = new AuthService();
const userMappingService = new UserMappingService();
const sessionService = new SessionService();

/**
 * POST /auth/login
 * Unified login creating sessions for both Productivity OS and Plane
 */
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Authenticate with Productivity OS
      const productivityAuth = await authService.authenticateProductivityOS(username, password);
      if (!productivityAuth.success) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get or create Plane user mapping
      const planeMapping = await userMappingService.getOrCreatePlaneUser(
        productivityAuth.user.id,
        username,
        productivityAuth.user.email
      );

      // Generate tokens
      const productivityToken = authService.generateProductivityToken(productivityAuth.user);
      const planeToken = authService.generatePlaneToken(planeMapping.plane_user_id);

      // Create session in Redis
      await sessionService.createSession({
        userId: productivityAuth.user.id,
        planeUserId: planeMapping.plane_user_id,
        productivityToken,
        planeToken,
      });

      res.status(200).json({
        success: true,
        user: {
          id: productivityAuth.user.id,
          username: productivityAuth.user.username,
          email: productivityAuth.user.email,
        },
        tokens: {
          productivity: productivityToken,
          plane: planeToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/plane/exchange
 * Exchange Productivity OS token for Plane API token
 */
router.post(
  '/plane/exchange',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Validate Productivity OS token
      const decoded = authService.verifyProductivityToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get Plane user mapping
      const mapping = await userMappingService.getMapping(decoded.userId);
      if (!mapping) {
        return res.status(404).json({ error: 'User mapping not found' });
      }

      // Generate Plane token
      const planeToken = authService.generatePlaneToken(mapping.plane_user_id);

      res.status(200).json({
        success: true,
        planeToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /auth/validate
 * Validate session for middleware use
 */
router.get(
  '/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided', valid: false });
      }

      // Validate token
      const decoded = authService.verifyProductivityToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token', valid: false });
      }

      // Check session in Redis
      const session = await sessionService.getSession(decoded.userId);
      if (!session) {
        return res.status(401).json({ error: 'Session expired', valid: false });
      }

      res.status(200).json({
        valid: true,
        userId: decoded.userId,
        session,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/logout
 * Unified logout clearing both sessions
 */
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = authService.verifyProductivityToken(token);
      if (decoded) {
        await sessionService.deleteSession(decoded.userId);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
