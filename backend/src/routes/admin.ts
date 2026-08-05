import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { auditLogs, carpools, reports, users } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import { clearActiveCarpoolForMembers } from "../services/carpool.service.js";

const reportSchema = z.object({
  carpoolId: z.string().uuid().optional(),
  reportedUserId: z.string().uuid().optional(),
  reason: z.string().min(10).max(1000),
});

export async function adminRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/reports",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = reportSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid report" });

      const [report] = await db
        .insert(reports)
        .values({
          reporterId: request.user!.sub,
          carpoolId: parsed.data.carpoolId,
          reportedUserId: parsed.data.reportedUserId,
          reason: parsed.data.reason,
        })
        .returning();

      return reply.status(201).send(report);
    }
  );

  app.get("/api/v1/admin/reports", { preHandler: requireAdmin }, async (_request, reply) => {
    const rows = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
    return reply.send({ reports: rows });
  });

  app.post(
    "/api/v1/admin/carpools/:id/cancel",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [updated] = await db
        .update(carpools)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(carpools.id, id))
        .returning();

      await clearActiveCarpoolForMembers(id);
      await db.insert(auditLogs).values({
        actorId: request.user!.sub,
        action: "ADMIN_CANCEL_CARPOOL",
        targetType: "carpool",
        targetId: id,
      });

      return reply.send(updated);
    }
  );

  app.post(
    "/api/v1/admin/users/:id/ban",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await db.update(users).set({ isBanned: true, updatedAt: new Date() }).where(eq(users.id, id));
      await db.insert(auditLogs).values({
        actorId: request.user!.sub,
        action: "ADMIN_BAN_USER",
        targetType: "user",
        targetId: id,
      });
      return reply.send({ banned: true });
    }
  );

  app.patch(
    "/api/v1/admin/reports/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: "REVIEWED" | "DISMISSED" | "ACTIONED" };
      const [updated] = await db
        .update(reports)
        .set({ status })
        .where(eq(reports.id, id))
        .returning();
      return reply.send(updated);
    }
  );
}
