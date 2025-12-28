/**
 * Session Service
 * 
 * Manages user sessions in Redis for cross-service authentication
 */

import Redis from 'ioredis';

interface SessionData {
  userId: string;
  planeUserId: string;
  productivityToken: string;
  planeToken: string;
  createdAt?: string;
}

export class SessionService {
  private redis: Redis;
  private sessionTTL: number = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'productivity-redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });
  }

  /**
   * Create a new session
   */
  async createSession(data: SessionData): Promise<void> {
    const sessionKey = `session:${data.userId}`;
    const sessionData = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    try {
      await this.redis.setex(
        sessionKey,
        this.sessionTTL,
        JSON.stringify(sessionData)
      );
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(userId: string): Promise<SessionData | null> {
    const sessionKey = `session:${userId}`;

    try {
      const data = await this.redis.get(sessionKey);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;

    try {
      await this.redis.del(sessionKey);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Refresh session TTL
   */
  async refreshSession(userId: string): Promise<void> {
    const sessionKey = `session:${userId}`;

    try {
      const exists = await this.redis.exists(sessionKey);
      if (exists) {
        await this.redis.expire(sessionKey, this.sessionTTL);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(userId: string): Promise<boolean> {
    const sessionKey = `session:${userId}`;

    try {
      const exists = await this.redis.exists(sessionKey);
      return exists === 1;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }
}
