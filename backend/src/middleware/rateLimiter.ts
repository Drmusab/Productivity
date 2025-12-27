/**
 * @fileoverview Advanced rate limiting middleware with per-endpoint and per-user limits.
 * Provides flexible rate limiting strategies for different API endpoints.
 * @module middleware/rateLimiter
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limit configuration interface
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RateLimitProfiles = {
  /**
   * Strict rate limit for authentication endpoints
   * Prevents brute force attacks
   */
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  /**
   * Moderate rate limit for write operations
   * Prevents abuse while allowing normal usage
   */
  WRITE: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many write requests, please slow down',
    skipSuccessfulRequests: false,
    skipFailedRequests: true
  },

  /**
   * Relaxed rate limit for read operations
   * Allows frequent polling and data fetching
   */
  READ: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please slow down',
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  },

  /**
   * Very strict rate limit for sensitive operations
   * Email sending, password resets, etc.
   */
  SENSITIVE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many sensitive requests, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  /**
   * Strict rate limit for webhook endpoints
   * Prevents webhook abuse
   */
  WEBHOOK: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many webhook requests, please slow down',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },

  /**
   * General API rate limit
   * Default for unspecified endpoints
   */
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later',
    skipSuccessfulRequests: true,
    skipFailedRequests: true
  }
};

/**
 * Create a rate limiter with custom configuration
 * @param config - Rate limit configuration
 * @returns Express rate limit middleware
 */
export function createRateLimiter(config: RateLimitConfig): RateLimitRequestHandler {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: config.message || 'Too many requests',
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
    // Key generator: use IP + user ID if authenticated
    keyGenerator: (req: Request): string => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userId = (req as any).user?.id;
      return userId ? `${ip}:${userId}` : ip;
    },
    // Skip rate limiting for trusted IPs in development
    skip: (req: Request): boolean => {
      if (process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1') {
        return true;
      }
      return false;
    },
    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response): void => {
      res.status(429).json({
        error: config.message || 'Too many requests',
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: res.getHeader('RateLimit-Reset')
      });
    }
  });
}

/**
 * Pre-configured rate limiters for different endpoint types
 */
export const rateLimiters = {
  auth: createRateLimiter(RateLimitProfiles.AUTH),
  write: createRateLimiter(RateLimitProfiles.WRITE),
  read: createRateLimiter(RateLimitProfiles.READ),
  sensitive: createRateLimiter(RateLimitProfiles.SENSITIVE),
  webhook: createRateLimiter(RateLimitProfiles.WEBHOOK),
  general: createRateLimiter(RateLimitProfiles.GENERAL)
};

/**
 * Dynamic rate limiter that adjusts based on user authentication
 * Authenticated users get higher limits
 */
export function createDynamicRateLimiter(
  authenticatedConfig: RateLimitConfig,
  anonymousConfig: RateLimitConfig
): (req: Request, res: Response, next: any) => void {
  const authenticatedLimiter = createRateLimiter(authenticatedConfig);
  const anonymousLimiter = createRateLimiter(anonymousConfig);

  return (req: Request, res: Response, next: any): void => {
    const isAuthenticated = !!(req as any).user;
    const limiter = isAuthenticated ? authenticatedLimiter : anonymousLimiter;
    limiter(req, res, next);
  };
}

/**
 * Sliding window rate limiter (more precise than fixed window)
 * Tracks individual request timestamps
 */
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private max: number;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be allowed
   */
  check(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    if (validTimestamps.length >= this.max) {
      return false;
    }

    // Add current request
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    return Math.max(0, this.max - validTimestamps.length);
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}
