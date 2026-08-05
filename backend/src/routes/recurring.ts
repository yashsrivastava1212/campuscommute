import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { recurringTemplates } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

const templateSchema = z.object({
  destination: z.string().min(2),
  destinationId: z.string().uuid().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/),
  totalSeats: z.number().int().min(2).max(8).default(4),
});

export async function recurringRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/recurring-templates",
    { preHandler: authenticate },
    async (request, reply) => {
      const rows = await db
        .select()
        .from(recurringTemplates)
        .where(eq(recurringTemplates.userId, request.user!.sub));
      return reply.send({ templates: rows });
    }
  );

  app.post(
    "/api/v1/recurring-templates",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = templateSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid template" });

      const [template] = await db
        .insert(recurringTemplates)
        .values({
          userId: request.user!.sub,
          ...parsed.data,
        })
        .returning();

      return reply.status(201).send(template);
    }
  );

  app.patch(
    "/api/v1/recurring-templates/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { isActive } = request.body as { isActive: boolean };

      const [updated] = await db
        .update(recurringTemplates)
        .set({ isActive })
        .where(eq(recurringTemplates.id, id))
        .returning();

      return reply.send(updated);
    }
  );
}
