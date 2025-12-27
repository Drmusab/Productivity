/**
 * @fileoverview Centralized environment configuration management with validation.
 * Provides type-safe access to environment variables with runtime validation.
 * @module config/env
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

/**
 * Environment configuration schema with defaults and validation
 */
interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  FRONTEND_URL: string;
  
  // Database
  DATABASE_PATH: string;
  DB_POOL_SIZE: number;
  
  // Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  N8N_API_KEY?: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // File Upload
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];
  
  // Features
  NOTIFICATION_ENABLED: boolean;
  BACKUP_ENABLED: boolean;
  BACKUP_INTERVAL: string;
  BACKUP_DIR: string;
  
  // Performance
  ENABLE_CACHE: boolean;
  CACHE_TTL: number;
  LOG_SLOW_QUERIES: boolean;
  SLOW_QUERY_THRESHOLD_MS: number;
  
  // Logging
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  LOG_FORMAT: 'json' | 'simple';
}

/**
 * Validates and parses environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
class EnvironmentConfig {
  private config: EnvConfig;

  constructor() {
    this.config = this.loadAndValidate();
  }

  /**
   * Load and validate all environment variables
   */
  private loadAndValidate(): EnvConfig {
    // Required variables check
    this.validateRequired();

    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: this.parseNumber('PORT', 3001),
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
      
      // Database
      DATABASE_PATH: process.env.DATABASE_PATH || path.join(__dirname, '../../data/kanban.db'),
      DB_POOL_SIZE: this.parseNumber('DB_POOL_SIZE', 5),
      
      // Security
      JWT_SECRET: process.env.JWT_SECRET || this.generateWarning('JWT_SECRET'),
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      N8N_API_KEY: process.env.N8N_API_KEY,
      RATE_LIMIT_WINDOW_MS: this.parseNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
      RATE_LIMIT_MAX_REQUESTS: this.parseNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      
      // File Upload
      UPLOAD_DIR: process.env.UPLOAD_DIR || './attachments',
      MAX_FILE_SIZE: this.parseNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
      ALLOWED_FILE_TYPES: this.parseArray('ALLOWED_FILE_TYPES', [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/markdown',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]),
      
      // Features
      NOTIFICATION_ENABLED: this.parseBoolean('NOTIFICATION_ENABLED', true),
      BACKUP_ENABLED: this.parseBoolean('BACKUP_ENABLED', true),
      BACKUP_INTERVAL: process.env.BACKUP_INTERVAL || 'daily',
      BACKUP_DIR: process.env.BACKUP_DIR || './backups',
      
      // Performance
      ENABLE_CACHE: this.parseBoolean('ENABLE_CACHE', true),
      CACHE_TTL: this.parseNumber('CACHE_TTL', 300), // 5 minutes
      LOG_SLOW_QUERIES: this.parseBoolean('LOG_SLOW_QUERIES', true),
      SLOW_QUERY_THRESHOLD_MS: this.parseNumber('SLOW_QUERY_THRESHOLD_MS', 100),
      
      // Logging
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      LOG_FORMAT: (process.env.LOG_FORMAT as any) || 'json',
    };
  }

  /**
   * Validate required environment variables
   */
  private validateRequired(): void {
    if (process.env.NODE_ENV === 'production') {
      const required = ['JWT_SECRET'];
      const missing = required.filter(key => !process.env[key]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }

      // Validate JWT_SECRET strength in production
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production');
      }
    }
  }

  /**
   * Parse number from environment variable with default fallback
   */
  private parseNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      console.warn(`Invalid number for ${key}, using default: ${defaultValue}`);
      return defaultValue;
    }
    
    return parsed;
  }

  /**
   * Parse boolean from environment variable with default fallback
   */
  private parseBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Parse array from comma-separated string
   */
  private parseArray(key: string, defaultValue: string[]): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Generate warning for missing security-critical variables
   */
  private generateWarning(key: string): string {
    const warningValue = 'INSECURE_DEFAULT_' + key;
    console.warn(`WARNING: ${key} not set. Using insecure default. This is NOT suitable for production!`);
    return warningValue;
  }

  /**
   * Get the validated configuration
   */
  public get(): EnvConfig {
    return { ...this.config };
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * Check if running in test
   */
  public isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}

// Export singleton instance
export const env = new EnvironmentConfig();
export const config = env.get();
