import { prisma } from "@/lib/prisma";
import { EscalationLevel, Position, OfficerStatus } from "@prisma/client";

// ─── Hierarchy Maps ──────────────────────────────────────────────────────────

/** Ordered position hierarchy (lowest → highest). */
const POSITION_HIERARCHY: Position[] = [
  Position.JUNIOR,
  Position.SENIOR,
  Position.SUPERVISOR,
  Position.MANAGER,
  Position.DIRECTOR,
];

/** Ordered escalation levels (lowest → highest). */
const ESCALATION_HIERARCHY: EscalationLevel[] = [
  EscalationLevel.LEVEL_1,
  EscalationLevel.LEVEL_2,
  EscalationLevel.LEVEL_3,
  EscalationLevel.LEVEL_4,
  EscalationLevel.LEVEL_5,
];

/**
 * Returns the next position in the hierarchy, or `null` if already at the top.
 */
function getNextPosition(current: Position | null): Position | null {
  if (!current) return Position.SENIOR; // default: escalate to SENIOR
  const idx = POSITION_HIERARCHY.indexOf(current);
  if (idx === -1 || idx >= POSITION_HIERARCHY.length - 1) return null;
  return POSITION_HIERARCHY[idx + 1];
}

/**
 * Returns the next escalation level, capped at LEVEL_5.
 */
