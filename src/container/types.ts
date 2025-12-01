import type { PrismaClient } from '@prisma/client';
import type { Bot, Context } from 'grammy';

import type { Env } from '../config/env.js';
import type { RedisInstance } from '../infrastructure/cache/redis.client.js';
import type { Logger } from '../infrastructure/logging/logger.js';
import type { IReplyService } from '../application/ports/reply.service.interface.js';

// Repositories
import type { IAlertRepository } from '../domain/repositories/alert.repository.interface.js';
import type { IGroupRepository } from '../domain/repositories/group.repository.interface.js';
import type { IManiobraRepository } from '../domain/repositories/maniobra.repository.interface.js';
import type { IUserRepository } from '../domain/repositories/user.repository.interface.js';

// Services
import type { CacheService } from '../infrastructure/cache/cache.service.js';
import type { SessionStore } from '../infrastructure/cache/session.store.js';
import type { QueueService } from '../infrastructure/queues/queue.service.js';

// Handlers
import type { AlertHandler } from '../adapters/telegram/handlers/alert.handler.js';
import type { CommandHandler } from '../adapters/telegram/handlers/command.handler.js';
import type { MessageHandler } from '../adapters/telegram/handlers/message.handler.js';

// Use Cases
import type { StartAlertUseCase } from '../application/use-cases/alert/start-alert.use-case.js';
import type { StopAlertUseCase } from '../application/use-cases/alert/stop-alert.use-case.js';
import type { GenerateWeeklyReportUseCase } from '../application/use-cases/report/generate-weekly-report.use-case.js';

// Telegram
import type { TelegramAdapter } from '../adapters/telegram/telegram.adapter.js';

export type BotContext = Context;

export interface AppDependencies {
  // Config
  env: Env;
  logger: Logger;

  // Infrastructure
  prisma: PrismaClient;
  redis: RedisInstance;

  // Cache & Session
  sessionStore: SessionStore;
  cacheService: CacheService;

  // Queues
  queueService: QueueService;

  // Repositories
  alertRepository: IAlertRepository;
  groupRepository: IGroupRepository;
  maniobraRepository: IManiobraRepository;
  userRepository: IUserRepository;

  // Use Cases
  startAlertUseCase: StartAlertUseCase;
  stopAlertUseCase: StopAlertUseCase;
  generateWeeklyReportUseCase: GenerateWeeklyReportUseCase;

  // Telegram
  bot: Bot<BotContext>;
  telegramAdapter: TelegramAdapter;
  replyService: IReplyService;
  alertHandler: AlertHandler;
  commandHandler: CommandHandler;
  messageHandler: MessageHandler;
}

// Cradle type para Awilix
export type Cradle = AppDependencies;
