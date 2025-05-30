import { LogFactory } from '../../lib/logger.js';
import { Worker } from 'bullmq';
import redisClient from '../../config/redis.js';

class BullmqBaseProcessor {
  constructor(options) {
    if (this.constructor == BullmqBaseProcessor) {
      throw new Error('Abstract classes can\'t be instantiated.');
    }

    this.worker = null;
    this.queueName = options.queueName;
    this.logger = LogFactory.getLogger(`BullmqBaseProcessor:${this.queueName}`);
    const defaultWorkerOptions = {
      autorun: true,
      connection: redisClient,
      concurrency: 1,
    };
    const specificWorkerOption = options.workerOptions || {};
    this.WORKER_OPTIONS = { ...defaultWorkerOptions, ...specificWorkerOption };
  }

  async _jobHandler(job) {
    throw new Error('Implement in child class');
  }

  setupWorker() {
    this.worker = new Worker(
      this.queueName,
      this._jobHandler,
      this.WORKER_OPTIONS,
    );

    this.worker.on('active', this._onActive.bind(this));
    this.worker.on('completed', this._onCompleted.bind(this));
    this.worker.on('error', this._onError.bind(this));
    this.worker.on('failed', this._onFailed.bind(this));
  }

  async _onFailed(job, error) {
    this.logger.error(`Failed job with id ${job.id}`, error);
  }

  async _onCompleted(job, returnValue) {
    this.logger.info(`Completed job with id ${job.id}`, { returnValue });
  }

  async _onActive(job) {
    this.logger.info(`Processing job with id ${job.id}`);
  }

  async _onError(failedReason) {
    this.logger.error('Job encountered an error', { failedReason });
  }

  addEventListener(event, handler) {
    this.worker.addListener(event, handler);
  }
}

export default BullmqBaseProcessor;

