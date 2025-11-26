/**
 * Performance monitoring middleware and utilities
 */

const logger = require('../utils/logger');

/**
 * Request timing middleware
 */
const requestTimer = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log timing
  res.end = function(...args) {
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
    originalEnd.apply(res, args);
  };
  
  next();
};

/**
 * Measure execution time of a function
 */
const measureTime = async (name, fn) => {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.debug(`${name} completed`, { duration: `${duration}ms` });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error(`${name} failed`, { 
      duration: `${duration}ms`,
      error: error.message 
    });
    
    throw error;
  }
};

/**
 * Database query performance tracker
 */
class QueryPerformanceTracker {
  constructor() {
    this.queries = [];
    // Make query tracking configurable via environment variable
    this.enabled = process.env.ENABLE_QUERY_TRACKING === 'true' || 
                   process.env.NODE_ENV === 'development';
  }
  
  track(query, params, duration) {
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
    
    // Keep only last 100 queries
    if (this.queries.length > 100) {
      this.queries.shift();
    }
  }
  
  getStats() {
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
  
  reset() {
    this.queries = [];
  }
}

const queryTracker = new QueryPerformanceTracker();

module.exports = {
  requestTimer,
  measureTime,
  queryTracker
};
