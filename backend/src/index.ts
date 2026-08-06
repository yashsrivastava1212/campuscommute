import "./env.js";
import { startOtpCleanupJob } from "./jobs/otp-cleanup.js";
import { startLifecycleJobs } from "./jobs/lifecycle.js";

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

  if (process.env.RESEND_API_KEY?.startsWith("re_")) {
    console.log("[OK] Resend configured — OTP emails will be sent via Resend");
  } else {
    console.warn(
      "[WARN] RESEND_API_KEY missing — OTP will use demo mode (on-screen code)"
    );
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
