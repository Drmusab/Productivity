/**
 * @fileoverview Main Express application setup and configuration.
 * Configures middleware, routes, error handling, and initializes the database.
 * Entry point for the backend server.
 * @module app
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

import swaggerSpec from './config/swagger';

import {  initDatabase  } from './utils/database';
import taskRoutes from './routes/tasks';
import boardRoutes from './routes/boards';
import userRoutes from './routes/users';
import integrationRoutes from './routes/integrations';
import automationRoutes from './routes/automation';
import syncRoutes from './routes/sync';
import aiRoutes from './routes/ai';
import reportRoutes from './routes/reports';
import routineRoutes from './routes/routines';
import settingsRoutes from './routes/settings';
import habitRoutes from './routes/habits';
import plannerRoutes from './routes/planner';
import fitnessRoutes from './routes/fitness';
import islamicRoutes from './routes/islamic';
import omniplannerRoutes from './routes/omniplanner';
import chronosRoutes from './routes/chronos';
import calendarRoutes from './routes/calendar';
import databaseRoutes from './routes/database';
import thoughtsRoutes from './routes/thoughts';
import notesRoutes from './routes/notes';
import obsidianNotesRoutes from './routes/obsidianNotes';
import ideasRoutes from './routes/ideas';
import writingRoutes from './routes/writing';
import utilitiesRoutes from './routes/utilities';
import aiNotesRoutes from './routes/aiNotes';
import {  startScheduler  } from './services/scheduler';
import {  requestTimer  } from './middleware/performance';
import logger from './utils/logger';
import { initializeBlockSystem } from './services/blockSystem';
import { CollaborationServer } from './services/collaborationServer';

/** Express application instance */
const app: Application = express();

/** HTTP server instance for Socket.IO */
const httpServer = createServer(app);

/** Server port from environment or default to 3001 */
const PORT = process.env.PORT || 3001;

// Compression middleware - gzip compression for responses
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Security middleware - adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({
  replaceWith: '_'
}));

// Static files middleware - serves uploaded attachments
app.use('/attachments', express.static(path.join(__dirname, '../attachments')));

// API Documentation with Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Kanban API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

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
app.use('/api/islamic', islamicRoutes);
app.use('/api/omniplanner', omniplannerRoutes);
app.use('/api/chronos', chronosRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/thoughts', thoughtsRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/obsidian-notes', obsidianNotesRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/writing', writingRoutes);
app.use('/api/utilities', utilitiesRoutes);
app.use('/api/ai-notes', aiNotesRoutes);

import {  errorHandler  } from './middleware/errorHandler';

/**
 * Health check endpoint for monitoring and load balancers.
 * Returns 200 OK with current timestamp.
 * @name GET /api/health
 * @function
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * 404 handler for undefined routes.
 * Returns 404 with error message.
 * @function
 */
app.use((req: Request, res: Response, next: NextFunction) => {
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
    // Initialize block system
    initializeBlockSystem();
    
    // Initialize collaboration server
    const collaborationServer = new CollaborationServer(httpServer);
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Collaboration server ready for WebSocket connections`);
      startScheduler();
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      collaborationServer.shutdown();
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  }).catch(err => {
    logger.error('Failed to initialize database', { error: err.message });
    process.exit(1);
  });
}


export default app;
