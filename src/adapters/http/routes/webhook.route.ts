import { Hono } from 'hono';
import { webhookCallback } from 'grammy';
import type { AwilixContainer } from 'awilix';
import type { Bot } from 'grammy';

import type { AppDependencies, BotContext } from '../../../container/types.js';
import type { Env } from '../../../config/env.js';

type Variables = {
  container: AwilixContainer<AppDependencies>;
};

export const webhookRoute = new Hono<{ Variables: Variables }>();

webhookRoute.post('/', async (c) => {
  const container = c.get('container');
  const bot = container.resolve('bot') as Bot<BotContext>;
  const env = container.resolve('env') as Env;

  // Verificar secret token si está configurado
  const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
  if (secretToken) {
    const headerSecret = c.req.header('X-Telegram-Bot-Api-Secret-Token');
    if (headerSecret !== secretToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  // Procesar update con grammY
  const handleUpdate = webhookCallback(bot, 'hono');
  return handleUpdate(c);
});
