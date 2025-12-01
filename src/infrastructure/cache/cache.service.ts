import type { RedisInstance } from './redis.client.js';

import { REDIS_KEYS } from './keys/redis-keys.constant.js';

export class CacheService {
  private readonly DEFAULT_TTL = 3600; // 1 hora

  constructor(private readonly redis: RedisInstance) {}

  private async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  }

  private async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }

  private async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async getUser<T>(userId: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.USER(userId));
  }

  async setUser<T>(userId: string, data: T, ttl = this.DEFAULT_TTL): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.USER(userId), data, ttl);
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.del(REDIS_KEYS.CACHE.USER(userId));
  }

  async getGroup<T>(chatId: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.GROUP(chatId));
  }

  async setGroup<T>(chatId: string, data: T, ttl = this.DEFAULT_TTL): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.GROUP(chatId), data, ttl);
  }

  async invalidateGroup(chatId: string): Promise<void> {
    await this.del(REDIS_KEYS.CACHE.GROUP(chatId));
  }

  async getConfig<T>(key: string): Promise<T | null> {
    return this.get<T>(REDIS_KEYS.CACHE.CONFIG(key));
  }

  async setConfig<T>(key: string, data: T, ttl?: number): Promise<void> {
    await this.set(REDIS_KEYS.CACHE.CONFIG(key), data, ttl);
  }
}
