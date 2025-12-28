/**
 * Authentication Service
 * 
 * Handles authentication logic for both Productivity OS and Plane
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  private productivityApiUrl: string;
  private jwtSecret: string;
  private planeSecret: string;

  constructor() {
    this.productivityApiUrl = process.env.BACKEND_URL || 'http://api-prod:3001';
    this.jwtSecret = process.env.AUTH_BRIDGE_JWT_SECRET || 'change-this-secret';
    this.planeSecret = process.env.PLANE_SECRET_KEY || 'change-this-secret';
  }

  /**
   * Authenticate user with Productivity OS backend
   */
  async authenticateProductivityOS(username: string, password: string): Promise<AuthResult> {
    try {
      const response = await axios.post(`${this.productivityApiUrl}/api/users/login`, {
        username,
        password,
      });

      if (response.data && response.data.user) {
        return {
          success: true,
          user: {
            id: response.data.user.id,
            username: response.data.user.username,
            email: response.data.user.email,
          },
        };
      }

      return {
        success: false,
        error: 'Authentication failed',
      };
    } catch (error) {
      console.error('Productivity OS authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Generate JWT token for Productivity OS
   */
  generateProductivityToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
      },
      this.jwtSecret,
      {
        expiresIn: '7d',
      }
    );
  }

  /**
   * Generate JWT token for Plane
   */
  generatePlaneToken(planeUserId: string): string {
    return jwt.sign(
      {
        user_id: planeUserId,
      },
      this.planeSecret,
      {
        expiresIn: '7d',
      }
    );
  }

  /**
   * Verify Productivity OS token
   */
  verifyProductivityToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  /**
   * Verify Plane token
   */
  verifyPlaneToken(token: string): any {
    try {
      return jwt.verify(token, this.planeSecret);
    } catch (error) {
      console.error('Plane token verification error:', error);
      return null;
    }
  }
}
