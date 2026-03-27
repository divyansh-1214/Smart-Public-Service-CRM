import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ComplaintCategory,
  ComplaintStatus,
  DepartmentName,
  Priority,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

const sortableValues = ["newest", "oldest", "priority"] as const;

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  category: z.nativeEnum(ComplaintCategory).optional(),
  departmentName: z.nativeEnum(DepartmentName).optional(),
  ward: z.string().trim().max(80).optional(),
  citizenId: z.string().cuid().optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  sort: z.enum(sortableValues).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit(request, {
      prefix: "api:community:get",
      limit: 90,
      windowSec: 60,
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      departmentName: searchParams.get("departmentName") ?? undefined,
      ward: searchParams.get("ward") ?? undefined,
      citizenId: searchParams.get("citizenId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const {
      q,
      status,
      priority,
      category,
      departmentName,
      ward,
      citizenId,
      from,
      to,
      sort,
      page,
      limit,
    } = parsed.data;

    const fromDate = parseDate(from);
    const toDate = parseDate(to);

    if (from && fromDate === null) {
      return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
    }

    if (to && toDate === null) {
      return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
    }

    if (fromDate && toDate && toDate < fromDate) {
      return NextResponse.json(
        { error: "to date must be greater than or equal to from date" },
        { status: 400 },
      );
    }

    const skip = (page - 1) * limit;

    const where = {
      isPublic: true,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category } : {}),
      ...(departmentName ? { DEPARTMENT_NAME: departmentName } : {}),
      ...(ward ? { ward: { contains: ward, mode: "insensitive" as const } } : {}),
      ...(citizenId ? { citizenId } : {}),
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { locationAddress: { contains: q, mode: "insensitive" as const } },
              { ward: { contains: q, mode: "insensitive" as const } },
              { citizen: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const orderBy =
      sort === "oldest"
        ? [{ createdAt: "asc" as const }]
        : sort === "priority"
          ? [{ priority: "asc" as const }, { createdAt: "desc" as const }]
          : [{ createdAt: "desc" as const }];

    const [items, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          priority: true,
          status: true,
          DEPARTMENT_NAME: true,
          ward: true,
          locationAddress: true,
          photosUrls: true,
          createdAt: true,
          citizen: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        sort,
      },
    });
  } catch (error) {
    console.error("[GET /api/community]", error);
    return NextResponse.json(
      { error: "Failed to fetch community complaints" },
      { status: 500 },
    );
  }
}
