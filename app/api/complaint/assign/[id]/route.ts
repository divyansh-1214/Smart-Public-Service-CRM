import { NextResponse, NextRequest } from "next/server";
import { ComplaintStatus, OfficerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const assignComplaintSchema = z.object({
  officerIds: z.array(z.string().cuid()).optional(), // Multiple workers
  primaryOfficerId: z.string().cuid().optional(),   // Main officer
  status: z.nativeEnum(ComplaintStatus).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            status: true,
          }
        }
      }
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (!complaint.departmentId) {
      return NextResponse.json(
        { error: "Complaint has no departmentId, so officers cannot be resolved" },
        { status: 400 }
      );
    }

    const availableOfficers = await prisma.officer.findMany({
      where: { 
        departmentId: complaint.departmentId,
        status: OfficerStatus.ACTIVE 
      },
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });
    
    return NextResponse.json({
      data: {
        complaint,
        availableOfficers,
      },
    });
  } catch (error) {
    console.error("[GET /api/complaint/assign/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch complaint" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = assignComplaintSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { officerIds, primaryOfficerId, status } = parsed.data;

    if (status === undefined && primaryOfficerId === undefined && officerIds === undefined) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      );
    }

    if (officerIds && officerIds.length > 1) {
      return NextResponse.json(
        {
          error:
            "Multiple worker assignment is not supported by the current schema. Provide one primaryOfficerId or a single officerIds entry.",
        },
        { status: 400 }
      );
    }

    // 1. Fetch current complaint state
    const currentComplaint = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!currentComplaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    const requestedPrimaryOfficerId = primaryOfficerId ?? officerIds?.[0] ?? null;

    if (requestedPrimaryOfficerId) {
      const officer = await prisma.officer.findFirst({
        where: {
          id: requestedPrimaryOfficerId,
          departmentId: currentComplaint.departmentId,
          status: OfficerStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (!officer) {
        return NextResponse.json(
          {
            error:
              "Selected officer is invalid, inactive, or not part of this complaint's department",
          },
          { status: 400 }
        );
      }
    }

    // 2. Perform updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {};
      
      if (status) updateData.status = status;

      if (requestedPrimaryOfficerId) {
        updateData.assignedOfficer = { connect: { id: requestedPrimaryOfficerId } };
        updateData.assignedAt = new Date();
        if (!status && currentComplaint.status === ComplaintStatus.SUBMITTED) {
          updateData.status = ComplaintStatus.ASSIGNED;
        }
      } else if (primaryOfficerId !== undefined || officerIds !== undefined) {
        updateData.assignedOfficer = { disconnect: true };
        updateData.assignedAt = null;
      }

      const updated = await tx.complaint.update({
        where: { id },
        data: updateData,
        include: {
          assignedOfficer: true
        }
      });

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          complaintId: id,
          updatedBy: "system", // Replace with session user if available
          action: "assignment_updated",
          newValue: JSON.stringify({
            officerIds,
            primaryOfficerId: requestedPrimaryOfficerId,
            status
          }),
          oldValue: JSON.stringify({
            officerIds: currentComplaint.assignedOfficerId ? [currentComplaint.assignedOfficerId] : [],
            primaryOfficerId: currentComplaint.assignedOfficerId,
            status: currentComplaint.status
          })
        }
      });

      return updated;
    });

    return NextResponse.json({
      data: result,
      message: "Assignment updated successfully"
    });

  } catch (error) {
    console.error("[PATCH /api/complaint/assign/[id]]", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}




