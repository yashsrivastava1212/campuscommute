import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { carpools, mergeProposals } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { approveMerge, declineMerge } from "../services/merge.service.js";

export async function mergeRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/merge-proposals",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;
      const owned = await db.select({ id: carpools.id }).from(carpools).where(eq(carpools.ownerId, userId));
      const ownedIds = owned.map((c) => c.id);
      if (ownedIds.length === 0) return reply.send({ proposals: [] });

      const proposals = await db.select().from(mergeProposals).where(eq(mergeProposals.status, "PENDING"));

      const relevant = proposals.filter(
        (p) => ownedIds.includes(p.carpoolAId) || ownedIds.includes(p.carpoolBId)
      );

      return reply.send({ proposals: relevant });
    }
  );

  app.post(
    "/api/v1/merge-proposals/:id/approve",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = await approveMerge(id, request.user!.sub);
      if (!result) return reply.status(404).send({ message: "Proposal not found" });
      return reply.send(result);
    }
  );

  app.post(
    "/api/v1/merge-proposals/:id/decline",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await declineMerge(id, request.user!.sub);
      if (!ok) return reply.status(404).send({ message: "Proposal not found" });
      return reply.send({ declined: true });
    }
  );
}
