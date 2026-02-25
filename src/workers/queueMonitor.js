import { Queue } from 'bullmq';
import redisClient from '../../config/redis.js';
import { LogFactory } from '../../lib/logger.js';

const logger = LogFactory.getLogger('QueueMonitor');

/**
 * QueueMonitor - Monitor queue health and job metrics
 * 
 * Tracks:
 * - Active jobs
 * - Completed jobs
 * - Failed jobs
 * - Job duration
 * - Queue depth (pending jobs)
 * - Worker availability
 */
export class QueueMonitor {
  constructor(queueName) {
    this.queueName = queueName;
    this.queue = new Queue(queueName, { connection: redisClient });
    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      totalRetried: 0,
      avgDuration: 0,
      peakQueueDepth: 0,
    };
  }

  /**
   * Get current queue health status
   */
  async getQueueHealth() {
    try {
      const counts = await this.queue.getJobCounts();
      const isPaused = await this.queue.isPaused();

      const health = {
        queue: this.queueName,
        timestamp: new Date().toISOString(),
        status: isPaused ? 'paused' : 'active',
        jobCounts: {
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
          waiting: counts.waiting || 0,
          paused: counts.paused || 0,
        },
        totalPending: (counts.waiting || 0) + (counts.delayed || 0),
        health: this._calculateHealth(counts),
      };

      logger.info(`Queue health: ${this.queueName}`, health);
      return health;
    } catch (error) {
      logger.error(`Failed to get queue health for ${this.queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get job statistics
   */
  async getJobStats() {
    try {
      const completedCount = await this.queue.getCompletedCount();
      const failedCount = await this.queue.getFailedCount();
      const delayedCount = await this.queue.getDelayedCount();

      // Get recent jobs for duration analysis
      const recentCompleted = await this.queue.getCompletedJobs(0, -1);
      const avgDuration = this._calculateAvgDuration(recentCompleted);

      return {
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        averageJobDuration: avgDuration,
        metricsSnapshot: {
          ...this.metrics,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error(`Failed to get job stats for ${this.queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get failed jobs with reasons
   */
  async getFailedJobs(limit = 10) {
    try {
      const failedJobs = await this.queue.getFailed(0, limit - 1);

      return failedJobs.map((job) => ({
        id: job.id,
        name: job.name,
        failedReason: job.failedReason,
        failedAt: job.failedOn ? new Date(job.failedOn).toISOString() : null,
        attemptsMade: job.attemptsMade,
        data: job.data,
      }));
    } catch (error) {
      logger.error(`Failed to get failed jobs for ${this.queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active jobs details
   */
  async getActiveJobs() {
    try {
      const activeJobs = await this.queue.getActive();

      return activeJobs.map((job) => ({
        id: job.id,
        name: job.name,
        startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
        progress: job._progress,
        data: job.data,
      }));
    } catch (error) {
      logger.error(`Failed to get active jobs for ${this.queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Record job success
   */
  recordJobSuccess(duration) {
    this.metrics.totalProcessed++;
    this.metrics.avgDuration =
      (this.metrics.avgDuration * (this.metrics.totalProcessed - 1) + duration) /
      this.metrics.totalProcessed;
  }

  /**
   * Record job failure
   */
  recordJobFailure() {
    this.metrics.totalFailed++;
  }

  /**
   * Record job retry
   */
  recordJobRetry() {
    this.metrics.totalRetried++;
  }

  /**
   * Calculate health score (0-100)
   * @private
   */
  _calculateHealth(counts) {
    const totalJobs = (counts.active || 0) + (counts.completed || 0) + (counts.failed || 0);
    if (totalJobs === 0) return 100;

    const failureRate = (counts.failed || 0) / totalJobs;
    const waitingJobs = (counts.waiting || 0) + (counts.delayed || 0);
    const overloadFactor = Math.min(waitingJobs / 100, 1); // Scale from 0-1

    // Health = 100 - (failureRate * 50) - (overloadFactor * 20)
    const health = 100 - failureRate * 50 - overloadFactor * 20;
    return Math.max(0, Math.min(100, health));
  }

  /**
   * Calculate average job duration
   * @private
   */
  _calculateAvgDuration(jobs) {
    if (jobs.length === 0) return 0;

    const durations = jobs
      .filter((job) => job.processedOn && job.finishedOn)
      .map((job) => job.finishedOn - job.processedOn);

    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanup(options = {}) {
    try {
      const completedAge = options.completedAge || 24 * 3600 * 1000; // 24 hours
      const failedAge = options.failedAge || 48 * 3600 * 1000; // 48 hours

      const cleanedCompleted = await this.queue.clean(completedAge, 0, 'completed');
      const cleanedFailed = await this.queue.clean(failedAge, 0, 'failed');

      logger.info(`Cleaned up queue ${this.queueName}`, {
        completedRemoved: cleanedCompleted.length,
        failedRemoved: cleanedFailed.length,
      });

      return {
        completedRemoved: cleanedCompleted.length,
        failedRemoved: cleanedFailed.length,
      };
    } catch (error) {
      logger.error(`Failed to cleanup queue ${this.queueName}`, {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Close the queue connection
   */
  async close() {
    if (this.queue) {
      await this.queue.close();
    }
  }
}

export default QueueMonitor;
