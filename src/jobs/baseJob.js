import { Queue } from 'bullmq';
import redisClient from '../../config/redis.js';
import { LogFactory } from '../../lib/logger.js';

class BaseJob {
  constructor(options) {
    this.queueName = options.queueName;
    this.logger = LogFactory.getLogger(this.constructor.name);
    const defaultJobOptions={
      backoff: {
        type: 'exponential',
        delay: 5000,
        maxDelay: 30000
      },
      removeOnComplete: true,
      removeOnFail: {
        age: 2 * 24 * 3600,
      },
    };
    const specificJobOption=options.jobOptions;
    this.JOB_OPTIONS= {...defaultJobOptions, ...specificJobOption};
    if (this.constructor == BaseJob) {
      throw new Error('Abstract classes can\'t be instantiated.');
    }
  }

  async add(data) {
    try {
      const queue = new Queue(this.queueName, { connection: redisClient });
      await queue.add(this.constructor.name, data, this.JOB_OPTIONS);
    } catch (error) {
      this.logger.error(`Failed to add job to the queue ${this.queueName}: ${error.message}`);
    }
  }

  async process(data) {
    throw new Error('Implement in child class ');
  }
}

export default BaseJob;

