import { NextResponse, NextRequest } from "next/server";
import { startEscalationCron } from "@/lib/cron-scheduler";

/**
 * GET /api/cron/init
 * 
 * Initializes the cron scheduler for escalation checks.
 * Should be called once when the server starts.
 * Can optionally require a secret for protection.
 */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if CRON_SECRET is set
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    startEscalationCron();

    return NextResponse.json({
      status: "success",
      message: "Escalation cron job initialized",
    });
  } catch (error) {
    console.error("[GET /api/cron/init]", error);
    return NextResponse.json(
      { error: "Failed to initialize cron job" },
      { status: 500 }
    );
  }
}
