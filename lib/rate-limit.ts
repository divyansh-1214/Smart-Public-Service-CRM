import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { buildRedisKey, extractClientIp } from "@/lib/request-helpers";

interface RateLimitOptions {
  prefix: string;
  limit?: number;
  windowSec?: number;
  identifier?: string;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SEC = 60;

async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  // Fail open if Redis is unavailable to keep APIs online.
  if (!redis) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfter: 0,
      resetAt: Date.now() + windowSec * 1000,
    };
  }

  try {
    const currentCount = Number(await redis.incr(key));

    if (currentCount === 1) {
      await redis.expire(key, windowSec);
    }

    let ttl = Number(await redis.ttl(key));
    if (!Number.isFinite(ttl) || ttl <= 0) {
      ttl = windowSec;
    }

    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);

    return {
      allowed,
      limit,
      remaining,
      retryAfter: allowed ? 0 : ttl,
      resetAt: Date.now() + ttl * 1000,
    };
  } catch (error) {
    console.warn("[RateLimit] Redis check failed. Allowing request.", error);

    // Fail open on Redis errors.
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfter: 0,
      resetAt: Date.now() + windowSec * 1000,
    };
  }
}

export async function enforceRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowSec = options.windowSec ?? DEFAULT_WINDOW_SEC;
  const identifier = options.identifier ?? extractClientIp(request);

  const key = buildRedisKey("ratelimit", options.prefix, identifier);
  const result = await checkRateLimit(key, limit, windowSec);

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    }
  );
}