function getNextEscalationLevel(current: EscalationLevel): EscalationLevel {
  const idx = ESCALATION_HIERARCHY.indexOf(current);
  if (idx === -1 || idx >= ESCALATION_HIERARCHY.length - 1) {
    return EscalationLevel.LEVEL_5;
  }
  return ESCALATION_HIERARCHY[idx + 1];
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface OverdueAssignment {
  id: string;
  complaintId: string;
  officerId: string;
  deadline: Date;
}

interface EscalationResult {
  assignmentId: string;
  complaintId: string;
  fromOfficerId: string;
  toOfficerId: string | null;
  newEscalationLevel: EscalationLevel;
  success: boolean;
  reason?: string;
}

// ─── Main Logic ──────────────────────────────────────────────────────────────

/**
 * Scans for overdue `ComplaintAssignment` records and escalates them:
 *  1. Marks the current assignment with outcome = ESCALATED, relievedAt = now.
 *  2. Bumps the complaint's escalationLevel to the next level.
 *  3. Finds a superior officer in the same department and creates a new assignment.
 *  4. Logs an AuditLog entry.
 *
 * Returns an array of results describing what happened for each overdue assignment.
 */
export async function runEscalationCheck(): Promise<EscalationResult[]> {
  const now = new Date();
  const results: EscalationResult[] = [];

  // 1. Find all overdue assignments (deadline passed, not yet resolved/relieved)
  const overdueAssignments = await prisma.$queryRaw<OverdueAssignment[]>`
    SELECT "id", "complaintId", "officerId", "deadline"
    FROM "complaint_assignments"
    WHERE "deadline" < ${now}
      AND "outcome" IS NULL
      AND "relievedAt" IS NULL
  `;

  if (overdueAssignments.length === 0) {
    console.log("[ESCALATION] No overdue assignments found.");
    return results;
  }

  console.log(
    `[ESCALATION] Found ${overdueAssignments.length} overdue assignment(s).`
  );

  for (const assignment of overdueAssignments) {
    try {
      const result = await escalateSingleAssignment(assignment, now);
      results.push(result);
    } catch (error) {
      console.error(
        `[ESCALATION] Failed to escalate assignment ${assignment.id}:`,
        error
      );
      results.push({
        assignmentId: assignment.id,
        complaintId: assignment.complaintId,
        fromOfficerId: assignment.officerId,
        toOfficerId: null,
        newEscalationLevel: EscalationLevel.LEVEL_1,
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(
    `[ESCALATION] Completed: ${successCount}/${results.length} escalated successfully.`
  );

  return results;
}

/**
 * Escalates a single overdue assignment.
 */
async function escalateSingleAssignment(
  assignment: OverdueAssignment,
  now: Date
): Promise<EscalationResult> {
  // Fetch the current officer's details
  const currentOfficer = await prisma.officer.findUnique({
    where: { id: assignment.officerId },
    select: { id: true, position: true, departmentId: true, name: true },
  });

  if (!currentOfficer) {
    return {
      assignmentId: assignment.id,
      complaintId: assignment.complaintId,
      fromOfficerId: assignment.officerId,
      toOfficerId: null,
      newEscalationLevel: EscalationLevel.LEVEL_1,
      success: false,
      reason: "Current officer not found",
    };
  }

  // Fetch the complaint for its current escalation level
  const complaint = await prisma.complaint.findUnique({
    where: { id: assignment.complaintId },
    select: { id: true, escalationLevel: true, departmentId: true },
  });

  if (!complaint) {
    return {
      assignmentId: assignment.id,
      complaintId: assignment.complaintId,
      fromOfficerId: assignment.officerId,
      toOfficerId: null,
      newEscalationLevel: EscalationLevel.LEVEL_1,
      success: false,
      reason: "Complaint not found",
    };
  }

  // Determine superior position and next escalation level
  const nextPosition = getNextPosition(currentOfficer.position);
  const nextEscalationLevel = getNextEscalationLevel(complaint.escalationLevel);

  // Find a superior officer in the same department
  let superiorOfficer = null;

  if (nextPosition) {
    // First try: exact next position in the same department
    superiorOfficer = await prisma.officer.findFirst({
      where: {
        departmentId: currentOfficer.departmentId,
        position: nextPosition,
        status: OfficerStatus.ACTIVE,
        id: { not: currentOfficer.id },
      },
      select: { id: true, name: true, position: true },
    });

    // Fallback: any ACTIVE officer with a higher rank in the same department
    if (!superiorOfficer) {
      const currentPosIdx = currentOfficer.position
        ? POSITION_HIERARCHY.indexOf(currentOfficer.position)
        : -1;
      const higherPositions = POSITION_HIERARCHY.slice(currentPosIdx + 1);

      if (higherPositions.length > 0) {
        superiorOfficer = await prisma.officer.findFirst({
          where: {
            departmentId: currentOfficer.departmentId,
            position: { in: higherPositions },
            status: OfficerStatus.ACTIVE,
            id: { not: currentOfficer.id },
          },
          orderBy: { position: "asc" }, // pick the closest higher rank
          select: { id: true, name: true, position: true },
        });
      }
    }
  }

  // ── Step 1: Mark the current assignment as ESCALATED ──
  await prisma.$executeRaw`
    UPDATE "complaint_assignments"
    SET "outcome" = 'ESCALATED'::"AssignmentOutcome",
        "relievedAt" = ${now}
    WHERE "id" = ${assignment.id}
  `;

  // ── Step 2: Bump the complaint's escalation level ──
  await prisma.complaint.update({
    where: { id: assignment.complaintId },
    data: { escalationLevel: nextEscalationLevel },
  });

  // ── Step 3: Create new assignment for the superior (if found) ──
  let newAssignmentOfficerId: string | null = null;

  if (superiorOfficer) {
    newAssignmentOfficerId = superiorOfficer.id;
    const newDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const newAssignmentId = `ca_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await prisma.$executeRaw`
      INSERT INTO "complaint_assignments"
        ("id", "complaintId", "officerId", "assignedBy", "assignedAt", "deadline")
      VALUES
        (${newAssignmentId}, ${assignment.complaintId}, ${superiorOfficer.id}, ${"system-escalation"}, ${now}, ${newDeadline})
    `;

    // Also update the complaint's assignedOfficerId to the new superior
    await prisma.complaint.update({
      where: { id: assignment.complaintId },
      data: {
        assignedOfficerId: superiorOfficer.id,
        assignedAt: now,
      },
    });

    console.log(
      `[ESCALATION] Assignment ${assignment.id}: escalated from ${currentOfficer.name} (${currentOfficer.position}) → ${superiorOfficer.name} (${superiorOfficer.position})`
    );
  } else {
    console.warn(
      `[ESCALATION] Assignment ${assignment.id}: no superior found for ${currentOfficer.name} (${currentOfficer.position}) in department ${currentOfficer.departmentId}. Complaint escalation level bumped but no reassignment made.`
    );
  }

  // ── Step 4: Audit log ──
  await prisma.auditLog
    .create({
      data: {
        complaintId: assignment.complaintId,
        updatedBy: "system",
        action: "escalated",
        oldValue: JSON.stringify({
          officerId: currentOfficer.id,
          officerName: currentOfficer.name,
          position: currentOfficer.position,
          escalationLevel: complaint.escalationLevel,
        }),
        newValue: JSON.stringify({
          officerId: newAssignmentOfficerId,
          officerName: superiorOfficer?.name ?? null,
          position: superiorOfficer?.position ?? null,
          escalationLevel: nextEscalationLevel,
        }),
        metadata: {
          trigger: "deadline_expired",
          originalDeadline: assignment.deadline.toISOString(),
          escalatedAt: now.toISOString(),
        },
      },
    })
    .catch((auditError) => {
      console.error(
        `[ESCALATION] Audit log write failed for assignment ${assignment.id}:`,
        auditError
      );
    });

  return {
    assignmentId: assignment.id,
    complaintId: assignment.complaintId,
    fromOfficerId: currentOfficer.id,
    toOfficerId: newAssignmentOfficerId,
    newEscalationLevel: nextEscalationLevel,
    success: true,
  };
}
