import { Queue } from 'bullmq';
import connection from '../../config/redis';

export default new Queue('validate-file', { connection });
