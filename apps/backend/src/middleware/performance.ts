/**
 * @fileoverview Performance monitoring middleware and utilities for tracking request timing and database queries.
 * Provides request timing, execution measurement, and slow query detection.
 * @module middleware/performance
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

type TrackedQuery = {
  query: string;
  params: unknown[];
  duration: number;
  timestamp: string;
};

/**
 * Express middleware that tracks request processing time and logs slow requests.
 * Measures time from request start to response completion and logs warnings for slow requests (>1000ms).
 * 
 * @function requestTimer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * @example
 * app.use(requestTimer); // Register globally to track all requests
 */
const requestTimer = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end function to log timing
  res.end = ((...args: Parameters<typeof res.end>) => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (> 1000ms)
    if (duration > 1000) {
      logger.warn(`Slow request detected: ${req.method} ${req.url}`, {
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    } else {
      logger.debug(`${req.method} ${req.url}`, {
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
    
    // Call original end function
    return originalEnd(...args);
  }) as typeof res.end;
  
  next();
};

/**
 * Measures and logs the execution time of an async function.
 * Useful for profiling specific operations or service calls.
 * 
 * @async
 * @function measureTime
 * @param {string} name - Descriptive name for the operation being measured
 * @param {Function} fn - Async function to execute and measure
 * @returns {Promise<*>} Promise resolving to the result of the function
 * @throws {Error} Re-throws any error from the function after logging
 * @example
 * const tasks = await measureTime('Fetch all tasks', async () => {
 *   return await database.getAllTasks();
 * });
 */
const measureTime = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.debug(`${name} completed`, { duration: `${duration}ms` });
    
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;

    logger.error(`${name} failed`, {
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
};

/**
 * Database query performance tracking class.
 * Tracks query execution times, identifies slow queries, and provides statistics.
 * Can be enabled/disabled via ENABLE_QUERY_TRACKING environment variable.
 * 
 * @class QueryPerformanceTracker
 */
class QueryPerformanceTracker {
  private readonly enabled: boolean;
  private queries: TrackedQuery[] = [];

  /**
   * Creates a QueryPerformanceTracker instance.
   * Tracking is enabled in development or when ENABLE_QUERY_TRACKING=true.
   *
   * @constructor
   */
  constructor() {
    // Make query tracking configurable via environment variable
    this.enabled = process.env.ENABLE_QUERY_TRACKING === 'true' ||
                   process.env.NODE_ENV === 'development';
  }
  
  /**
   * Records a database query execution for performance analysis.
   * Logs warnings for slow queries (>100ms) and maintains a circular buffer of recent queries.
   * 
   * @method track
   * @param {string} query - The SQL query that was executed
   * @param {Array} params - Query parameters used
   * @param {number} duration - Execution time in milliseconds
   * @returns {void}
   * @example
   * queryTracker.track('SELECT * FROM tasks WHERE id = ?', [123], 45);
   */
  track(query: string, params: unknown[], duration: number): void {
    if (!this.enabled) return;
    
    this.queries.push({
      query: query.substring(0, 100), // Truncate long queries
      params,
      duration,
      timestamp: new Date().toISOString()
    });
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      logger.warn('Slow database query detected', {
        query: query.substring(0, 200),
        duration: `${duration}ms`
      });
    }
    
    // Keep only last 100 queries (circular buffer)
    if (this.queries.length > 100) {
      this.queries.shift();
    }
  }
  
  /**
   * Calculates and returns statistical information about tracked queries.
   * Provides average, min, max durations and slow query count.
   * 
   * @method getStats
   * @returns {Object} Statistics object with query performance metrics
   * @property {number} count - Total number of tracked queries
   * @property {string} avgDuration - Average query duration with 'ms' suffix
   * @property {string} maxDuration - Maximum query duration with 'ms' suffix
   * @property {string} minDuration - Minimum query duration with 'ms' suffix
   * @property {number} slowQueries - Count of queries exceeding 100ms
   * @example
   * const stats = queryTracker.getStats();
   * console.log(`Average: ${stats.avgDuration}, Slow queries: ${stats.slowQueries}`);
   */
  getStats():
  | { message: string }
  | { count: number; avgDuration: string; maxDuration: string; minDuration: string; slowQueries: number } {
    if (!this.enabled || this.queries.length === 0) {
      return { message: 'No query data available' };
    }
    
    const durations = this.queries.map(q => q.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    return {
      count: this.queries.length,
      avgDuration: `${avg.toFixed(2)}ms`,
      maxDuration: `${max}ms`,
      minDuration: `${min}ms`,
      slowQueries: this.queries.filter(q => q.duration > 100).length
    };
  }
  
  /**
   * Clears all tracked query data.
   * Useful for resetting statistics between test runs or monitoring periods.
   * 
   * @method reset
   * @returns {void}
   * @example
   * queryTracker.reset(); // Clear all tracked queries
   */
  reset(): void {
    this.queries = [];
  }
}

/**
 * Global query performance tracker instance.
 * @constant {QueryPerformanceTracker}
 */
const queryTracker = new QueryPerformanceTracker();

export { requestTimer, measureTime, queryTracker, TrackedQuery };
