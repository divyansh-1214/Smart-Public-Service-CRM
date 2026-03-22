import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateDepartmentSchema = z.object({
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  addressLine: z.string().trim().max(250).optional(),
  city: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
});

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/department/[id] — fetch a single department
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const id = (await params).id;

    const department = await prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        locationLat: true,
        locationLng: true,
        addressLine: true,
        city: true,
        pincode: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { officers: true } },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ data: department });
  } catch (error) {
    console.error("[GET /api/department/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch department" }, { status: 500 });
  }
}

// PATCH /api/department/[id] — update a department
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = (await params).id;

    const parsed = updateDepartmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // Check department exists
    const existing = await prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        description: payload.description,
        isActive: payload.isActive,
        locationLat: payload.locationLat,
        locationLng: payload.locationLng,
        addressLine: payload.addressLine,
        city: payload.city,
        pincode: payload.pincode,
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        locationLat: true,
        locationLng: true,
        addressLine: true,
        city: true,
        pincode: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/department/[id]]", error);
    return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
  }
}

// DELETE /api/department/[id] — delete a department
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const id = (await params).id;

    // Check if department has officers
    const count = await prisma.officer.count({
      where: { departmentId: id },
    });

    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete department with ${count} officers assigned` },
        { status: 409 }
      );
    }

    // Attempt delete
    const deleted = await prisma.department.delete({
      where: { id },
      select: { id: true, name: true },
    });

    return NextResponse.json({ data: deleted });
  } catch (error) {
    console.error("[DELETE /api/department/[id]]", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  }
}
