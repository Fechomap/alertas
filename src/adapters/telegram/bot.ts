import { Bot } from 'grammy';

import type { Env } from '../../config/env.js';
import type { BotContext } from '../../container/types.js';

export function createBot(env: Env): Bot<BotContext> {
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required');
  }

  const bot = new Bot<BotContext>(token);

  return bot;
}
