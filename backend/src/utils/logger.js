/**
 * @fileoverview Logging utility with different log levels and environment-aware filtering.
 * Provides structured logging with timestamps, log levels, and metadata support.
 * Automatically adjusts logging verbosity based on NODE_ENV.
 * @module utils/logger
 */

/**
 * Available log levels for the application.
 * @constant {Object.<string, string>}
 * @property {string} ERROR - Critical errors that need immediate attention
 * @property {string} WARN - Warning messages for potential issues
 * @property {string} INFO - Informational messages about application state
 * @property {string} DEBUG - Detailed debugging information for development
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Determines whether a log message should be output based on environment and log level.
 * In test environment: logs are suppressed unless ENABLE_TEST_LOGGING is set.
 * In production environment: only ERROR and WARN levels are logged.
 * In development environment: all log levels are logged.
 * 
 * @function shouldLog
 * @param {string} level - The log level to check (from LOG_LEVELS)
 * @returns {boolean} True if the log should be output, false otherwise
 * @private
 */
const shouldLog = (level) => {
  const env = process.env.NODE_ENV;
  
  // Don't log in test environment unless explicitly enabled
  if (env === 'test' && !process.env.ENABLE_TEST_LOGGING) {
    return false;
  }
  
  // In production, only log ERROR and WARN
  if (env === 'production') {
    return level === LOG_LEVELS.ERROR || level === LOG_LEVELS.WARN;
  }
  
  // In development, log everything
  return true;
};

/**
 * Formats a log message with timestamp, level, message, and optional metadata.
 * 
 * @function formatMessage
 * @param {string} level - The log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} message - The main log message
 * @param {Object} [meta={}] - Optional metadata object to include in the log
 * @returns {string} Formatted log message string with timestamp and metadata
 * @private
 * @example
 * formatMessage('INFO', 'User logged in', { userId: 123, username: 'demo' })
 * // Returns: "[2024-01-15T10:30:00.000Z] [INFO] User logged in {"userId":123,"username":"demo"}"
 */
const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  
  return `[${timestamp}] [${level}] ${message} ${metaString}`;
};

/**
 * Logger object with methods for different log levels.
 * All methods respect the shouldLog filter based on environment.
 * @namespace logger
 */
const logger = {
  /**
   * Logs an error message with optional metadata.
   * Always logged in production and development (but not in tests unless enabled).
   * 
   * @function error
   * @memberof logger
   * @param {string} message - Error message to log
   * @param {Object} [meta={}] - Optional metadata object with error details
   * @returns {void}
   * @example
   * logger.error('Database connection failed', { error: err.message, code: err.code });
   */
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
    }
  },
  
  /**
   * Logs a warning message with optional metadata.
   * Logged in production and development (but not in tests unless enabled).
   * 
   * @function warn
   * @memberof logger
   * @param {string} message - Warning message to log
   * @param {Object} [meta={}] - Optional metadata object with warning details
   * @returns {void}
   * @example
   * logger.warn('API rate limit approaching', { current: 95, limit: 100 });
   */
  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  },
  
  /**
   * Logs an informational message with optional metadata.
   * Only logged in development (suppressed in production and tests).
   * 
   * @function info
   * @memberof logger
   * @param {string} message - Informational message to log
   * @param {Object} [meta={}] - Optional metadata object with additional information
   * @returns {void}
   * @example
   * logger.info('Server started', { port: 3001, env: 'development' });
   */
  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  },
  
  /**
   * Logs a debug message with optional metadata.
   * Only logged in development (suppressed in production and tests).
   * Use for detailed diagnostic information.
   * 
   * @function debug
   * @memberof logger
   * @param {string} message - Debug message to log
   * @param {Object} [meta={}] - Optional metadata object with debugging details
   * @returns {void}
   * @example
   * logger.debug('Processing request', { method: 'GET', path: '/api/tasks' });
   */
  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

module.exports = logger;
