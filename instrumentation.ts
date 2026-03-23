/**
 * Next.js Instrumentation Hook
 * 
 * This file is auto-detected by Next.js and the `register()` function
 * is called once when the server process starts. We use it to schedule
 * the deadline-escalation cron job via node-cron.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const cron = await import("node-cron");
    const { runEscalationCheck } = await import("./lib/escalation");

    // Run every 15 minutes
    cron.default.schedule("*/15 * * * *", async () => {
      const timestamp = new Date().toISOString();
      console.log(`[CRON ${timestamp}] Running escalation check...`);
      try {
        const results = await runEscalationCheck();
        const escalated = results.filter((r) => r.success).length;
        console.log(
          `[CRON ${timestamp}] Escalation check complete: ${escalated}/${results.length} escalated.`
        );
      } catch (error) {
        console.error(`[CRON ${timestamp}] Escalation check failed:`, error);
      }
    });

    console.log("[INSTRUMENTATION] Escalation cron job scheduled (every 15 min).");
  }
}
