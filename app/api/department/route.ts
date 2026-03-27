import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DepartmentName, Role } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth-guard";

const createDepartmentSchema = z.object({
  name: z.nativeEnum(DepartmentName),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional().default(true),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  addressLine: z.string().trim().max(250).optional(),
  city: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial().omit({ name: true });

// GET /api/department — list all departments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const where = {
      ...(isActive !== null ? { isActive: isActive === "true" } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.department.count({ where }),
    ]);

    return NextResponse.json({
      data: departments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/department]", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
  }
}

// POST /api/department — create a new department
export async function POST(request: NextRequest) {
  try {
    const authz = await requireRole([Role.ADMIN]);
    if (!authz.ok) {
      return authz.response;
    }

    const parsed = createDepartmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const department = await prisma.department.create({
      data: {
        name: payload.name,
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

    return NextResponse.json({ data: department }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/department]", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
