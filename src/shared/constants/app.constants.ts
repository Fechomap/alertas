export const APP_CONSTANTS = {
  TIMEOUTS: {
    SESSION_TTL: 86400, // 24 horas
    CACHE_TTL: 3600, // 1 hora
    LOCK_TTL: 30000, // 30 segundos
    RATE_LIMIT_WINDOW: 60, // 1 minuto
  },
  LIMITS: {
    MAX_MESSAGE_LENGTH: 4096,
    MAX_RETRIES: 3,
    RATE_LIMIT_MAX: 30,
    MAX_ALERTS_PER_USER: 2,
    ALERT_INTERVAL_MS: 20000, // 20 segundos
  },
  PLATFORMS: {
    TELEGRAM: 'telegram',
    WHATSAPP: 'whatsapp',
  },
  TIMEZONE: 'America/Mexico_City',
} as const;
