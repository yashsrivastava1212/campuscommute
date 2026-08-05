import "./env.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { destinationRoutes } from "./routes/destinations.js";
import { carpoolRoutes } from "./routes/carpools.js";
import { joinRequestRoutes } from "./routes/join-requests.js";
import { discussionRoutes } from "./routes/discussion.js";
import { notificationRoutes } from "./routes/notifications.js";
import { mergeRoutes } from "./routes/merge.js";
import { adminRoutes } from "./routes/admin.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { transportRoutes } from "./routes/transport.js";
import { recurringRoutes } from "./routes/recurring.js";
import { instituteRoutes } from "./routes/institutes.js";
import { startOtpCleanupJob } from "./jobs/otp-cleanup.js";
import { startLifecycleJobs } from "./jobs/lifecycle.js";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

async function buildServer() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(destinationRoutes);
  await app.register(carpoolRoutes);
  await app.register(joinRequestRoutes);
  await app.register(discussionRoutes);
  await app.register(notificationRoutes);
  await app.register(mergeRoutes);
  await app.register(adminRoutes);
  await app.register(analyticsRoutes);
  await app.register(transportRoutes);
  await app.register(recurringRoutes);
  await app.register(instituteRoutes);

  app.get("/", async () => ({
    name: "CampusCommute API",
    version: "0.2.0",
    docs: "/api/v1",
  }));

  return app;
}

async function start() {
  const app = await buildServer();
  startOtpCleanupJob();
  startLifecycleJobs();

  if (process.env.RESEND_API_KEY?.startsWith("re_")) {
    console.log("[OK] Resend configured — OTP emails will be sent via Resend");
  } else {
    console.warn(
      "[WARN] RESEND_API_KEY missing in .env — OTP will use demo mode (on-screen code)"
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

start();

export { buildServer };
