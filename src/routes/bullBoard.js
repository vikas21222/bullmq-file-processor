import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import redisClient from '../../config/redis.js';
import { isTestEnv } from '../utils/env.js';

// List of queue names used by the application. Add more names here as needed.
const QUEUE_NAMES = [
  'create-dump-table-queue',
];

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bullui');

const router = express.Router();

// Custom basic auth middleware that reads env vars at request time
const customBasicAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const expectedUser = process.env.BULLUI_USER || 'admin';
  const expectedPass = process.env.BULLUI_PASS || 'password';

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull UI"');
    res.end('Unauthorized');
    return;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [user, pass] = credentials.split(':');

    if (user === expectedUser && pass === expectedPass) {
      next();
    } else {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull UI"');
      res.end('Unauthorized');
    }
  } catch (err) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull UI"');
    res.end('Unauthorized');
  }
};

if (isTestEnv()) {
  // In tests avoid connecting to Redis/BullMQ; provide a simple placeholder route
  router.use('/bullui', customBasicAuth, (req, res) => {
    res.status(200).send('<html><body><h1>Bull UI (test mode)</h1></body></html>');
  });
} else {
  const queues = QUEUE_NAMES.map((name) => new BullMQAdapter(new Queue(name, { connection: redisClient })));
  createBullBoard({ queues, serverAdapter });
  router.use('/bullui', customBasicAuth, serverAdapter.getRouter());
}

export default router;
