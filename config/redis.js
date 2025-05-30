import Redis from 'ioredis';
import config from '../config/env.js';

let redisConf = {
  host: config.redisHost,
  port: config.redisPort, 
};

const redisClient = new Redis(redisConf);

redisClient.on('error', (err) => {
  console.log(err.message);
});


export default redisClient;
