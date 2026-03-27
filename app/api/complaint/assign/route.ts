import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { NotificationType, OfficerStatus } from "@prisma/client";
import { z } from "zod";

// Local enum definition since it may not be exported from @prisma/client
enum AssignmentOutcome {
  REASSIGNED = "REASSIGNED",
  ESCALATED = "ESCALATED",
  RESOLVED = "RESOLVED",
  SELF_WITHDRAWN = "SELF_WITHDRAWN",
  ADMIN_REMOVED = "ADMIN_REMOVED"
}

const createAssignmentSchema = z.object({
  complaintId: z.string().cuid(),
  officerId: z.string().cuid(),
  assignedBy: z.string().trim().min(1).optional(),
});

const updateAssignmentSchema = z
  .object({
    assignmentId: z.string().cuid(),
    outcome: z.nativeEnum(AssignmentOutcome).optional(),
    performanceNote: z.string().trim().max(2000).nullable().optional(),
  })
  .refine(
    (value) => value.outcome !== undefined || value.performanceNote !== undefined,
    {
      message: "Provide at least one field to update: outcome or performanceNote",
      path: ["outcome"],
    }
  );

async function sendAssignmentNotifications(input: {
  complaintId: string;
  complaintTitle: string;
  citizenId: string;
  officerId: string;
  officerName: string;
  officerEmail: string;
}) {
  const {
    complaintId,
    complaintTitle,
    citizenId,
    officerId,
    officerName,
    officerEmail,
  } = input;

  const workerUser = await prisma.user.findFirst({
    where: {
      email: officerEmail,
      isActive: true,
    },
    select: { id: true },
  });

  const rows: Array<{
    userId: string;
    type: NotificationType;
    message: string;
    complaintId: string;
    channels: string[];
    deliveredAt: Date;
  }> = [
    {
      userId: citizenId,
      type: NotificationType.COMPLAINT_ASSIGNED,
      message: `Your complaint "${complaintTitle}" has been assigned to worker ${officerName}.`,
      complaintId,
      channels: ["in_app"],
      deliveredAt: new Date(),
    },
  ];

  if (workerUser && workerUser.id !== citizenId) {
    rows.push({
      userId: workerUser.id,
      type: NotificationType.COMPLAINT_ASSIGNED,
      message: `You have been assigned complaint "${complaintTitle}".`,
      complaintId,
      channels: ["in_app"],
      deliveredAt: new Date(),
    });
  }

  await prisma.notification.createMany({ data: rows });

  await prisma.auditLog
    .create({
      data: {
        complaintId,
        updatedBy: "system",
        action: "notification_sent",
        metadata: {
          type: NotificationType.COMPLAINT_ASSIGNED,
          recipients: rows.map((row) => row.userId),
          assignedOfficerId: officerId,
        },
      },
    })
    .catch(() => null);
}

