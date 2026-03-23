import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ComplaintStatus, EscalationLevel } from "@prisma/client";

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period counts
    const [
      total,
      open,
      overdue,
      escalated,
      resolved
    ] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({
        where: {
          status: {
            in: [ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.complaint.count({
        where: { slaBreached: true }
      }),
      prisma.complaint.count({
        where: {
          escalationLevel: {
            not: EscalationLevel.LEVEL_1
          }
        }
      }),
      prisma.complaint.count({
        where: {
          status: {
            in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]
          }
        }
      })
    ]);

    // Previous period counts for trend calculation
    const [
      prevTotal,
      prevOpen,
      prevOverdue,
      prevResolved
    ] = await Promise.all([
      prisma.complaint.count({
        where: { createdAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo } }
      }),
      prisma.complaint.count({
        where: {
          createdAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
          status: {
            in: [ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.complaint.count({
        where: {
          createdAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
          slaBreached: true
        }
      }),
      prisma.complaint.count({
        where: {
          createdAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
          status: {
            in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]
          }
        }
      })
    ]);

    // Trend calculation
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const diff = ((current - previous) / previous) * 100;
      return `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`;
    };

    return NextResponse.json({
      data: {
        total,
        open,
        overdue,
        escalated,
        resolved,
        trends: {
          total: calculateTrend(total, prevTotal),
          open: calculateTrend(open, prevOpen),
          overdue: calculateTrend(overdue, prevOverdue),
          resolved: calculateTrend(resolved, prevResolved),
        }
      }
    });
  } catch (error) {
    console.error("[GET /api/dashboard/stats]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
