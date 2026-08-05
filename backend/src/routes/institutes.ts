import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { destinations, institutes } from "../db/schema.js";
import { requireAdmin } from "../middleware/admin.js";

const instituteSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  emailDomain: z.string().min(3),
});

export async function instituteRoutes(app: FastifyInstance) {
  app.get("/api/v1/institutes", async (_request, reply) => {
    const rows = await db.select().from(institutes).where(eq(institutes.isActive, true));
    return reply.send({ institutes: rows });
  });

  app.post(
    "/api/v1/admin/institutes",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = instituteSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid institute" });

      const [institute] = await db.insert(institutes).values(parsed.data).returning();
      return reply.status(201).send(institute);
    }
  );

  app.get("/api/v1/institutes/:code/destinations", async (request, reply) => {
    const { code } = request.params as { code: string };
    const [institute] = await db.select().from(institutes).where(eq(institutes.code, code)).limit(1);
    if (!institute) return reply.status(404).send({ message: "Institute not found" });

    const rows = await db
      .select()
      .from(destinations)
      .where(eq(destinations.instituteId, institute.id));

    return reply.send({ destinations: rows });
  });
}
