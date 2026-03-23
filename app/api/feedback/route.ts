import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { FeedbackTag } from "@prisma/client";

// ── Validation Schema ─────────────────────────────────────────────────────────

const createFeedbackSchema = z.object({
  userId: z.string().cuid("userId must be a valid CUID"),
  complaintId: z.string().cuid("complaintId must be a valid CUID"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  comment: z.string().trim().max(2000).optional(),
  tags: z.array(z.nativeEnum(FeedbackTag)).optional().default([]),
  isAnonymous: z.boolean().optional().default(false),
});

// ── GET /api/feedback ─────────────────────────────────────────────────────────
//
// Query params:
//   complaintId  (required) — fetch all feedback for a complaint
//   userId       (optional) — filter to feedback from a specific user
//   page         (default 1)
//   limit        (default 20, max 100)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const complaintId = searchParams.get("complaintId");
    if (!complaintId) {
      return NextResponse.json(
        { error: "Missing required query parameter: complaintId" },
        { status: 400 },
      );
    }

    const userId = searchParams.get("userId") ?? undefined;

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)),
    );
    const skip = (page - 1) * limit;

    // Ensure the complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: `Complaint with id ${complaintId} not found` },
        { status: 404 },
      );
    }

    const where = { complaintId, ...(userId ? { userId } : {}) };

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          complaintId: true,
          rating: true,
          comment: true,
          tags: true,
          isAnonymous: true,
          createdAt: true,
          updatedAt: true,
          // Mask the userId when feedback is anonymous
          userId: true,
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    // Strip user identity for anonymous submissions
    const sanitized = feedbacks.map((fb) => {
      if (fb.isAnonymous) {
        return { ...fb, userId: null, user: null };
      }
      return fb;
    });

    // Aggregate stats for the complaint
    const stats = await prisma.feedback.aggregate({
      where: { complaintId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return NextResponse.json({
      data: sanitized,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        averageRating: stats._avg.rating
          ? Math.round(stats._avg.rating * 10) / 10
          : null,
        totalFeedbacks: stats._count.id,
      },
    });
  } catch (error) {
    console.error("[GET /api/feedback]", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}

// ── POST /api/feedback ────────────────────────────────────────────────────────
//
// Body:
//   userId       (required) CUID
//   complaintId  (required) CUID
//   rating       (required) 1–5
//   comment      (optional) max 2000 chars
//   tags         (optional) array of FeedbackTag enum values
//   isAnonymous  (optional) default false

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, complaintId, rating, comment, tags, isAnonymous } =
      parsed.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with id ${userId} not found` },
        { status: 404 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "User account is inactive" },
        { status: 400 },
      );
    }

    // Verify complaint exists and is in a state that accepts feedback
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, citizenId: true, status: true },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: `Complaint with id ${complaintId} not found` },
        { status: 404 },
      );
    }

    // Only allow feedback on resolved/closed complaints
    if (!["RESOLVED", "CLOSED"].includes(complaint.status)) {
      return NextResponse.json(
        {
          error:
            "Feedback can only be submitted for resolved or closed complaints",
          currentStatus: complaint.status,
        },
        { status: 400 },
      );
    }

    // Create feedback — DB unique constraint [userId, complaintId] prevents duplicates
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        complaintId,
        rating,
        comment,
        tags,
        isAnonymous,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Strip identity if anonymous
    const response = isAnonymous
      ? { ...feedback, userId: null, user: null }
      : feedback;

    return NextResponse.json(
      { message: "Feedback submitted successfully", data: response },
      { status: 201 },
    );
  } catch (error) {
    // Handle unique constraint violation (P2002) — one feedback per user per complaint
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You have already submitted feedback for this complaint" },
        { status: 409 },
      );
    }

    console.error("[POST /api/feedback]", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
