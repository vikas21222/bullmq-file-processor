import express from 'express';
import { QueueMonitor } from '../workers/queueMonitor.js';
import redisClient from '../../config/redis.js';
import { LogFactory } from '../../lib/logger.js';

const logger = LogFactory.getLogger('MonitoringRouter');
const router = express.Router();

// Queue names to monitor
const QUEUE_NAMES = ['create-dump-table-queue'];

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Check Redis connection
    const redisHealth = redisClient.isReady;

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth ? 'connected' : 'disconnected',
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * GET /metrics/queue/:queueName
 * Get detailed queue metrics
 */
router.get('/metrics/queue/:queueName', async (req, res) => {
  try {
    const { queueName } = req.params;

    if (!QUEUE_NAMES.includes(queueName)) {
      return res.status(400).json({
        error: `Unknown queue: ${queueName}`,
        availableQueues: QUEUE_NAMES,
      });
    }

    const monitor = new QueueMonitor(queueName);
    const health = await monitor.getQueueHealth();
    const stats = await monitor.getJobStats();
    const activeJobs = await monitor.getActiveJobs();

    await monitor.close();

    res.json({
      queue: queueName,
      health,
      stats,
      activeJobs,
    });
  } catch (error) {
    logger.error('Failed to get queue metrics', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve queue metrics',
      message: error.message,
    });
  }
});

/**
 * GET /metrics/queues
 * Get metrics for all monitored queues
 */
router.get('/metrics/queues', async (req, res) => {
  try {
    const allMetrics = [];

    for (const queueName of QUEUE_NAMES) {
      try {
        const monitor = new QueueMonitor(queueName);
        const health = await monitor.getQueueHealth();
        allMetrics.push(health);
        await monitor.close();
      } catch (error) {
        logger.warn(`Failed to get metrics for ${queueName}`, {
          error: error.message,
        });
        allMetrics.push({
          queue: queueName,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      queueCount: allMetrics.length,
      queues: allMetrics,
    });
  } catch (error) {
    logger.error('Failed to get all queue metrics', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve queue metrics',
      message: error.message,
    });
  }
});

/**
 * GET /metrics/queue/:queueName/failed
 * Get failed jobs for a queue
 */
router.get('/metrics/queue/:queueName/failed', async (req, res) => {
  try {
    const { queueName } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (!QUEUE_NAMES.includes(queueName)) {
      return res.status(400).json({
        error: `Unknown queue: ${queueName}`,
        availableQueues: QUEUE_NAMES,
      });
    }

    const monitor = new QueueMonitor(queueName);
    const failedJobs = await monitor.getFailedJobs(limit);
    await monitor.close();

    res.json({
      queue: queueName,
      failedJobs,
      count: failedJobs.length,
    });
  } catch (error) {
    logger.error('Failed to get failed jobs', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve failed jobs',
      message: error.message,
    });
  }
});

/**
 * POST /metrics/queue/:queueName/cleanup
 * Clean up old jobs
 */
router.post('/metrics/queue/:queueName/cleanup', async (req, res) => {
  try {
    const { queueName } = req.params;

    if (!QUEUE_NAMES.includes(queueName)) {
      return res.status(400).json({
        error: `Unknown queue: ${queueName}`,
        availableQueues: QUEUE_NAMES,
      });
    }

    const monitor = new QueueMonitor(queueName);
    const result = await monitor.cleanup(req.body);
    await monitor.close();

    res.json({
      queue: queueName,
      cleaned: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to cleanup queue', { error: error.message });
    res.status(500).json({
      error: 'Failed to cleanup queue',
      message: error.message,
    });
  }
});

export default router;
