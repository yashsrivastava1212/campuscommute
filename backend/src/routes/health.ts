import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { getEmailDeliveryStatus } from "../lib/email.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "campuscommute-api",
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health/email", async () => {
    const email = getEmailDeliveryStatus();
    return {
      status: email.canDeliverToGimInbox ? "ready" : "misconfigured",
      ...email,
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/health/ready", async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return {
        status: "ready",
        database: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      });
    }
  });
}
