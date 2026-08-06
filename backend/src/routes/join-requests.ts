import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  carpoolMemberships,
  carpools,
  joinRequests,
  users,
} from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import {
  getMembership,
  postSystemMessage,
  transferOwnership,
} from "../services/carpool.service.js";
import { createNotification } from "../services/notification.service.js";

const patchJoinSchema = z.object({
  action: z.enum(["accept", "reject"]),
});

export async function joinRequestRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/carpools/:id/join-requests",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.sub;

      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });
      if (carpool.status !== "OPEN" || carpool.isLocked) {
        return reply.status(400).send({ message: "Carpool is not accepting join requests" });
      }
      if (new Date() >= carpool.joinCutoffAt) {
        return reply.status(400).send({ message: "Join requests closed for this carpool" });
      }
      if (carpool.seatsAvailable <= 0) {
        return reply.status(400).send({ message: "No seats available" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user?.activeCarpoolId) {
        return reply.status(409).send({ message: "You already belong to an active carpool" });
      }

      const existingMember = await getMembership(id, userId);
      if (existingMember) {
        return reply.status(409).send({ message: "You are already a member" });
      }

      const pending = await db
        .select()
        .from(joinRequests)
        .where(
          and(
            eq(joinRequests.carpoolId, id),
            eq(joinRequests.requesterId, userId),
            eq(joinRequests.status, "PENDING")
          )
        )
        .limit(1);

      if (pending.length > 0) {
        return reply.status(409).send({ message: "Join request already pending" });
      }

      const [jr] = await db
        .insert(joinRequests)
        .values({ carpoolId: id, requesterId: userId })
        .returning();

      const [requester] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      await createNotification({
        userId: carpool.ownerId,
        type: "JOIN_REQUEST",
        title: "New join request",
        body: `${requester?.displayName ?? "A student"} requested to join your carpool to ${carpool.destination}.`,
        metadata: { carpoolId: id, joinRequestId: jr.id },
      });

      return reply.status(201).send(jr);
    }
  );

  app.get(
    "/api/v1/carpools/:id/join-requests",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });
      if (carpool.ownerId !== request.user!.sub) {
        return reply.status(403).send({ message: "Owner only" });
      }

      const rows = await db
        .select({
          id: joinRequests.id,
          status: joinRequests.status,
          requestedAt: joinRequests.requestedAt,
          requesterId: joinRequests.requesterId,
          displayName: users.displayName,
        })
        .from(joinRequests)
        .innerJoin(users, eq(joinRequests.requesterId, users.id))
        .where(eq(joinRequests.carpoolId, id))
        .orderBy(desc(joinRequests.requestedAt));

      return reply.send({ joinRequests: rows });
    }
  );

  app.patch(
    "/api/v1/join-requests/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = patchJoinSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid action" });

      const [jr] = await db.select().from(joinRequests).where(eq(joinRequests.id, id)).limit(1);
      if (!jr || jr.status !== "PENDING") {
        return reply.status(404).send({ message: "Join request not found" });
      }

      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, jr.carpoolId)).limit(1);
      if (!carpool || carpool.ownerId !== request.user!.sub) {
        return reply.status(403).send({ message: "Owner only" });
      }

      if (parsed.data.action === "reject") {
        await db.update(joinRequests).set({ status: "REJECTED", updatedAt: new Date() }).where(eq(joinRequests.id, id));
        await createNotification({
          userId: jr.requesterId,
          type: "JOIN_REJECTED",
          title: "Join request rejected",
          body: `Your request to join the carpool to ${carpool.destination} was rejected.`,
          metadata: { carpoolId: carpool.id },
        });
        return reply.send({ status: "REJECTED" });
      }

      if (carpool.seatsAvailable <= 0) {
        return reply.status(400).send({ message: "No seats available" });
      }

      await db.insert(carpoolMemberships).values({
        carpoolId: carpool.id,
        userId: jr.requesterId,
        role: "MEMBER",
      });

      await db
        .update(carpools)
        .set({ seatsAvailable: carpool.seatsAvailable - 1, updatedAt: new Date() })
        .where(eq(carpools.id, carpool.id));

      await db
        .update(users)
        .set({ activeCarpoolId: carpool.id, updatedAt: new Date() })
        .where(eq(users.id, jr.requesterId));

      await db.update(joinRequests).set({ status: "ACCEPTED", updatedAt: new Date() }).where(eq(joinRequests.id, id));

      const [requester] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, jr.requesterId)).limit(1);
      await postSystemMessage(carpool.id, `${requester?.displayName ?? "A member"} joined the carpool.`);

      await createNotification({
        userId: jr.requesterId,
        type: "JOIN_ACCEPTED",
        title: "Join request accepted",
        body: `You joined the carpool to ${carpool.destination}.`,
        metadata: { carpoolId: carpool.id },
      });

      return reply.send({ status: "ACCEPTED" });
    }
  );

  app.delete(
    "/api/v1/join-requests/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [jr] = await db.select().from(joinRequests).where(eq(joinRequests.id, id)).limit(1);
      if (!jr || jr.requesterId !== request.user!.sub) {
        return reply.status(404).send({ message: "Join request not found" });
      }
      if (jr.status !== "PENDING") {
        return reply.status(400).send({ message: "Cannot cancel this request" });
      }
      await db.update(joinRequests).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(joinRequests.id, id));
      return reply.send({ status: "CANCELLED" });
    }
  );

  app.post(
    "/api/v1/carpools/:id/lock",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });
      if (carpool.ownerId !== request.user!.sub) return reply.status(403).send({ message: "Owner only" });

      const [updated] = await db
        .update(carpools)
        .set({ status: "LOCKED", isLocked: true, updatedAt: new Date() })
        .where(eq(carpools.id, id))
        .returning();

      await postSystemMessage(id, "Carpool locked. Group finalized.");

      const members = await db.select({ userId: carpoolMemberships.userId }).from(carpoolMemberships).where(eq(carpoolMemberships.carpoolId, id));
      for (const m of members) {
        await createNotification({
          userId: m.userId,
          type: "CARPOOL_LOCKED",
          title: "Carpool locked",
          body: `The carpool to ${carpool.destination} has been finalized.`,
          metadata: { carpoolId: id },
        });
      }

      return reply.send(updated);
    }
  );

  app.post(
    "/api/v1/carpools/:id/unlock",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });
      if (carpool.ownerId !== request.user!.sub) return reply.status(403).send({ message: "Owner only" });
      if (carpool.status !== "LOCKED") {
        return reply.status(400).send({ message: "Carpool is not locked" });
      }

      const [updated] = await db
        .update(carpools)
        .set({ status: "OPEN", isLocked: false, updatedAt: new Date() })
        .where(eq(carpools.id, id))
        .returning();

      await postSystemMessage(id, "Carpool unlocked. Open for updates again.");

      return reply.send(updated);
    }
  );

  app.post(
    "/api/v1/carpools/:id/leave",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.sub;
      const membership = await getMembership(id, userId);
      if (!membership) return reply.status(404).send({ message: "Not a member" });

      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });

      if (membership.role === "OWNER") {
        await transferOwnership(id, userId);
        return reply.send({ message: "Ownership transferred" });
      }

      await db.delete(carpoolMemberships).where(eq(carpoolMemberships.id, membership.id));
      await db
        .update(carpools)
        .set({ seatsAvailable: carpool.seatsAvailable + 1, updatedAt: new Date() })
        .where(eq(carpools.id, id));
      await db.update(users).set({ activeCarpoolId: null, updatedAt: new Date() }).where(eq(users.id, userId));
      await postSystemMessage(id, "A member left the carpool.");

      return reply.send({ message: "Left carpool" });
    }
  );

  app.delete(
    "/api/v1/memberships/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [membership] = await db.select().from(carpoolMemberships).where(eq(carpoolMemberships.id, id)).limit(1);
      if (!membership) return reply.status(404).send({ message: "Membership not found" });

      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, membership.carpoolId)).limit(1);
      if (!carpool || carpool.ownerId !== request.user!.sub) {
        return reply.status(403).send({ message: "Owner only" });
      }
      if (membership.role === "OWNER") {
        return reply.status(400).send({ message: "Cannot remove owner" });
      }

      await db.delete(carpoolMemberships).where(eq(carpoolMemberships.id, id));
      await db
        .update(carpools)
        .set({ seatsAvailable: carpool.seatsAvailable + 1, updatedAt: new Date() })
        .where(eq(carpools.id, carpool.id));
      await db
        .update(users)
        .set({ activeCarpoolId: null, updatedAt: new Date() })
        .where(eq(users.id, membership.userId));

      return reply.send({ message: "Member removed" });
    }
  );
}
