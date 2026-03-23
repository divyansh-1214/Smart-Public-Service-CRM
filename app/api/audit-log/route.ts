import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/audit-log ────────────────────────────────────────────────────────
//
// Query params:
//   complaintId  (required) — fetch audit trail for a complaint
//   updatedBy    (optional) — filter to entries by a specific actor (userId / officerId / "system")
//   action       (optional) — filter by action string (e.g. "assigned", "escalated")
//   page         (default 1)
//   limit        (default 50, max 200)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Required
    const complaintId = searchParams.get("complaintId");
    if (!complaintId) {
      return NextResponse.json(
        { error: "Missing required query parameter: complaintId" },
        { status: 400 },
      );
    }

    // Optional filters
    const updatedBy = searchParams.get("updatedBy") ?? undefined;
    const action = searchParams.get("action") ?? undefined;

    // Pagination — default limit is higher (50) since this is a timeline view
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const limit = Math.min(
      200,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10)),
    );
    const skip = (page - 1) * limit;

    // Verify complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, title: true, status: true },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: `Complaint with id ${complaintId} not found` },
        { status: 404 },
      );
    }

    const where = {
      complaintId,
      ...(updatedBy ? { updatedBy } : {}),
      ...(action ? { action } : {}),
    };

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" }, // Chronological — oldest first for timeline rendering
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: entries,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        complaint: {
          id: complaint.id,
          title: complaint.title,
          status: complaint.status,
        },
      },
    });
  } catch (error) {
    console.error("[GET /api/audit-log]", error);
    return NextResponse.json(
      { error: "Failed to fetch audit log" },
      { status: 500 },
    );
  }
}
