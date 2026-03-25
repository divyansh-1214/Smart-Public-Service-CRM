import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { OfficerStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as OfficerStatus | null;
    const departmentId = searchParams.get("departmentId");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const [officers, total] = await Promise.all([
      prisma.officer.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          department: { select: { name: true } },
          _count: { select: { complaints: true } },
        },
      }),
      prisma.officer.count({ where }),
    ]);

    return NextResponse.json({
      data: officers,
      meta: { total },
    });
  } catch (error) {
    console.error("[GET /api/officer]", error);
    return NextResponse.json(
      { error: "Failed to fetch officers" },
      { status: 500 },
    );
  }
}
