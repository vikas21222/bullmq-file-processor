#!/usr/bin/env node

/**
 * Standalone worker process for CreateDumpTableWorker
 * 
 * Usage:
 *   node src/workers/createDumpTableWorkerProcess.js
 * 
 * Or add to package.json scripts:
 *   "worker:csv": "node src/workers/createDumpTableWorkerProcess.js"
 * 
 * Benefits:
 * - Runs in a separate Node process
 * - Can be scaled horizontally
 * - Isolated from the API server
 * - Can be deployed on different machines
 * - Restarts automatically with PM2 or systemd
 */

import CreateDumpTableWorker from './createDumpTableWorker.js';
import { LogFactory } from '../../lib/logger.js';

const logger = LogFactory.getLogger('WorkerProcess');

async function startWorker() {
  try {
    const worker = new CreateDumpTableWorker();
    await worker.setupWorker();

    logger.info('🚀 CreateDumpTableWorker started and listening for jobs...');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, gracefully shutting down...');
      await worker.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, gracefully shutting down...');
      await worker.shutdown();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start worker', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the worker
startWorker();
