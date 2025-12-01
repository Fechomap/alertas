import pino from 'pino';

import type { Env } from '../../config/env.js';

export type Logger = pino.Logger;

export function createLogger(env: Env): Logger {
  const isDev = env.NODE_ENV === 'development';

  return pino({
    level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    formatters: {
      level: (label) => ({ level: label }),
    },
  });
}
