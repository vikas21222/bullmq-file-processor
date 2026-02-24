import Redis from 'ioredis';
import config from './env.js';
import { isTestEnv } from '../src/utils/env.js';

let redisClient;

if (isTestEnv()) {
  // lightweight dummy to avoid opening network connections during tests
  redisClient = {
    on: () => {},
    quit: async () => {},
    disconnect: () => {},
  };
} else {
  const redisConf = {
    host: config.redisHost,
    port: config.redisPort,
  };

  redisClient = new Redis(redisConf);

  redisClient.on('error', (err) => {
    console.log(err.message);
  });
}

export default redisClient;
