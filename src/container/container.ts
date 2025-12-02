import {
  createContainer as createAwilixContainer,
  asFunction,
  asValue,
  InjectionMode,
} from 'awilix';
import type { AwilixContainer } from 'awilix';

import type { AppDependencies } from './types.js';

// Config
import { env } from '../config/env.js';

// Infrastructure - Factories
import { createPrismaClient, connectPrisma } from '../infrastructure/database/prisma.client.js';
import { createRedisClient } from '../infrastructure/cache/redis.client.js';
import { createLogger } from '../infrastructure/logging/logger.js';

// Infrastructure - Services
import { SessionStore } from '../infrastructure/cache/session.store.js';
import { CacheService } from '../infrastructure/cache/cache.service.js';
import { QueueService } from '../infrastructure/queues/queue.service.js';

// Repositories
import { AlertRepository } from '../infrastructure/database/repositories/alert.repository.js';
import { GroupRepository } from '../infrastructure/database/repositories/group.repository.js';
import { ManiobraRepository } from '../infrastructure/database/repositories/maniobra.repository.js';
import { UserRepository } from '../infrastructure/database/repositories/user.repository.js';

// Use Cases
import { StartAlertUseCase } from '../application/use-cases/alert/start-alert.use-case.js';
import { StopAlertUseCase } from '../application/use-cases/alert/stop-alert.use-case.js';
import { GenerateWeeklyReportUseCase } from '../application/use-cases/report/generate-weekly-report.use-case.js';

// Telegram
import { createBot } from '../adapters/telegram/bot.js';
import { TelegramAdapter } from '../adapters/telegram/telegram.adapter.js';
import { TelegramReplyService } from '../adapters/telegram/telegram-reply.service.js';
import { AlertHandler } from '../adapters/telegram/handlers/alert.handler.js';
import { CommandHandler } from '../adapters/telegram/handlers/command.handler.js';
import { MessageHandler } from '../adapters/telegram/handlers/message.handler.js';

export async function createContainer(): Promise<AwilixContainer<AppDependencies>> {
  const container = createAwilixContainer<AppDependencies>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  // Logger primero
  const logger = createLogger(env);

  // Config & Logger
  container.register({
    env: asValue(env),
    logger: asValue(logger),
  });

  // Infrastructure - Singletons
  const prisma = createPrismaClient(logger);
  const redis = createRedisClient(env, logger);

  container.register({
    prisma: asValue(prisma),
    redis: asValue(redis),
  });

  // Conectar Prisma
  await connectPrisma(prisma, logger);

  // Cache & Session (usan redis directamente)
  container.register({
    sessionStore: asFunction((cradle) => new SessionStore(cradle.redis)).singleton(),
    cacheService: asFunction((cradle) => new CacheService(cradle.redis)).singleton(),
  });

  // Queues
  container.register({
    queueService: asFunction((cradle) => new QueueService(cradle.env, cradle.logger)).singleton(),
  });

  // Repositories (singleton porque Prisma ya es singleton y son stateless)
  container.register({
    alertRepository: asFunction((cradle) => new AlertRepository(cradle.prisma)).singleton(),
    groupRepository: asFunction((cradle) => new GroupRepository(cradle.prisma)).singleton(),
    maniobraRepository: asFunction((cradle) => new ManiobraRepository(cradle.prisma)).singleton(),
    userRepository: asFunction((cradle) => new UserRepository(cradle.prisma)).singleton(),
  });

  // Use Cases (singleton - sus dependencias también son singleton)
  container.register({
    startAlertUseCase: asFunction(
      (cradle) =>
        new StartAlertUseCase(
          cradle.alertRepository,
          cradle.groupRepository,
          cradle.userRepository,
          cradle.logger,
        ),
    ).singleton(),
    stopAlertUseCase: asFunction(
      (cradle) =>
        new StopAlertUseCase(cradle.alertRepository, cradle.groupRepository, cradle.logger),
    ).singleton(),
    generateWeeklyReportUseCase: asFunction(
      (cradle) => new GenerateWeeklyReportUseCase(cradle.maniobraRepository, cradle.logger),
    ).singleton(),
  });

  // Bot
  container.register({
    bot: asFunction((cradle) => createBot(cradle.env)).singleton(),
  });

  // Reply Service (implementación de IReplyService para Telegram)
  // Se registra antes que los handlers para romper la dependencia circular
  container.register({
    replyService: asFunction((cradle) => new TelegramReplyService(cradle.bot)).singleton(),
  });

  // Alert Handler
  container.register({
    alertHandler: asFunction(
      (cradle) => new AlertHandler(cradle.logger, cradle.replyService),
    ).singleton(),
  });

  // Command Handler
  container.register({
    commandHandler: asFunction(
      (cradle) =>
        new CommandHandler(
          cradle.alertHandler,
          cradle.env,
          cradle.logger,
          cradle.replyService,
          cradle.generateWeeklyReportUseCase,
          cradle.userRepository,
        ),
    ).singleton(),
  });

  // Message Handler
  container.register({
    messageHandler: asFunction(
      (cradle) =>
        new MessageHandler(
          cradle.alertHandler,
          cradle.logger,
          cradle.replyService,
          cradle.maniobraRepository,
          cradle.groupRepository,
          cradle.userRepository,
        ),
    ).singleton(),
  });

  // Telegram Adapter (coordina bot y handlers, sin dependencia circular)
  container.register({
    telegramAdapter: asFunction(
      (cradle) =>
        new TelegramAdapter(
          cradle.bot,
          cradle.env,
          cradle.logger,
          cradle.commandHandler,
          cradle.messageHandler,
          cradle.alertHandler,
        ),
    ).singleton(),
  });

  logger.info('DI Container initialized with PROXY mode');

  return container;
}

export type Container = AwilixContainer<AppDependencies>;
