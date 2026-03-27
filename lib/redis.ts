import { Redis } from "@upstash/redis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | null | undefined;
}

let hasLoggedMissingConfig = false;

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL?.trim();
  const redisToken = process.env.REDIS_TOKEN?.trim();

  if (!redisUrl) {
    if (!hasLoggedMissingConfig) {
      console.warn("[Redis] REDIS_URL is not configured. Redis features are disabled.");
      hasLoggedMissingConfig = true;
    }
    return null;
  }

  try {
    if (redisToken) {
      return new Redis({
        url: redisUrl,
        token: redisToken,
      });
    }

    // Support native Upstash env names when available.
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return Redis.fromEnv();
    }

    if (!hasLoggedMissingConfig) {
      console.warn(
        "[Redis] REDIS_TOKEN is not configured. For Upstash, set REDIS_TOKEN (or UPSTASH_REDIS_REST_TOKEN). Redis features are disabled."
      );
      hasLoggedMissingConfig = true;
    }

    return null;
  } catch (error) {
    console.warn(
      "[Redis] Failed to initialize Redis client. Features will gracefully degrade.",
      error
    );
    return null;
  }
}

export function getRedisClient(): Redis | null {
  if (globalThis.__redisClient === undefined) {
    globalThis.__redisClient = createRedisClient();
  }

  return globalThis.__redisClient;
}
