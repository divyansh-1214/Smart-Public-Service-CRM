import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

enum AssignmentOutcome {
	REASSIGNED = "REASSIGNED",
	ESCALATED = "ESCALATED",
	RESOLVED = "RESOLVED",
	SELF_WITHDRAWN = "SELF_WITHDRAWN",
	ADMIN_REMOVED = "ADMIN_REMOVED",
}

const getAssignmentsQuerySchema = z
	.object({
		assignmentId: z.string().cuid().optional(),
		complaintId: z.string().cuid().optional(),
		officerId: z.string().cuid().optional(),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
	})
	.refine(
		(value) =>
			!value.assignmentId ||
			(!value.complaintId && !value.officerId),
		{
			message:
				"When assignmentId is provided, complaintId/officerId filters are not allowed",
			path: ["assignmentId"],
		}
	);

const patchAssignmentSchema = z
	.object({
		assignmentId: z.string().cuid(),
		outcome: z.nativeEnum(AssignmentOutcome).optional(),
		performanceNote: z.string().trim().max(2000).nullable().optional(),
		relievedAt: z.union([z.string().datetime(), z.null()]).optional(),
		deadline: z.union([z.string().datetime(), z.null()]).optional(),
		assignedBy: z.string().trim().min(1).max(120).nullable().optional(),
	})
	.refine(
		(value) =>
			value.outcome !== undefined ||
			value.performanceNote !== undefined ||
			value.relievedAt !== undefined ||
			value.deadline !== undefined ||
			value.assignedBy !== undefined,
		{
			message:
				"Provide at least one field to update: outcome, performanceNote, relievedAt, deadline, or assignedBy",
			path: ["outcome"],
		}
	);

type AssignmentRow = {
	id: string;
	complaintId: string;
	officerId: string;
	assignedBy: string | null;
	assignedAt: Date;
	relievedAt: Date | null;
	outcome: string | null;
	performanceNote: string | null;
	deadline: Date | null;
};

const complaintAssignmentDelegate = (prisma as unknown as {
	complaintAssignment?: {
		findUnique: (args: {
			where: { id: string };
			select: {
				id: true;
				complaintId: true;
				officerId: true;
				assignedBy: true;
				assignedAt: true;
				relievedAt: true;
				outcome: true;
				performanceNote: true;
				deadline: true;
			};
		}) => Promise<AssignmentRow | null>;
		findMany: (args: {
			where?: {
				complaintId?: string;
				officerId?: string;
			};
			select: {
				id: true;
				complaintId: true;
				officerId: true;
				assignedBy: true;
				assignedAt: true;
				relievedAt: true;
				outcome: true;
				performanceNote: true;
				deadline: true;
			};
			skip?: number;
			take?: number;
			orderBy: { assignedAt: "asc" | "desc" };
		}) => Promise<AssignmentRow[]>;
		count: (args: {
			where?: {
				complaintId?: string;
				officerId?: string;
			};
		}) => Promise<number>;
		update: (args: {
			where: { id: string };
			data: {
				outcome?: AssignmentOutcome;
				performanceNote?: string | null;
				relievedAt?: Date | null;
				deadline?: Date | null;
				assignedBy?: string | null;
			};
			select: {
				id: true;
				complaintId: true;
				officerId: true;
				assignedBy: true;
				assignedAt: true;
				relievedAt: true;
				outcome: true;
				performanceNote: true;
				deadline: true;
			};
		}) => Promise<AssignmentRow>;
	};
}).complaintAssignment;

