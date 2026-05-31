import Redis from 'ioredis';
import { config } from '../config';

// Initialize Redis connection. 
// Note: BullMQ requires maxRetriesPerRequest to be null
export const connection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
});
