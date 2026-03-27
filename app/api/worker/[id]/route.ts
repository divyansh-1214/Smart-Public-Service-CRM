import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OfficerStatus, Position, Role } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";

type RouteContext = { params: Promise<{ id: string }> };

const updateWorkerSchema = z.object({
  email: z.email().trim().toLowerCase().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(7).max(20).nullable().optional(),
  passwordHash: z.string().min(1).nullable().optional(),
  avatarUrl: z.url().trim().nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  departmentId: z.string().cuid().optional(),
  position: z.nativeEnum(Position).nullable().optional(),
  status: z.nativeEnum(OfficerStatus).optional(),
  maxConcurrentComplaints: z.number().int().min(1).max(100).optional(),
});

// GET /api/worker/[id] — fetch a single officer
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    const worker = await prisma.officer.findUnique({
      where: { id },
      select: {
        id: true,
        departmentId: true,
        email: true,
        name: true,
        status: true,
        position: true,
        maxConcurrentComplaints: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    return NextResponse.json({ data: worker });
  } catch (error) {
    console.error("[GET /api/worker/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch worker" }, { status: 500 });
  }
}

// PATCH /api/worker/[id] — partially update an officer
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const authz = await requireRole([Role.ADMIN]);
    if (!authz.ok) {
      return authz.response;
    }

    const { id } = await params;
    const parsed = updateWorkerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const existing = await prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    if (payload.departmentId) {
      const departmentExists = await prisma.department.findUnique({
        where: { id: payload.departmentId },
        select: { id: true },
      });
      if (!departmentExists) {
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      }
    }

    const updated = await prisma.officer.update({
      where: { id },
      data: {
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone ?? existing.phone } : {}),
        ...(payload.passwordHash !== undefined ? { passwordHash: payload.passwordHash } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.departmentId !== undefined ? { departmentId: payload.departmentId } : {}),
        ...(payload.position !== undefined ? { position: payload.position } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.maxConcurrentComplaints !== undefined
          ? { maxConcurrentComplaints: payload.maxConcurrentComplaints }
          : {}),
      },
      select: {
        id: true,
        departmentId: true,
        email: true,
        name: true,
        status: true,
        position: true,
        maxConcurrentComplaints: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    console.error("[PATCH /api/worker/[id]]", error);

    // Duplicate email
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An officer with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to update worker" }, { status: 500 });
  }
}

// DELETE /api/worker/[id] — remove a worker/officer
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const authz = await requireRole([Role.ADMIN]);
    if (!authz.ok) {
      return authz.response;
    }

    const { id } = await params;

    const existing = await prisma.officer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    await prisma.officer.delete({ where: { id } });

    return NextResponse.json(
      { message: `Worker ${id} deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DELETE /api/worker/[id]]", error);
    return NextResponse.json({ error: "Failed to delete worker" }, { status: 500 });
  }
}
