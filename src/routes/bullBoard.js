import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { Queue } from 'bullmq';
import redisClient from '../../config/redis.js';

// List of queue names used by the application. Add more names here as needed.
const QUEUE_NAMES = [
  'create-dump-table-queue',
];

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/bullui');

const router = express.Router();

// Protect Bull UI with basic auth using env vars BULLUI_USER and BULLUI_PASS
const uiUser = process.env.BULLUI_USER || 'admin';
const uiPass = process.env.BULLUI_PASS || 'password';
const users = { [uiUser]: uiPass };

if (process.env.NODE_ENV === 'test') {
  // In tests avoid connecting to Redis/BullMQ; provide a simple placeholder route
  router.use('/bullui', basicAuth({ users, challenge: true }), (req, res) => {
    res.status(200).send('<html><body><h1>Bull UI (test mode)</h1></body></html>');
  });
} else {
  const queues = QUEUE_NAMES.map((name) => new BullMQAdapter(new Queue(name, { connection: redisClient })));
  createBullBoard({ queues, serverAdapter });
  router.use('/bullui', basicAuth({ users, challenge: true }), serverAdapter.getRouter());
}

export default router;