export async function GET() {
  try {
    return NextResponse.json(
      {
        message: "Use POST /api/complaint/assign/[id] to assign a complaint",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error assigning complaint:", error);
    return NextResponse.json({ error: "Failed to assign complaint." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryInput = {
      complaintId: searchParams.get("complaintId") ?? undefined,
      officerId: searchParams.get("officerId") ?? undefined,
      assignedBy: searchParams.get("assignedBy") ?? undefined,
    };

    const rawBody = await request.text();
    let bodyInput: Record<string, unknown> = {};
    if (rawBody.trim().length > 0) {
      try {
        bodyInput = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "Request body must be valid JSON" },
          { status: 400 }
        );
      }
    }

    const parsed = createAssignmentSchema.safeParse({
      complaintId: bodyInput.complaintId ?? queryInput.complaintId,
      officerId: bodyInput.officerId ?? queryInput.officerId,
      assignedBy: bodyInput.assignedBy ?? queryInput.assignedBy,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { complaintId, officerId, assignedBy } = parsed.data;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, departmentId: true, citizenId: true, title: true },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    const officer = await prisma.officer.findUnique({
      where: { id: officerId },
      select: { id: true, departmentId: true, status: true, name: true, email: true },
    });

    if (!officer) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    if (officer.status !== OfficerStatus.ACTIVE) {
      return NextResponse.json({ error: "Officer is not active" }, { status: 400 });
    }

    if (officer.departmentId !== complaint.departmentId) {
      return NextResponse.json(
        { error: "Officer does not belong to complaint department" },
        { status: 400 }
      );
    }

    const assignedAt = new Date();
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default deadline of 7 days

    const complaintAssignmentDelegate = (prisma as unknown as {
      complaintAssignment?: {
        create: (args: {
          data: {
            complaintId: string;
            officerId: string;
            assignedBy: string | null;
            assignedAt: Date;
            deadline: Date;
          };
        }) => Promise<unknown>;
      };
    }).complaintAssignment;

    let assignment: unknown;

    if (complaintAssignmentDelegate?.create) {
      assignment = await complaintAssignmentDelegate.create({
        data: {
          complaintId,
          officerId,
          assignedBy: assignedBy ?? null,
          assignedAt,
          deadline,
        },
      });
    } else {
      const assignmentId = `ca_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      await prisma.$executeRaw`
        INSERT INTO "complaint_assignments" ("id", "complaintId", "officerId", "assignedBy", "assignedAt", "deadline")
        VALUES (${assignmentId}, ${complaintId}, ${officerId}, ${assignedBy ?? null}, ${assignedAt}, ${deadline})
      `;

      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          complaintId: string;
          officerId: string;
          assignedBy: string | null;
          assignedAt: Date;
          relievedAt: Date | null;
          outcome: string | null;
          performanceNote: string | null;
          deadline: Date | null;
        }>
      >`
        SELECT
          "id",
          "complaintId",
          "officerId",
          "assignedBy",
          "assignedAt",
          "relievedAt",
          "outcome",
          "performanceNote",
          "deadline"
        FROM "complaint_assignments"
        WHERE "id" = ${assignmentId}
        LIMIT 1
      `;

      assignment = rows[0] ?? {
        id: assignmentId,
        complaintId,
        officerId,
        assignedBy: assignedBy ?? null,
        assignedAt,
        relievedAt: null,
        outcome: null,
        performanceNote: null,
        deadline,
      };
    }

    sendAssignmentNotifications({
      complaintId: complaint.id,
      complaintTitle: complaint.title,
      citizenId: complaint.citizenId,
      officerId: officer.id,
      officerName: officer.name,
      officerEmail: officer.email,
    }).catch((notificationError) => {
      console.error("[POST /api/complaint/assign] notification error", notificationError);
    });

    return NextResponse.json(
      {
        message: "Complaint assignment created successfully",
        data: assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/complaint/assign]", error);
    return NextResponse.json(
      { error: "Failed to process assignment request" },
      { status: 500 }
    );
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let bodyInput: Record<string, unknown> = {};
    if (rawBody.trim().length > 0) {
      try {
        bodyInput = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: "Request body must be valid JSON" },
          { status: 400 }
        );
      }
    }

    const parsed = updateAssignmentSchema.safeParse({
      assignmentId: bodyInput.assignmentId,
      outcome: bodyInput.outcome,
      performanceNote: bodyInput.performanceNote,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { assignmentId, outcome, performanceNote } = parsed.data;

    const targetRows = await prisma.$queryRaw<
      Array<{
        id: string;
      }>
    >`
      SELECT "id"
      FROM "complaint_assignments"
      WHERE "id" = ${assignmentId}
      LIMIT 1
    `;

    const target = targetRows[0];
    if (!target) {
      return NextResponse.json({ error: "Assignment record not found" }, { status: 404 });
    }

    if (outcome !== undefined) {
      await prisma.$executeRaw`
        UPDATE "complaint_assignments"
        SET "outcome" = ${outcome}::"AssignmentOutcome"
        WHERE "id" = ${target.id}
      `;
    }

    if (performanceNote !== undefined) {
      await prisma.$executeRaw`
        UPDATE "complaint_assignments"
        SET "performanceNote" = ${performanceNote}
        WHERE "id" = ${target.id}
      `;
    }

    const updatedRows = await prisma.$queryRaw<
      Array<{
        id: string;
        complaintId: string;
        officerId: string;
        assignedBy: string | null;
        assignedAt: Date;
        relievedAt: Date | null;
        outcome: string | null;
        performanceNote: string | null;
        deadline: Date | null;
      }>
    >`
      SELECT
        "id",
        "complaintId",
        "officerId",
        "assignedBy",
        "assignedAt",
        "relievedAt",
        "outcome",
        "performanceNote",
        "deadline"
      FROM "complaint_assignments"
      WHERE "id" = ${target.id}
      LIMIT 1
    `;

    return NextResponse.json(
      {
        message: "Complaint assignment updated successfully",
        data: updatedRows[0] ?? null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/complaint/assign]", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 }
    );
  }
}