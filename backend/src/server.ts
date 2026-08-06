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

function parseCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[WARN] CORS_ORIGIN is not set — browser requests from the frontend will be blocked"
      );
      return [];
    }
    return ["http://localhost:3000"];
  }
  if (raw === "*") return true;
  return raw.split(",").map((origin) => origin.trim()).filter(Boolean);
}

export async function buildServer() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
  });

  await app.register(cors, {
    origin: parseCorsOrigins(),
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
