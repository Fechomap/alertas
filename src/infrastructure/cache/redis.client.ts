import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

import type { Env } from '../../config/env.js';
import type { Logger } from '../logging/logger.js';

export type RedisInstance = Redis;

export function createRedisClient(env: Env, logger: Logger): RedisInstance {
  const baseOptions: RedisOptions = {
    retryStrategy: (times: number): number => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    db: env.REDIS_DB,
  };

  let client: RedisInstance;

  if (env.REDIS_URL) {
    client = new Redis(env.REDIS_URL, baseOptions);
    logger.info(`Connecting to Redis URL with DB ${env.REDIS_DB}`);
  } else {
    const options: RedisOptions = {
      ...baseOptions,
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
    };
    client = new Redis(options);
    logger.info(`Connecting to Redis at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  }

  client.on('error', (err: Error) => {
    logger.error({ err }, 'Redis Client Error');
  });

  client.on('connect', () => {
    logger.info(`Redis Connected (DB ${env.REDIS_DB})`);
  });

  return client;
}

export async function disconnectRedis(client: RedisInstance, logger: Logger): Promise<void> {
  await client.quit();
  logger.info('Redis Client disconnected');
}
