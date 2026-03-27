import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus, Priority } from "@prisma/client";
import { Prisma } from "@prisma/client";
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
 * PATCH /api/complaint/[id] — Update complaint status/priority (except RESOLVED)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

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

    if (parsed.data.status === ComplaintStatus.RESOLVED) {
      return NextResponse.json(
        { error: "Use PATCH /api/complaint/resolve/[id] to mark complaint as RESOLVED" },
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

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/complaint/[id]]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Complaint not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: `Database error while updating complaint (${error.code})`,
          ...(process.env.NODE_ENV !== "production" && { meta: error.meta ?? null }),
        },
        { status: 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
          ...(process.env.NODE_ENV !== "production" && { name: error.name }),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update complaint" },
      { status: 500 }
    );
  }
}
