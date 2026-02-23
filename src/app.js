import express, { json } from 'express';

import CreateDumpTableQueueProcessor from './queuesProcessors/createDumpTableQueueProcessor';
import uploadRoute from './routes/fileUploadRouter';
import bullBoardRoute from './routes/bullBoard.js';

const app = express();
app.use(json());
// Mount upload router which handles its own multer file handling
app.use('/upload', uploadRoute);
// mount Bull Board UI
app.use('/', bullBoardRoute);

const queueProcessors = [
  CreateDumpTableQueueProcessor,
  // Add other queue processors here
];

// In test environment we avoid starting queue workers and the HTTP server
if (process.env.NODE_ENV !== 'test') {
  queueProcessors.forEach((Processor) => {
    const processorInstance = new Processor();
    processorInstance.setupWorker();
  });

  app.listen(3000, () => console.log('Server running on port 3000'));
}

// Centralized error handler — returns structured JSON for errors
app.use((err, req, res, next) => {
  try {
    const status = err && err.status ? err.status : 500;
    const body = {
      success: false,
      error: err && err.name ? err.name : 'InternalServerError',
      message: err && err.message ? err.message : 'Internal Server Error',
    };

    // include details in non-production for debugging
    if (process.env.NODE_ENV !== 'production' && err && err.stack) {
      body.stack = err.stack;
    }

    res.status(status).json(body);
  } catch (handlerErr) {
    // fallback
    res.status(500).json({ success: false, error: 'InternalServerError', message: 'An error occurred' });
  }
});

export default app;
