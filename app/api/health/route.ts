import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();

  try {
    // Run a lightweight query to verify the DB is reachable
    await prisma.$queryRaw`SELECT 1`;

    const duration = Date.now() - start;

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - start;

    console.error("[/api/health] Database connection failed:", error);

    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
        message:
          error instanceof Error ? error.message : "Unknown database error",
      },
      { status: 503 }
    );
  }
}
