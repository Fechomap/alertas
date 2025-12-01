import 'dotenv/config';

import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { createContainer } from './container/container.js';
import { disconnectPrisma } from './infrastructure/database/prisma.client.js';
import { disconnectRedis } from './infrastructure/cache/redis.client.js';

async function bootstrap(): Promise<void> {
  // 1. Crear container de dependencias
  const container = await createContainer();

  const logger = container.resolve('logger');
  const env = container.resolve('env');
  const telegramAdapter = container.resolve('telegramAdapter');

  // 2. Crear aplicación Hono
  const app = createApp(container);

  // 3. Configurar bot de Telegram
  const isDev = env.NODE_ENV === 'development';

  if (isDev || !env.TELEGRAM_WEBHOOK_URL) {
    // Modo polling para desarrollo
    logger.info('Starting bot in polling mode (development)');
    await telegramAdapter.startPolling();
  } else {
    // Modo webhook para producción
    logger.info({ webhookUrl: env.TELEGRAM_WEBHOOK_URL }, 'Configuring webhook');
    await telegramAdapter.setupWebhook(env.TELEGRAM_WEBHOOK_URL, env.TELEGRAM_WEBHOOK_SECRET);
  }

  // 4. Iniciar servidor HTTP
  const server = serve(
    {
      fetch: app.fetch,
      port: env.PORT,
    },
    (info) => {
      logger.info({ port: info.port }, 'Server running');
      logger.info({ env: env.NODE_ENV }, 'Environment');

      if (env.TELEGRAM_WEBHOOK_URL) {
        logger.info({ webhookUrl: env.TELEGRAM_WEBHOOK_URL }, 'Webhook endpoint configured');
      }
    },
  );

  // 5. Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    try {
      // Detener servidor HTTP
      server.close();

      // Detener bot
      await telegramAdapter.stop();

      // Desconectar servicios
      const prisma = container.resolve('prisma');
      const redis = container.resolve('redis');

      await disconnectPrisma(prisma, logger);
      await disconnectRedis(redis, logger);

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(async (error) => {
  // Logger básico para errores catastróficos antes de que el contenedor exista
  const pino = await import('pino');
  const errorLogger = pino.default({ level: 'error' });
  errorLogger.error({ error }, 'Failed to start application');
  process.exit(1);
});
