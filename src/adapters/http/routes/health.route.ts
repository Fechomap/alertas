import { Hono } from 'hono';
import type { AwilixContainer } from 'awilix';
import type { PrismaClient } from '@prisma/client';

import type { AppDependencies } from '../../../container/types.js';
import type { RedisInstance } from '../../../infrastructure/cache/redis.client.js';

type Variables = {
  container: AwilixContainer<AppDependencies>;
};

export const healthRoute = new Hono<{ Variables: Variables }>();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoute.get('/ready', async (c) => {
  const container = c.get('container');

  try {
    const redis = container.resolve('redis') as RedisInstance;
    const prisma = container.resolve('prisma') as PrismaClient;

    await redis.ping();
    await prisma.$queryRaw`SELECT 1`;

    return c.json({
      status: 'ready',
      checks: {
        redis: 'ok',
        database: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      503,
    );
  }
});
