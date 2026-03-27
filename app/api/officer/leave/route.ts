import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ── Validation Schemas ────────────────────────────────────────────────────────

const createLeaveSchema = z
  .object({
    officerId: z.string().cuid("officerId must be a valid CUID"),
    startDate: z.coerce.date({ message: "startDate must be a valid ISO date" }),
    endDate: z.coerce.date({ message: "endDate must be a valid ISO date" }),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "endDate must be on or after startDate",
    path: ["endDate"],
  });

// ── GET /api/officer/leave ────────────────────────────────────────────────────
//
// Query params:
//   officerId   (optional) — filter to a specific officer
//   approved    "true" | "false" — filter by approval status
//   upcoming    "true" — only leaves where startDate >= today
//   page        (default 1)
//   limit       (default 20, max 100)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const officerId = searchParams.get("officerId") ?? undefined;
    const approvedParam = searchParams.get("approved");
    const upcoming = searchParams.get("upcoming") === "true";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      officerId?: string;
      approved?: boolean;
      startDate?: { gte: Date };
    } = {};

    if (officerId) where.officerId = officerId;

    if (approvedParam === "true") where.approved = true;
    else if (approvedParam === "false") where.approved = false;

    if (upcoming) where.startDate = { gte: new Date() };

    const [leaves, total] = await Promise.all([
      prisma.officerLeave.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: "asc" },
        include: {
          officer: {
            select: {
              id: true,
              name: true,
              email: true,
              position: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.officerLeave.count({ where }),
    ]);

    return NextResponse.json({
      data: leaves,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/officer/leave]", error);
    return NextResponse.json(
      { error: "Failed to fetch officer leaves" },
      { status: 500 },
    );
  }
}

// ── POST /api/officer/leave ───────────────────────────────────────────────────
//
// Body:
//   officerId   (required) CUID
//   startDate   (required) ISO date string
//   endDate     (required) ISO date string, must be >= startDate
//   reason      (optional) max 500 chars

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 },
      );
    }

    const parsed = createLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { officerId, startDate, endDate, reason } = parsed.data;
    const normalizedReason = reason?.trim() ? reason.trim() : null;

    // Verify officer exists
    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: { id: true, name: true, status: true },
    });

    if (!officer) {
      return NextResponse.json(
        { error: `Officer with id ${officerId} not found` },
        { status: 404 },
      );
    }

    if (officer.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active officers can request leave" },
        { status: 400 },
      );
    }

    // Check for overlapping leave for the same officer
    const overlap = await prisma.officerLeave.findFirst({
      where: {
        officerId,
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
    });

    if (overlap) {
      return NextResponse.json(
        {
          error: "Officer already has a leave request overlapping these dates",
          conflictingLeaveId: overlap.id,
          conflictingPeriod: {
            startDate: overlap.startDate,
            endDate: overlap.endDate,
          },
        },
        { status: 409 },
      );
    }

    const leave = await prisma.officerLeave.create({
      data: {
        officerId,
        startDate,
        endDate,
        reason: normalizedReason,
        approved: false, // Requires explicit approval via PATCH
      },
    });

    return NextResponse.json(
      { message: "Leave request submitted successfully", data: leave },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/officer/leave]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Invalid officer reference for leave request" },
          { status: 400 },
        );
      }

      if (error.code === "P2022") {
        return NextResponse.json(
          {
            error:
              "Database schema is out of sync for officer leaves. Run Prisma schema sync/migration and retry.",
          },
          { status: 500 },
        );
      }
    }

    const fallbackMessage =
      error instanceof Error ? error.message : "Failed to submit leave request";

    return NextResponse.json(
      {
        error: fallbackMessage,
        ...(process.env.NODE_ENV !== "production" && {
          debug: {
            name: error instanceof Error ? error.name : "UnknownError",
          },
        }),
      },
      { status: 500 },
    );
  }
}
