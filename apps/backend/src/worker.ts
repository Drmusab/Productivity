/**
 * @fileoverview Background Worker for Productivity OS
 * 
 * This worker handles background tasks such as:
 * - Vault indexing
 * - Link resolution
 * - Full-text search indexing
 * - Scheduled backups
 * - Graph computation
 * 
 * Run separately or as part of Docker compose with worker profile.
 */

import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';

const WORKER_MODE = process.env.WORKER_MODE === 'true';
const CHECK_INTERVAL = parseInt(process.env.WORKER_INTERVAL || '60000', 10);

interface WorkerTask {
  id: string;
  type: string;
  data: Record<string, unknown>;
  priority: number;
  createdAt: Date;
}

const taskQueue: WorkerTask[] = [];

/**
 * Process vault indexing tasks
 */
async function processIndexingTask(task: WorkerTask): Promise<void> {
  logger.info('Processing indexing task', { taskId: task.id });
  // Indexing logic would go here
  // - Re-parse all notes for links
  // - Update note_links table
  // - Update full-text search index
}

/**
 * Process backup tasks
 */
async function processBackupTask(task: WorkerTask): Promise<void> {
  logger.info('Processing backup task', { taskId: task.id });
  // Backup logic would go here
  // - Call backup script
  // - Clean up old backups
}

/**
 * Process graph computation tasks
 */
async function processGraphTask(task: WorkerTask): Promise<void> {
  logger.info('Processing graph task', { taskId: task.id });
  // Graph computation logic would go here
  // - Compute orphan notes
  // - Compute hub notes
  // - Cache graph statistics
}

/**
 * Process a single task from the queue
 */
async function processTask(task: WorkerTask): Promise<void> {
  try {
    switch (task.type) {
      case 'indexing':
        await processIndexingTask(task);
        break;
      case 'backup':
        await processBackupTask(task);
        break;
      case 'graph':
        await processGraphTask(task);
        break;
      default:
        logger.warn('Unknown task type', { type: task.type });
    }
    logger.info('Task completed', { taskId: task.id, type: task.type });
  } catch (error: any) {
    logger.error('Task failed', { 
      taskId: task.id, 
      type: task.type, 
      error: error.message 
    });
  }
}

/**
 * Main worker loop
 */
async function workerLoop(): Promise<void> {
  logger.info('Worker loop tick', { queueLength: taskQueue.length });
  
  // Process all pending tasks
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) {
      await processTask(task);
    }
  }
  
  // Schedule next tick
  setTimeout(workerLoop, CHECK_INTERVAL);
}

/**
 * Add a task to the queue
 */
export function enqueueTask(type: string, data: Record<string, unknown> = {}, priority: number = 0): string {
  const task: WorkerTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data,
    priority,
    createdAt: new Date(),
  };
  
  taskQueue.push(task);
  taskQueue.sort((a, b) => b.priority - a.priority);
  
  logger.info('Task enqueued', { taskId: task.id, type });
  return task.id;
}

/**
 * Initialize and start the worker
 */
async function startWorker(): Promise<void> {
  logger.info('Starting Productivity OS Worker');
  logger.info(`Check interval: ${CHECK_INTERVAL}ms`);
  
  // Start the worker loop
  workerLoop();
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down worker...');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down worker...');
    process.exit(0);
  });
}

// Start worker if running directly
if (WORKER_MODE || require.main === module) {
  startWorker().catch((error) => {
    logger.error('Worker startup failed', { error: error.message });
    process.exit(1);
  });
}

export { startWorker };
