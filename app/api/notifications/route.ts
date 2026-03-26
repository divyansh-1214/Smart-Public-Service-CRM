import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getCache, setCache } from "@/lib/cache";
import { buildRedisKey } from "@/lib/request-helpers";

const NOTIFICATION_TYPES = Object.values(NotificationType);

/**
 * GET /api/notifications
 *
 * Query params:
 *   userId      (required) — CUID of the user
 *   unreadOnly  "true" to filter unread only
 *   type        NotificationType enum value
 *   page        pagination page (default 1)
 *   limit       items per page (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const readRateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:notifications:get",
      limit: 60,
      windowSec: 60,
    });

    if (readRateLimitResponse) {
      return readRateLimitResponse;
    }

    const { searchParams } = new URL(request.url);

    // ── Required: userId ─────────────────────────────────────────────────
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query parameter: userId" },
        { status: 400 },
      );
    }

    // ── Optional filters ─────────────────────────────────────────────────
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const typeParam = searchParams.get("type");

    if (typeParam && !NOTIFICATION_TYPES.includes(typeParam as NotificationType)) {
      return NextResponse.json(
        {
          error: `Invalid type. Must be one of: ${NOTIFICATION_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // ── Pagination ───────────────────────────────────────────────────────
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const skip = (page - 1) * limit;

    const cacheKey = buildRedisKey(
      "cache:notifications:get:v1",
      userId,
      unreadOnly ? "unread" : "all",
      typeParam,
      page,
      limit
    );

    const cachedResponse = await getCache<{ data: unknown; meta?: Record<string, unknown> }>(
      cacheKey
    );

    if (cachedResponse) {
      return NextResponse.json({
        ...cachedResponse,
        meta: {
          ...(cachedResponse.meta ?? {}),
          cache: "hit",
        },
      });
    }

    // ── Build where clause ───────────────────────────────────────────────
    const where: {
      userId: string;
      isRead?: boolean;
      type?: NotificationType;
    } = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }
    if (typeParam) {
      where.type = typeParam as NotificationType;
    }

    // ── Query ────────────────────────────────────────────────────────────
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const responsePayload = {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
        cache: "miss",
      },
    };

    await setCache(cacheKey, responsePayload, 15);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}
