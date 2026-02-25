import { Worker } from 'bullmq';
import redisClient from '../../config/redis.js';
import { LogFactory } from '../../lib/logger.js';

/**
 * BaseWorker - Abstract base class for isolated queue workers
 * 
 * Benefits of using workers in separate processes:
 * - Heavy jobs don't block the API server
 * - Single job failure doesn't crash the API
 * - Better scalability and resource management
 * - Can be run on different machines
 */
export class BaseWorker {
  constructor(options = {}) {
    this.queueName = options.queueName;
    this.workerName = options.workerName || this.constructor.name;
    this.concurrency = options.concurrency || 1;
    this.logger = LogFactory.getLogger(this.workerName);

    if (this.constructor === BaseWorker) {
      throw new Error('BaseWorker is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Setup and start the worker
   * Override this method in subclasses to process jobs
   */
  async setupWorker() {
    this.logger.info(`Starting worker: ${this.workerName} on queue: ${this.queueName}`);

    this.worker = new Worker(
      this.queueName,
      async (job) => {
        return this.processJob(job);
      },
      {
        connection: redisClient,
        concurrency: this.concurrency,
      }
    );

    // Event handlers
    this.worker.on('completed', (job, result) => {
      this.logger.info(`✅ Job ${job.id} completed on ${this.workerName}`, {
        jobName: job.name,
        duration: job.finishedOn - job.processedOn,
      });
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`❌ Job ${job.id} failed on ${this.workerName}`, {
        error: err.message,
        jobName: job.name,
        stack: err.stack,
      });
    });

    this.worker.on('progress', (job, progress) => {
      this.logger.info(`📊 Job ${job.id} progress: ${progress}%`);
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker error: ${err.message}`, { stack: err.stack });
    });

    return this.worker;
  }

  /**
   * Must be implemented by subclasses
   * @param {BullJob} job - The job to process
   * @returns {Promise<any>} - Job result
   */
  async processJob(job) {
    throw new Error(`processJob() must be implemented in ${this.constructor.name}`);
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown() {
    this.logger.info(`Shutting down ${this.workerName}...`);
    if (this.worker) {
      await this.worker.close();
    }
  }
}

export default BaseWorker;