const assignmentSelect = {
	id: true,
	complaintId: true,
	officerId: true,
	assignedBy: true,
	assignedAt: true,
	relievedAt: true,
	outcome: true,
	performanceNote: true,
	deadline: true,
} as const;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = getAssignmentsQuerySchema.safeParse({
			assignmentId: searchParams.get("assignmentId") ?? undefined,
			complaintId: searchParams.get("complaintId") ?? undefined,
			officerId: searchParams.get("officerId") ?? undefined,
			page: searchParams.get("page") ?? undefined,
			limit: searchParams.get("limit") ?? undefined,
		});

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid query parameters", issues: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const { assignmentId, complaintId, officerId, page, limit } = parsed.data;

		if (assignmentId) {
			if (complaintAssignmentDelegate?.findUnique) {
				const record = await complaintAssignmentDelegate.findUnique({
					where: { id: assignmentId },
					select: assignmentSelect,
				});

				if (!record) {
					return NextResponse.json(
						{ error: "Assignment record not found" },
						{ status: 404 }
					);
				}

				return NextResponse.json({ data: record }, { status: 200 });
			}

			const rows = await prisma.$queryRaw<AssignmentRow[]>`
				SELECT
					"id",
					"complaintId",
					"officerId",
					"assignedBy",
					"assignedAt",
					"relievedAt",
					"outcome",
					"performanceNote",
					"deadline"
				FROM "complaint_assignments"
				WHERE "id" = ${assignmentId}
				LIMIT 1
			`;

			const record = rows[0];
			if (!record) {
				return NextResponse.json(
					{ error: "Assignment record not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json({ data: record }, { status: 200 });
		}

		const where: { complaintId?: string; officerId?: string } = {};
		if (complaintId) where.complaintId = complaintId;
		if (officerId) where.officerId = officerId;

		const skip = (page - 1) * limit;

		if (
			complaintAssignmentDelegate?.findMany &&
			complaintAssignmentDelegate?.count
		) {
			const [rows, total] = await Promise.all([
				complaintAssignmentDelegate.findMany({
					where,
					select: assignmentSelect,
					skip,
					take: limit,
					orderBy: { assignedAt: "desc" },
				}),
				complaintAssignmentDelegate.count({ where }),
			]);

			return NextResponse.json(
				{
					data: rows,
					meta: {
						total,
						page,
						limit,
						totalPages: Math.max(1, Math.ceil(total / limit)),
					},
				},
				{ status: 200 }
			);
		}

		const filters: Prisma.Sql[] = [];
		if (complaintId) {
			filters.push(Prisma.sql`"complaintId" = ${complaintId}`);
		}
		if (officerId) {
			filters.push(Prisma.sql`"officerId" = ${officerId}`);
		}
		const whereClause = filters.length
			? Prisma.sql`WHERE ${Prisma.join(filters, " AND ")}`
			: Prisma.empty;

		const rows = await prisma.$queryRaw<AssignmentRow[]>`
			SELECT
				"id",
				"complaintId",
				"officerId",
				"assignedBy",
				"assignedAt",
				"relievedAt",
				"outcome",
				"performanceNote",
				"deadline"
			FROM "complaint_assignments"
			${whereClause}
			ORDER BY "assignedAt" DESC
			OFFSET ${skip}
			LIMIT ${limit}
		`;

		const countRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
			SELECT COUNT(*)::bigint AS "total"
			FROM "complaint_assignments"
			${whereClause}
		`;

		const total = Number(countRows[0]?.total ?? 0);

		return NextResponse.json(
			{
				data: rows,
				meta: {
					total,
					page,
					limit,
					totalPages: Math.max(1, Math.ceil(total / limit)),
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("[GET /api/complain-assign]", error);
		return NextResponse.json(
			{ error: "Failed to fetch complaint assignments" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const authz = await requireRole([Role.ADMIN]);
		if (!authz.ok) {
			return authz.response;
		}

		const body = await request.json().catch(() => null);
		const parsed = patchAssignmentSchema.safeParse(body ?? {});

		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid update payload", issues: parsed.error.flatten() },
				{ status: 400 }
			);
		}

		const {
			assignmentId,
			outcome,
			performanceNote,
			relievedAt,
			deadline,
			assignedBy,
		} = parsed.data;

		const updateData: {
			outcome?: AssignmentOutcome;
			performanceNote?: string | null;
			relievedAt?: Date | null;
			deadline?: Date | null;
			assignedBy?: string | null;
		} = {};

		if (outcome !== undefined) updateData.outcome = outcome;
		if (performanceNote !== undefined) updateData.performanceNote = performanceNote;
		if (relievedAt !== undefined)
			updateData.relievedAt = relievedAt ? new Date(relievedAt) : null;
		if (deadline !== undefined)
			updateData.deadline = deadline ? new Date(deadline) : null;
		if (assignedBy !== undefined) updateData.assignedBy = assignedBy;

		if (complaintAssignmentDelegate?.update) {
			let updated: AssignmentRow;
			try {
				updated = await complaintAssignmentDelegate.update({
					where: { id: assignmentId },
					data: updateData,
					select: assignmentSelect,
				});
			} catch {
				return NextResponse.json(
					{ error: "Assignment record not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json(
				{
					message: "Complaint assignment updated successfully",
					data: updated,
				},
				{ status: 200 }
			);
		}

		const existing = await prisma.$queryRaw<Array<{ id: string }>>`
			SELECT "id"
			FROM "complaint_assignments"
			WHERE "id" = ${assignmentId}
			LIMIT 1
		`;

		if (!existing[0]) {
			return NextResponse.json(
				{ error: "Assignment record not found" },
				{ status: 404 }
			);
		}

		if (outcome !== undefined) {
			await prisma.$executeRaw`
				UPDATE "complaint_assignments"
				SET "outcome" = ${outcome}::"AssignmentOutcome"
				WHERE "id" = ${assignmentId}
			`;
		}

		if (performanceNote !== undefined) {
			await prisma.$executeRaw`
				UPDATE "complaint_assignments"
				SET "performanceNote" = ${performanceNote}
				WHERE "id" = ${assignmentId}
			`;
		}

		if (relievedAt !== undefined) {
			await prisma.$executeRaw`
				UPDATE "complaint_assignments"
				SET "relievedAt" = ${relievedAt ? new Date(relievedAt) : null}
				WHERE "id" = ${assignmentId}
			`;
		}

		if (deadline !== undefined) {
			await prisma.$executeRaw`
				UPDATE "complaint_assignments"
				SET "deadline" = ${deadline ? new Date(deadline) : null}
				WHERE "id" = ${assignmentId}
			`;
		}

		if (assignedBy !== undefined) {
			await prisma.$executeRaw`
				UPDATE "complaint_assignments"
				SET "assignedBy" = ${assignedBy}
				WHERE "id" = ${assignmentId}
			`;
		}

		const updatedRows = await prisma.$queryRaw<AssignmentRow[]>`
			SELECT
				"id",
				"complaintId",
				"officerId",
				"assignedBy",
				"assignedAt",
				"relievedAt",
				"outcome",
				"performanceNote",
				"deadline"
			FROM "complaint_assignments"
			WHERE "id" = ${assignmentId}
			LIMIT 1
		`;

		return NextResponse.json(
			{
				message: "Complaint assignment updated successfully",
				data: updatedRows[0] ?? null,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("[PATCH /api/complain-assign]", error);
		return NextResponse.json(
			{ error: "Failed to update complaint assignment" },
			{ status: 500 }
		);
	}
}
