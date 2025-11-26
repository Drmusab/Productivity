/**
 * Logging utility with different log levels
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

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

const formatMessage = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaString = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  
  return `[${timestamp}] [${level}] ${message} ${metaString}`;
};

const logger = {
  error: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(formatMessage(LOG_LEVELS.ERROR, message, meta));
    }
  },
  
  warn: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(formatMessage(LOG_LEVELS.WARN, message, meta));
    }
  },
  
  info: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(formatMessage(LOG_LEVELS.INFO, message, meta));
    }
  },
  
  debug: (message, meta = {}) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(formatMessage(LOG_LEVELS.DEBUG, message, meta));
    }
  }
};

module.exports = logger;
