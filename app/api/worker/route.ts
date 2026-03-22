import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OfficerStatus, Position } from "@prisma/client";
import { z } from "zod";

const createWorkerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(20),
  departmentId: z.string().cuid(),
  passwordHash: z.string().min(1).optional(),
  avatarUrl: z.url().trim().optional(),
  bio: z.string().trim().max(500).optional(),
  position: z.nativeEnum(Position).optional(),
  status: z.nativeEnum(OfficerStatus).optional().default(OfficerStatus.ACTIVE),
  maxConcurrentComplaints: z.number().int().min(1).max(100).optional().default(10),
});

// GET /api/worker — list officers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const positionParam = searchParams.get("position");
    const departmentId = searchParams.get("departmentId");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const status =
      statusParam && Object.values(OfficerStatus).includes(statusParam as OfficerStatus)
        ? (statusParam as OfficerStatus)
        : undefined;

    const position =
      positionParam && Object.values(Position).includes(positionParam as Position)
        ? (positionParam as Position)
        : undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(position ? { position } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [workers, total] = await Promise.all([
      prisma.officer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.officer.count({ where }),
    ]);

    return NextResponse.json({
      data: workers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/worker]", error);
    return NextResponse.json({ error: "Failed to fetch workers" }, { status: 500 });
  }
}

// POST /api/worker — create officer
export async function POST(request: NextRequest) {
  try {
    const parsed = createWorkerSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const departmentExists = await prisma.department.findUnique({
      where: { id: payload.departmentId },
      select: { id: true },
    });

    if (!departmentExists) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const worker = await prisma.officer.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        departmentId: payload.departmentId,
        ...(payload.passwordHash ? { passwordHash: payload.passwordHash } : {}),
        ...(payload.avatarUrl ? { avatarUrl: payload.avatarUrl } : {}),
        ...(payload.bio ? { bio: payload.bio } : {}),
        ...(payload.position ? { position: payload.position } : {}),
        status: payload.status,
        maxConcurrentComplaints: payload.maxConcurrentComplaints,
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

    return NextResponse.json({ data: worker }, { status: 201 });
  } catch (error: unknown) {
    console.error("[POST /api/worker]", error);

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

    return NextResponse.json({ error: "Failed to create worker" }, { status: 500 });
  }
}
