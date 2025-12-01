import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { AwilixContainer } from 'awilix';

import { webhookRoute, healthRoute } from './adapters/http/routes/index.js';
import type { AppDependencies } from './container/types.js';

// Tipo para el contexto de Hono con container
type Variables = {
  container: AwilixContainer<AppDependencies>;
};

export function createApp(
  container: AwilixContainer<AppDependencies>,
): Hono<{ Variables: Variables }> {
  const app = new Hono<{ Variables: Variables }>();
  const logger = container.resolve('logger');

  // Middlewares globales
  app.use('*', honoLogger());
  app.use('*', cors());
  app.use('*', secureHeaders());

  // Inyectar container en el contexto
  app.use('*', async (c, next) => {
    c.set('container', container);
    await next();
  });

  // Rutas
  app.route('/health', healthRoute);
  app.route('/webhook', webhookRoute);

  // Root endpoint
  app.get('/', (c) => {
    return c.json({
      name: 'alertas-bot',
      version: '3.0.0',
      status: 'running',
    });
  });

  // Error handler global
  app.onError((err, c) => {
    logger.error({ err, path: c.req.path }, 'Unhandled error');

    return c.json(
      {
        error: 'Internal Server Error',
        message: err.message,
      },
      500,
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: 'Not Found',
        path: c.req.path,
      },
      404,
    );
  });

  return app;
}
