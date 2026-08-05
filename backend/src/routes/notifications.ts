import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/notifications",
    { preHandler: authenticate },
    async (request, reply) => {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, request.user!.sub))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      const unread = rows.filter((n) => !n.isRead).length;
      return reply.send({ notifications: rows, unreadCount: unread });
    }
  );

  app.patch(
    "/api/v1/notifications/:id/read",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, id));
      return reply.send({ read: true });
    }
  );
}
