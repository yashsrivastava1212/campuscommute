import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  carpoolMemberships,
  carpools,
  discussionRooms,
  users,
} from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { findConflictingUserDeparture } from "../services/carpool.service.js";

const JOIN_CUTOFF_MINUTES = 30;

const createCarpoolSchema = z.object({
  origin: z.string().min(2).max(255),
  originId: z.string().uuid().optional(),
  destination: z.string().min(2).max(255),
  destinationId: z.string().uuid().optional(),
  departureAt: z.string().datetime(),
  totalSeats: z.number().int().min(2).max(8).default(4),
  notes: z.string().max(500).optional(),
});

const updateCarpoolSchema = z.object({
  origin: z.string().min(2).max(255).optional(),
  originId: z.string().uuid().optional(),
  destination: z.string().min(2).max(255).optional(),
  destinationId: z.string().uuid().optional(),
  departureAt: z.string().datetime().optional(),
  totalSeats: z.number().int().min(2).max(8).optional(),
  notes: z.string().max(500).optional(),
});

const browseQuerySchema = z.object({
  destination: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["OPEN", "LOCKED"]).optional().default("OPEN"),
});

function computeJoinCutoff(departureAt: Date): Date {
  return new Date(departureAt.getTime() - JOIN_CUTOFF_MINUTES * 60 * 1000);
}

