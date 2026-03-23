import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/notifications/[id]/read
 *
 * Mark a single notification as read.
 * Idempotent — calling on an already-read notification returns its current state.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check existence first
    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Notification with id ${id} not found` },
        { status: 404 },
      );
    }

    // Already read — return as-is (idempotent)
    if (existing.isRead) {
      return NextResponse.json({ data: existing });
    }

    // Mark as read
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/notifications/[id]/read]", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 },
    );
  }
}
