import { NextResponse, NextRequest } from "next/server";
import { ComplaintStatus, OfficerStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const assignComplaintSchema = z.object({
  officerId: z.string().cuid().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
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
    console.log("Complaint departmentId:", complaint.departmentId);
    const officers = await prisma.officer.findMany({
      where: { departmentId: complaint.departmentId },
      select: {
        id: true,
        name: true,
        email: true,
        departmentId: true,
        status: true,
        position: true,
      },
      orderBy: { createdAt: "asc" },
    });
    
    return NextResponse.json({
      data: {
        complaint,
        officers,
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

    const parsed = assignComplaintSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
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
    console.log("Complaint departmentId:", complaint.departmentId);
    let officers = null as {
      id: string;
      name: string;
      email: string;
      departmentId: string;
      status: OfficerStatus;
      position: import("@prisma/client").Position | null;
    } | null;

    if (parsed.data.officerId) {
      officers = await prisma.officer.findFirst({
        where: {
          id: parsed.data.officerId,
          departmentId: complaint.departmentId,
          status: OfficerStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
          status: true,
          position: true,
        },
      });
    } else {
      officers = await prisma.officer.findFirst({
        where: { departmentId: complaint.departmentId, status: OfficerStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          email: true,
          departmentId: true,
          status: true,
          position: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!officers) {
      return NextResponse.json(
        { error: "No active officer available in this department" },
        { status: 404 }
      );
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: {
        departmentId: complaint.departmentId,
        assignedOfficerId: officers.id,
        assignedAt: new Date(),
        status: ComplaintStatus.ASSIGNED,
      },
    });

    return NextResponse.json({
      data: {
        complaint: updatedComplaint,
        officers,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/complaint/assign/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch complaint" }, { status: 500 });
  }
}




