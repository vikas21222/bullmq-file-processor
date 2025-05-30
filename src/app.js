import express, { json } from 'express';

import CreateDumpTableQueueProcessor from './queuesProcessors/createDumpTableQueueProcessor';
import multer from 'multer';
import uploadRoute from './routes/fileUploadRouter';

const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(json());
app.use('/upload', upload.single('file'), uploadRoute);

const queueProcessors = [
  
  CreateDumpTableQueueProcessor,
  // Add other queue processors here
];

queueProcessors.forEach((Processor) => {
  const processorInstance = new Processor();
  processorInstance.setupWorker();
});

app.listen(3000, () => console.log('Server running on port 3000'));
