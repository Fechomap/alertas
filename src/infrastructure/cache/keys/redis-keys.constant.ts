export const REDIS_KEYS = {
  // Sesiones de usuario (TTL: 24h)
  SESSION: (platform: string, odId: string): string => `session:${platform}:${odId}`,

  // Cache de datos (TTL: variable)
  CACHE: {
    USER: (odId: string): string => `cache:user:${odId}`,
    GROUP: (chatId: string): string => `cache:group:${chatId}`,
    CONFIG: (key: string): string => `cache:config:${key}`,
  },

  // Rate limiting (TTL: ventana de tiempo)
  RATE_LIMIT: (odId: string, action: string): string => `ratelimit:${action}:${odId}`,

  // Locks distribuidos (TTL: duracion del lock)
  LOCK: (resource: string): string => `lock:${resource}`,

  // Alert intervals (para persistir timers)
  ALERT_INTERVAL: (groupId: string, odId: string, type: string): string =>
    `alert:interval:${groupId}:${odId}:${type}`,

  // FSM Estados conversacionales (TTL: 1h)
  FSM_STATE: (platform: string, odId: string): string => `fsm:${platform}:${odId}`,

  // Pub/Sub channels
  CHANNEL: {
    NOTIFICATIONS: 'channel:notifications',
    EVENTS: 'channel:events',
    ALERTS: 'channel:alerts',
  },
} as const;
