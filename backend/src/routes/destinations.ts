import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { destinations } from "../db/schema.js";

export async function destinationRoutes(app: FastifyInstance) {
  app.get("/api/v1/destinations", async (_request, reply) => {
    const rows = await db
      .select({
        id: destinations.id,
        name: destinations.name,
        slug: destinations.slug,
        category: destinations.category,
      })
      .from(destinations)
      .where(eq(destinations.isActive, true));

    rows.sort((a, b) => {
      const order = ["campus", "airport", "railway", "bus_stand", "other"];
      const ai = order.indexOf(a.category);
      const bi = order.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    });

    return reply.send({ destinations: rows });
  });
}
