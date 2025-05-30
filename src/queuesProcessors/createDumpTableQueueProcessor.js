import BullmqBaseProcessor from './bullmqBaseProcessor.js';
import CreateDumpTableJob from '../jobs/createDumpTableJob.js';

class CreateDumpTableQueueProcessor extends BullmqBaseProcessor {
  constructor() {
    super({
      queueName: 'create-dump-table-queue',
    });
  }
  async _jobHandler(job) {
    switch (job.name) {
      case 'CreateDumpTableJob':
        const createDumpTableJob = new CreateDumpTableJob();

        return (await createDumpTableJob.process(job.data));
      default:
        const error = new Error('Job name unknown, please check if the job is added to the correct queue !!');
        job.moveToFailed(error, job.token, true);
    }
  }

  async _onFailed(job) {
    switch (job.name) {
      case 'CreateDumpTableJob':
        const createDumpTableJob = new CreateDumpTableJob();

        return (await createDumpTableJob.onJobFailed(job));
      default:
        throw new Error('Job name unknown, please check if the job is added to the correct queue !!');
    }
  }
}
export default CreateDumpTableQueueProcessor;