export async function carpoolRoutes(app: FastifyInstance) {
  app.post(
    "/api/v1/carpools",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = createCarpoolSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "Invalid carpool data" });
      }

      const userId = request.user!.sub;
      const departureAt = new Date(parsed.data.departureAt);

      if (departureAt <= new Date()) {
        return reply.status(400).send({ message: "Departure must be in the future" });
      }

      if (
        parsed.data.originId &&
        parsed.data.destinationId &&
        parsed.data.originId === parsed.data.destinationId
      ) {
        return reply.status(400).send({
          message: "Starting point and ending point must be different",
        });
      }

      if (
        parsed.data.origin.trim().toLowerCase() ===
        parsed.data.destination.trim().toLowerCase()
      ) {
        return reply.status(400).send({
          message: "Starting point and ending point must be different",
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const conflictingDeparture = await findConflictingUserDeparture(
        userId,
        departureAt
      );
      if (conflictingDeparture) {
        return reply.status(409).send({
          message:
            "Departure time is too close to one of your existing trips (within 15 minutes). Choose a different time.",
        });
      }

      const totalSeats = parsed.data.totalSeats;
      const joinCutoffAt = computeJoinCutoff(departureAt);

      const [carpool] = await db
        .insert(carpools)
        .values({
          ownerId: userId,
          origin: parsed.data.origin,
          originId: parsed.data.originId,
          destination: parsed.data.destination,
          destinationId: parsed.data.destinationId,
          departureAt,
          totalSeats,
          seatsAvailable: totalSeats - 1,
          joinCutoffAt,
          notes: parsed.data.notes,
        })
        .returning();

      await db.insert(carpoolMemberships).values({
        carpoolId: carpool.id,
        userId,
        role: "OWNER",
      });

      await db.insert(discussionRooms).values({
        carpoolId: carpool.id,
      });

      if (!user?.activeCarpoolId) {
        await db
          .update(users)
          .set({ activeCarpoolId: carpool.id, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      return reply.status(201).send(carpool);
    }
  );

  app.get("/api/v1/carpools", async (request, reply) => {
    const parsed = browseQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: "Invalid query parameters" });
    }

    const conditions = [eq(carpools.status, parsed.data.status)];

    if (parsed.data.destination) {
      conditions.push(eq(carpools.destination, parsed.data.destination));
    }

    if (parsed.data.date) {
      const dayStart = new Date(`${parsed.data.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${parsed.data.date}T23:59:59.999Z`);
      conditions.push(gte(carpools.departureAt, dayStart));
      conditions.push(lt(carpools.departureAt, dayEnd));
    }

    const rows = await db
      .select({
        id: carpools.id,
        origin: carpools.origin,
        destination: carpools.destination,
        departureAt: carpools.departureAt,
        totalSeats: carpools.totalSeats,
        seatsAvailable: carpools.seatsAvailable,
        status: carpools.status,
        isLocked: carpools.isLocked,
        notes: carpools.notes,
        ownerId: carpools.ownerId,
      })
      .from(carpools)
      .where(and(...conditions))
      .orderBy(desc(carpools.departureAt));

    return reply.send({ carpools: rows });
  });

  app.get(
    "/api/v1/carpools/mine/active",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;

      const [user] = await db
        .select({ activeCarpoolId: users.activeCarpoolId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.activeCarpoolId) {
        return reply.send({ carpool: null });
      }

      const [carpool] = await db
        .select()
        .from(carpools)
        .where(eq(carpools.id, user.activeCarpoolId))
        .limit(1);

      if (!carpool || carpool.status === "CANCELLED") {
        return reply.send({ carpool: null });
      }

      const members = await db
        .select({
          id: carpoolMemberships.id,
          userId: carpoolMemberships.userId,
          role: carpoolMemberships.role,
          joinedAt: carpoolMemberships.joinedAt,
          displayName: users.displayName,
        })
        .from(carpoolMemberships)
        .innerJoin(users, eq(carpoolMemberships.userId, users.id))
        .where(eq(carpoolMemberships.carpoolId, carpool.id));

      return reply.send({ carpool: { ...carpool, members } });
    }
  );

  app.get(
    "/api/v1/carpools/mine/owned-open",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;

      const [carpool] = await db
        .select()
        .from(carpools)
        .where(
          and(
            eq(carpools.ownerId, userId),
            eq(carpools.status, "OPEN")
          )
        )
        .orderBy(desc(carpools.createdAt))
        .limit(1);

      if (!carpool) {
        return reply.send({ carpool: null });
      }

      return reply.send({ carpool });
    }
  );

  app.get("/api/v1/carpools/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const [carpool] = await db
      .select()
      .from(carpools)
      .where(eq(carpools.id, id))
      .limit(1);

    if (!carpool) {
      return reply.status(404).send({ message: "Carpool not found" });
    }

    const members = await db
      .select({
        id: carpoolMemberships.id,
        userId: carpoolMemberships.userId,
        role: carpoolMemberships.role,
        joinedAt: carpoolMemberships.joinedAt,
        displayName: users.displayName,
      })
      .from(carpoolMemberships)
      .innerJoin(users, eq(carpoolMemberships.userId, users.id))
      .where(eq(carpoolMemberships.carpoolId, id));

    return reply.send({ ...carpool, members });
  });

  app.patch(
    "/api/v1/carpools/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateCarpoolSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ message: "Invalid update data" });
      }

      const [existing] = await db
        .select()
        .from(carpools)
        .where(eq(carpools.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ message: "Carpool not found" });
      }

      if (existing.ownerId !== request.user!.sub) {
        return reply.status(403).send({ message: "Only the owner can update this carpool" });
      }

      if (existing.status !== "OPEN") {
        return reply.status(400).send({ message: "Cannot update a non-open carpool" });
      }

      const nextOriginId = parsed.data.originId ?? existing.originId;
      const nextDestinationId = parsed.data.destinationId ?? existing.destinationId;
      const nextOrigin = parsed.data.origin ?? existing.origin;
      const nextDestination = parsed.data.destination ?? existing.destination;

      if (nextOriginId && nextDestinationId && nextOriginId === nextDestinationId) {
        return reply.status(400).send({
          message: "Starting point and ending point must be different",
        });
      }

      if (nextOrigin.trim().toLowerCase() === nextDestination.trim().toLowerCase()) {
        return reply.status(400).send({
          message: "Starting point and ending point must be different",
        });
      }

      const updates: Partial<typeof carpools.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (parsed.data.origin) updates.origin = parsed.data.origin;
      if (parsed.data.originId) updates.originId = parsed.data.originId;
      if (parsed.data.destination) updates.destination = parsed.data.destination;
      if (parsed.data.destinationId) updates.destinationId = parsed.data.destinationId;
      if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

      if (parsed.data.departureAt) {
        const departureAt = new Date(parsed.data.departureAt);
        updates.departureAt = departureAt;
        updates.joinCutoffAt = computeJoinCutoff(departureAt);
      }

      if (parsed.data.totalSeats) {
        const memberCount = existing.totalSeats - existing.seatsAvailable;
        if (parsed.data.totalSeats < memberCount) {
          return reply.status(400).send({
            message: "Total seats cannot be less than current members",
          });
        }
        updates.totalSeats = parsed.data.totalSeats;
        updates.seatsAvailable = parsed.data.totalSeats - memberCount;
      }

      const [updated] = await db
        .update(carpools)
        .set(updates)
        .where(eq(carpools.id, id))
        .returning();

      return reply.send(updated);
    }
  );

  app.delete(
    "/api/v1/carpools/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const [existing] = await db
        .select()
        .from(carpools)
        .where(eq(carpools.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ message: "Carpool not found" });
      }

      if (existing.ownerId !== request.user!.sub) {
        return reply.status(403).send({ message: "Only the owner can cancel this carpool" });
      }

      const [updated] = await db
        .update(carpools)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(carpools.id, id))
        .returning();

      const members = await db
        .select({ userId: carpoolMemberships.userId })
        .from(carpoolMemberships)
        .where(eq(carpoolMemberships.carpoolId, id));

      for (const member of members) {
        await db
          .update(users)
          .set({ activeCarpoolId: null, updatedAt: new Date() })
          .where(eq(users.id, member.userId));
      }

      return reply.send(updated);
    }
  );
}
