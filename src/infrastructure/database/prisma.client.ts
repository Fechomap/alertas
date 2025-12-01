import { PrismaClient } from '@prisma/client';

import type { Logger } from '../logging/logger.js';

let prismaInstance: PrismaClient | null = null;

export function createPrismaClient(logger: Logger): PrismaClient {
  if (prismaInstance) {
    return prismaInstance;
  }

  prismaInstance = new PrismaClient();

  logger.info('Prisma Client created');

  return prismaInstance;
}

export async function connectPrisma(prisma: PrismaClient, logger: Logger): Promise<void> {
  await prisma.$connect();
  logger.info('Prisma Client connected');
}

export async function disconnectPrisma(prisma: PrismaClient, logger: Logger): Promise<void> {
  await prisma.$disconnect();
  logger.info('Prisma Client disconnected');
}
