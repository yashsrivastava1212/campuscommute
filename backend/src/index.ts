import "./env.js";
import { startOtpCleanupJob } from "./jobs/otp-cleanup.js";
import { startLifecycleJobs } from "./jobs/lifecycle.js";
import { getEmailDeliveryStatus, getResendApiKey } from "./lib/email.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function start() {
  if (process.env.NODE_ENV === "production") {
    const { runProductionSetup } = await import("./db/prepare.js");
    await runProductionSetup();
  }

  const { buildServer } = await import("./server.js");
  const app = await buildServer();
  startOtpCleanupJob();
  startLifecycleJobs();

  const emailStatus = getEmailDeliveryStatus();
  if (emailStatus.canDeliverToGimInbox) {
    console.log(`[OK] Resend configured — sending from ${emailStatus.fromEmail}`);
  } else {
    console.warn(`[WARN] Email delivery not ready: ${emailStatus.guidance}`);
  }

  if (!getResendApiKey() && process.env.ALLOW_DEV_OTP === "true") {
    console.warn("[WARN] ALLOW_DEV_OTP=true — OTP may appear on screen when email fails");
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`API running at http://${HOST}:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export { buildServer } from "./server.js";
