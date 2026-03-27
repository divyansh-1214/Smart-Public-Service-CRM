import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OfficerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setWorkerSessionCookie } from "@/lib/worker-auth";

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    console.log("Parsed login data:", parsed);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const officer = await prisma.officer.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        name: true,
        departmentId: true,
        status: true,
      },
    });

    if (!officer || (officer.status !== OfficerStatus.ACTIVE && officer.status !== OfficerStatus.INACTIVE)) {
      return NextResponse.json(
        { error: "Worker account not found or unavailable" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      data: {
        officerId: officer.id,
        email: officer.email,
        name: officer.name,
        departmentId: officer.departmentId,
        status: officer.status,
      },
      message: "Worker login successful",
    });

    setWorkerSessionCookie(response, {
      officerId: officer.id,
      email: officer.email,
      name: officer.name,
      departmentId: officer.departmentId,
      status: officer.status,
    });

    return response;
  } catch (error) {
    console.error("[POST /api/worker/auth/login]", error);
    return NextResponse.json(
      { error: "Failed to login worker" },
      { status: 500 },
    );
  }
}
