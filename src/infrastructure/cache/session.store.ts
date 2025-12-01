import type { RedisInstance } from './redis.client.js';

import { REDIS_KEYS } from './keys/redis-keys.constant.js';

export interface SessionData {
  userId: string;
  chatId: string;
  state?: string;
  data?: Record<string, unknown>;
  lastActivity: Date;
}

export class SessionStore {
  private readonly SESSION_TTL = 86400; // 24 horas

  constructor(private readonly redis: RedisInstance) {}

  private async getFromRedis<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  private async setToRedis<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async get(platform: string, odId: string): Promise<SessionData | null> {
    return this.getFromRedis<SessionData>(REDIS_KEYS.SESSION(platform, odId));
  }

  async set(platform: string, odId: string, data: SessionData): Promise<void> {
    await this.setToRedis(REDIS_KEYS.SESSION(platform, odId), data, this.SESSION_TTL);
  }

  async update(platform: string, odId: string, data: Partial<SessionData>): Promise<void> {
    const existing = await this.get(platform, odId);
    if (existing) {
      await this.set(platform, odId, { ...existing, ...data, lastActivity: new Date() });
    }
  }

  async delete(platform: string, odId: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.SESSION(platform, odId));
  }

  async exists(platform: string, odId: string): Promise<boolean> {
    const result = await this.redis.exists(REDIS_KEYS.SESSION(platform, odId));
    return result === 1;
  }
}
