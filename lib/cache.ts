import { getRedisClient } from "@/lib/redis";

export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<string>(key);
    if (typeof cached !== "string") return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn(`[Cache] Failed to read key ${key}. Falling back without cache.`, error);
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    console.warn(`[Cache] Failed to write key ${key}.`, error);
  }
}
