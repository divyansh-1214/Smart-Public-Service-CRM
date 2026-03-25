import { NextRequest, NextResponse } from "next/server";
import { OfficerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkerSessionFromRequest } from "@/lib/worker-auth";

export async function GET(request: NextRequest) {
  try {
    const session = getWorkerSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Worker session not found" }, { status: 401 });
    }

    const officer = await prisma.officer.findUnique({
      where: { id: session.officerId },
      select: {
        id: true,
        email: true,
        name: true,
        departmentId: true,
        status: true,
      },
    });

    if (!officer || officer.status !== OfficerStatus.ACTIVE) {
      return NextResponse.json({ error: "Worker session invalid" }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        officerId: officer.id,
        email: officer.email,
        name: officer.name,
        departmentId: officer.departmentId,
        status: officer.status,
      },
    });
  } catch (error) {
    console.error("[GET /api/worker/auth/session]", error);
    return NextResponse.json(
      { error: "Failed to fetch worker session" },
      { status: 500 },
    );
  }
}
