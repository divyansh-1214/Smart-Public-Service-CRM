import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus, NotificationType } from "@prisma/client";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const reopenSchema = z.object({
  reason: z.string().max(1000).optional(),
});

/**
 * PATCH /api/complaint/reopen/[id] — Citizen reopens a resolved complaint
 * Only the complaint's citizen can reopen.
 * Only allowed when status is RESOLVED.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Authenticate citizen via Clerk
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve Clerk ID to DB user
    const user = await prisma.user.findFirst({
      where: { id: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = reopenSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: {
        id: true,
        citizenId: true,
        status: true,
        title: true,
        assignedOfficerId: true,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (complaint.citizenId !== user.id) {
      return NextResponse.json(
        { error: "Only the complaint filer can reopen this complaint" },
        { status: 403 },
      );
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      return NextResponse.json(
        { error: "Only resolved complaints can be reopened" },
        { status: 400 },
      );
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: ComplaintStatus.IN_PROGRESS,
        resolvedAt: null,
        resolvedById: null,
      },
      select: {
        id: true,
        title: true,
        status: true,
        citizenId: true,
        assignedOfficerId: true,
      },
    });

    // Audit log for reopen
    await prisma.auditLog.create({
      data: {
        complaintId: updatedComplaint.id,
        updatedBy: user.id,
        action: "reopened",
        oldValue: "RESOLVED",
        newValue: "IN_PROGRESS",
        metadata: {
          reason: parsed.data.reason ?? null,
          reopenedBy: "citizen",
        },
      },
    });

    // Notify the assigned officer if any
    if (updatedComplaint.assignedOfficerId) {
      // Find the officer's linked user account for notification
      const officer = await prisma.officer.findUnique({
        where: { id: updatedComplaint.assignedOfficerId },
        select: { email: true },
      });

      if (officer) {
        const officerUser = await prisma.user.findFirst({
          where: { email: officer.email },
          select: { id: true },
        });

        if (officerUser) {
          prisma.notification
            .create({
              data: {
                userId: officerUser.id,
                type: NotificationType.COMPLAINT_UPDATED,
                message: `Complaint "${updatedComplaint.title}" has been reopened by the citizen.${parsed.data.reason ? ` Reason: ${parsed.data.reason}` : ""}`,
                complaintId: updatedComplaint.id,
                channels: ["in_app"],
                deliveredAt: new Date(),
              },
            })
            .catch((err) =>
              console.error("[PATCH /api/complaint/reopen] notification error", err),
            );
        }
      }
    }

    return NextResponse.json({
      message: "Complaint reopened successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    console.error("[PATCH /api/complaint/reopen/[id]]", error);
    return NextResponse.json(
      { error: "Failed to reopen complaint" },
      { status: 500 },
    );
  }
}
