const { Worker } = require('bullmq');
const { validateData } = require('../utils/validators');
const { Tracking } = require('../models/tracking');
const { dumpToStaging } = require('../services/mappingService');
const queue = require('../queues');

new Worker('validate-file', async job => {
  const data = await readFileFromS3(job.data.s3Path); // Assume defined
  const isValid = validateData(data);
  if (!isValid) {
    await Tracking.update({ status: 'FAILED' }, { where: { s3Path: job.data.s3Path } });
    return;
  }
  await dumpToStaging(data);
  await Tracking.update({ status: 'VALIDATED' }, { where: { s3Path: job.data.s3Path } });
  await queue.add('map-and-insert', { s3Path: job.data.s3Path });
});
