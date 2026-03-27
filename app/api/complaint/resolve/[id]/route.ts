import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus, NotificationType } from "@prisma/client";
import { getWorkerSessionFromRequest } from "@/lib/worker-auth";
import { z } from "zod";

const resolveSchema = z.object({
  resolutionProofUrls: z
    .array(z.string().url())
    .min(1, "At least one proof image is required"),
  resolutionNote: z.string().max(2000).optional(),
});

// This route handles fetching unresolved complaints and marking a complaint as resolved.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        assignedOfficer: true,
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    return NextResponse.json({ data: complaint });
  } catch (error) {
    console.error("[GET /api/complaint/resolve/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch complaint" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workerSession = getWorkerSessionFromRequest(request);

    const body = await request.json().catch(() => null);
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Proof of resolution is required", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (workerSession) {
      const complaint = await prisma.complaint.findUnique({
        where: { id },
        select: { id: true, assignedOfficerId: true },
      });

      if (!complaint) {
        return NextResponse.json(
          { error: "Complaint not found" },
          { status: 404 },
        );
      }

      if (complaint.assignedOfficerId !== workerSession.officerId) {
        return NextResponse.json(
          { error: "Not allowed to resolve this complaint" },
          { status: 403 },
        );
      }
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: ComplaintStatus.RESOLVED,
        resolvedAt: new Date(),
        resolutionProofUrls: parsed.data.resolutionProofUrls,
        resolutionNote: parsed.data.resolutionNote ?? null,
        ...(workerSession ? { resolvedById: workerSession.officerId } : {}),
      },
      select: {
        id: true,
        title: true,
        citizenId: true,
        status: true,
        resolvedAt: true,
        resolutionProofUrls: true,
        resolutionNote: true,
      },
    });

    prisma.notification
      .create({
        data: {
          userId: updatedComplaint.citizenId,
          type: NotificationType.COMPLAINT_RESOLVED,
          message: `Your complaint "${updatedComplaint.title}" has been resolved. Please verify the resolution proof.`,
          complaintId: updatedComplaint.id,
          channels: ["in_app"],
          deliveredAt: new Date(),
        },
      })
      .then(() =>
        prisma.auditLog
          .create({
            data: {
              complaintId: updatedComplaint.id,
              updatedBy: workerSession?.officerId ?? "system",
              action: "resolved",
              newValue: "RESOLVED",
              metadata: {
                type: NotificationType.COMPLAINT_RESOLVED,
                proofCount: parsed.data.resolutionProofUrls.length,
                recipients: [updatedComplaint.citizenId],
              },
            },
          })
          .catch(() => null),
      )
      .catch((notificationError) => {
        console.error("[PATCH /api/complaint/resolve/[id]] notification error", notificationError);
      });

    return NextResponse.json({
      message: `Complaint resolved successfully`,
      data: updatedComplaint,
    });
  } catch (error) {
    console.error("[PATCH /api/complaint/resolve/[id]]", error);
    return NextResponse.json(
      { error: "Failed to resolve complaint" },
      { status: 500 },
    );
  }
}
