import { fetchFromStaging, insertToFinalTable } from '../services/mappingService';

import { Tracking } from '../models/fileUpload';
import { Worker } from 'bullmq';

new Worker('map-and-insert', async job => {
  const data = await fetchFromStaging(job.data.s3Path);
  const mapped = mapToFinalSchema(data); // Assume defined
  await insertToFinalTable(mapped);
  await Tracking.update({ status: 'COMPLETED' }, { where: { s3Path: job.data.s3Path } });
});
