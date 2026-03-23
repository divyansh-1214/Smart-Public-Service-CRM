import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// ── Validation Schema ─────────────────────────────────────────────────────────

const patchLeaveSchema = z
  .object({
    approved: z.boolean().optional(),
    startDate: z.coerce
      .date({ message: "startDate must be a valid ISO date" })
      .optional(),
    endDate: z.coerce
      .date({ message: "endDate must be a valid ISO date" })
      .optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided to update",
  })
  .refine(
    (d) => {
      // Only validate date ordering when both are explicitly provided
      if (d.startDate && d.endDate) return d.endDate >= d.startDate;
      return true;
    },
    {
      message: "endDate must be on or after startDate",
      path: ["endDate"],
    },
  );

// ── PATCH /api/officer/leave/[id] ─────────────────────────────────────────────
//
// Body (all optional, at least one required):
//   approved    boolean — approve or revoke approval
//   startDate   ISO date string
//   endDate     ISO date string (must be >= startDate if both supplied)
//   reason      string max 500 chars

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const parsed = patchLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updates = parsed.data;

    // Verify leave record exists
    const existing = await prisma.officerLeave.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Officer leave record with id ${id} not found` },
        { status: 404 },
      );
    }

    // Resolve effective dates (merge patch values over existing)
    const effectiveStart = updates.startDate ?? existing.startDate;
    const effectiveEnd = updates.endDate ?? existing.endDate;

    // Check merged dates are still valid
    if (effectiveEnd < effectiveStart) {
      return NextResponse.json(
        { error: "endDate must be on or after startDate" },
        { status: 400 },
      );
    }

    // If dates are changing, check for overlaps with other leaves for the same officer
    const datesChanging =
      updates.startDate !== undefined || updates.endDate !== undefined;

    if (datesChanging) {
      const overlap = await prisma.officerLeave.findFirst({
        where: {
          officerId: existing.officerId,
          id: { not: id }, // Exclude the record itself
          AND: [
            { startDate: { lte: effectiveEnd } },
            { endDate: { gte: effectiveStart } },
          ],
        },
      });

      if (overlap) {
        return NextResponse.json(
          {
            error:
              "Updated dates overlap with another existing leave for this officer",
            conflictingLeaveId: overlap.id,
            conflictingPeriod: {
              startDate: overlap.startDate,
              endDate: overlap.endDate,
            },
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.officerLeave.update({
      where: { id },
      data: {
        ...(updates.approved !== undefined && { approved: updates.approved }),
        ...(updates.startDate !== undefined && { startDate: updates.startDate }),
        ...(updates.endDate !== undefined && { endDate: updates.endDate }),
        ...(updates.reason !== undefined && { reason: updates.reason }),
      },
      include: {
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[PATCH /api/officer/leave/[id]]", error);
    return NextResponse.json(
      { error: "Failed to update leave record" },
      { status: 500 },
    );
  }
}
