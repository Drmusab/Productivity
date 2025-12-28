import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

// Import configuration
import { config, env } from './config/env';

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
import knowledgeVaultRoutes from './routes/knowledgeVault';
import iTasksRoutes from './routes/itasks';
import {  startScheduler  } from './services/scheduler';
import {  requestTimer  } from './middleware/performance';
import logger from './utils/logger';
import { initializeBlockSystem } from './services/blockSystem';
import { CollaborationServer } from './services/collaborationServer';
import { sanitizeRequest } from './middleware/sanitization';
import { rateLimiters } from './middleware/rateLimiter';
import { runStartupMigrations } from './services/versioning';

/** Express application instance */
const app: Application = express();

/** HTTP server instance for Socket.IO */
const httpServer = createServer(app);

/** Server port from environment configuration */
const PORT = config.PORT;

// Trust proxy - required for rate limiting and IP detection behind reverse proxies
app.set('trust proxy', 1);

// Compression middleware - gzip compression for responses
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6 // Compression level (0-9, higher = better compression but slower)
}));

// Enhanced security middleware - adds various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// CORS middleware - allows cross-origin requests from frontend
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
}));

// Performance monitoring middleware (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(requestTimer);
}

// General API rate limiting - 100 requests per 15 minutes per IP
app.use('/api/', rateLimiters.general);

// Body parsing middleware - handles JSON and URL-encoded data
app.use(express.json({ 
  limit: '10mb',
  strict: true, // Only accept arrays and objects
  reviver: (key, value) => {
    // Additional security: reject suspicious patterns
    if (typeof value === 'string' && value.includes('\0')) {
      throw new Error('Null bytes not allowed in JSON');
    }
    return value;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Prevent DoS via large number of parameters
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn('Sanitized potentially malicious input', { 
      path: req.path, 
      key,
      ip: req.ip 
    });
  }
}));

// Request sanitization middleware - protects against XSS
app.use(sanitizeRequest);

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
app.use('/api/vault', knowledgeVaultRoutes);
app.use('/api/itasks', iTasksRoutes);

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
  initDatabase().then(async () => {
    await runStartupMigrations();
    // Initialize block system
    initializeBlockSystem();
    
    // Initialize collaboration server
    const collaborationServer = new CollaborationServer(httpServer);
    
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`Cache enabled: ${config.ENABLE_CACHE}`);
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
    
    process.on('SIGINT', () => {
      logger.info('SIGINT signal received: closing HTTP server');
      collaborationServer.shutdown();
      httpServer.close(() => {
        logger.info('HTTP server closed gracefully');
        process.exit(0);
      });
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception occurred', {
        error: error.message,
        stack: error.stack
      });
      // Give time to flush logs before exiting
      setTimeout(() => process.exit(1), 1000);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled promise rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack
      });
    });
  }).catch(err => {
    logger.error('Failed to initialize database', { error: err.message });
    process.exit(1);
  });
}


export default app;
