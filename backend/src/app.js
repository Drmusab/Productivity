/**
 * @fileoverview Main Express application setup and configuration.
 * Configures middleware, routes, error handling, and initializes the database.
 * Entry point for the backend server.
 * @module app
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./utils/database');
const taskRoutes = require('./routes/tasks');
const boardRoutes = require('./routes/boards');
const userRoutes = require('./routes/users');
const integrationRoutes = require('./routes/integrations');
const automationRoutes = require('./routes/automation');
const syncRoutes = require('./routes/sync');
const aiRoutes = require('./routes/ai');
const reportRoutes = require('./routes/reports');
const routineRoutes = require('./routes/routines');
const settingsRoutes = require('./routes/settings');
const habitRoutes = require('./routes/habits');
const plannerRoutes = require('./routes/planner');
const fitnessRoutes = require('./routes/fitness');
const { startScheduler } = require('./services/scheduler');
const { requestTimer } = require('./middleware/performance');
const logger = require('./utils/logger');

/** Express application instance */
const app = express();

/** Server port from environment or default to 3001 */
const PORT = process.env.PORT || 3001;

// Security middleware - adds various HTTP headers for security
app.use(helmet());

// CORS middleware - allows cross-origin requests from frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Performance monitoring middleware (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(requestTimer);
}

// Rate limiting to prevent abuse - 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware - handles JSON and URL-encoded data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files middleware - serves uploaded attachments
app.use('/attachments', express.static(path.join(__dirname, '../attachments')));

// API route registration
app.use('/api/tasks', taskRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/fitness', fitnessRoutes);

const { errorHandler } = require('./middleware/errorHandler');

/**
 * Health check endpoint for monitoring and load balancers.
 * Returns 200 OK with current timestamp.
 * @name GET /api/health
 * @function
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * 404 handler for undefined routes.
 * Returns 404 with error message.
 * @function
 */
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    statusCode: 404
  });
});

// Error handling middleware (must be registered last)
app.use(errorHandler);

// Initialize database and start server (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  initDatabase().then(() => {
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      startScheduler();
    });
  }).catch(err => {
    logger.error('Failed to initialize database', { error: err.message });
    process.exit(1);
  });
}


module.exports = app;
