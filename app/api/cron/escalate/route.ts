import { NextResponse, NextRequest } from "next/server";
import { runEscalationCheck } from "@/lib/escalation";

/**
 * POST /api/cron/escalate
 *
 * Manually triggers the deadline-escalation check.
 * Protected by a shared secret via the `x-cron-secret` header.
 */
export async function POST(request: NextRequest) {
  try {
    // Simple secret-based protection
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const headerSecret = request.headers.get("x-cron-secret");
      if (headerSecret !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const results = await runEscalationCheck();

    const escalated = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: "Escalation check completed",
      summary: {
        total: results.length,
        escalated,
        failed,
      },
      results,
    });
  } catch (error) {
    console.error("[POST /api/cron/escalate]", error);
    return NextResponse.json(
      { error: "Escalation check failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/escalate — Health check for escalation endpoint.
 */
export async function GET() {
  return NextResponse.json({
    message: "Escalation cron endpoint is active. Use POST to trigger.",
  });
}
