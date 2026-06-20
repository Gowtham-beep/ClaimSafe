import Redis from 'ioredis';
import { config } from '../config';

const redisOptions: any = {
  maxRetriesPerRequest: null,
};

if (config.redisUrl.startsWith('rediss://')) {
  redisOptions.tls = {};
}

export const connection = new Redis(config.redisUrl, redisOptions);

