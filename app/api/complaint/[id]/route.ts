import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus, Priority } from "@prisma/client";
import { getWorkerSessionFromRequest } from "@/lib/worker-auth";

/**
 * GET /api/complaint/[id] — Fetch a single complaint by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workerSession = getWorkerSessionFromRequest(request);

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        citizen: {
          select: { id: true, name: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    if (workerSession && complaint.assignedOfficerId !== workerSession.officerId) {
      return NextResponse.json(
        { error: "Not allowed to access this complaint" },
        { status: 403 }
      );
    }

    return NextResponse.json({ data: complaint });
  } catch (error) {
    console.error("[GET /api/complaint/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch complaint" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/complaint/[id] — Update complaint status/priority
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateSchema = z.object({
      status: z.nativeEnum(ComplaintStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
    }).refine(
      (data) => data.status !== undefined || data.priority !== undefined,
      { message: "At least one field (status or priority) must be provided" }
    );

    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    const workerSession = getWorkerSessionFromRequest(request);
    if (workerSession && existing.assignedOfficerId !== workerSession.officerId) {
      return NextResponse.json(
        { error: "Not allowed to update this complaint" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.status) updateData.status = parsed.data.status;
    if (parsed.data.priority) updateData.priority = parsed.data.priority;

    // If status is RESOLVED, set resolvedAt
    if (parsed.data.status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        citizen: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true } },
        assignedOfficer: {
          select: { id: true, name: true, position: true },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/complaint/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update complaint" },
      { status: 500 }
    );
  }
}
