import cron from "node-cron";
import type { ScheduledTask } from "node-cron";

let cronJob: ScheduledTask | null = null;

/**
 * Starts the escalation cron job
 * Runs every minute to check for escalations
 */
export function startEscalationCron() {
  if (cronJob) {
    console.log("[CRON] Escalation cron job already running");
    return;
  }

  const cronSecret = process.env.CRON_SECRET || "";
  
  cronJob = cron.schedule("*/1 * * * *", async () => {
    try {
      console.log("[CRON] Running escalation check...");
      
      const baseUrl = process.env.NEXTAUTH_URL || 
                     process.env.NEXT_PUBLIC_APP_URL ||
                     "http://localhost:3000";

      const response = await fetch(`${baseUrl}/api/cron/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": cronSecret,
        },
      });

      if (!response.ok) {
        console.error(`[CRON] Escalation check failed: ${response.status}`);
        return;
      }

      const result = await response.json();
      console.log("[CRON] Escalation check completed:", result.summary);
    } catch (error) {
      console.error("[CRON] Escalation check error:", error);
    }
  });

  console.log("[CRON] Escalation cron job started (every 1 minute)");
}

/**
 * Stops the escalation cron job
 */
export function stopEscalationCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[CRON] Escalation cron job stopped");
  }
}
