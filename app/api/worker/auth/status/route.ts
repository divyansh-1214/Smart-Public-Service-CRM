import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OfficerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkerSessionFromRequest, setWorkerSessionCookie } from "@/lib/worker-auth";

const statusUpdateSchema = z.object({
  status: z.enum([OfficerStatus.ACTIVE, OfficerStatus.INACTIVE]),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = getWorkerSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const parsed = statusUpdateSchema.safeParse(json);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status value", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updatedOfficer = await prisma.officer.update({
      where: { id: session.officerId },
      data: { status: parsed.data.status },
      select: {
        id: true,
        email: true,
        name: true,
        departmentId: true,
        status: true,
      },
    });

    const response = NextResponse.json({
      data: {
        officerId: updatedOfficer.id,
        email: updatedOfficer.email,
        name: updatedOfficer.name,
        departmentId: updatedOfficer.departmentId,
        status: updatedOfficer.status,
      },
      message: "Status updated successfully",
    });

    setWorkerSessionCookie(response, {
      officerId: updatedOfficer.id,
      email: updatedOfficer.email,
      name: updatedOfficer.name,
      departmentId: updatedOfficer.departmentId,
      status: updatedOfficer.status,
    });

    return response;
  } catch (error) {
    console.error("[PATCH /api/worker/auth/status]", error);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
