import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  carpoolMemberships,
  carpools,
  discussionRooms,
  messages,
  users,
} from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { resolveDisplayName } from "../lib/display-name.js";
import { getMembership } from "../services/carpool.service.js";
import { createNotification } from "../services/notification.service.js";
import { decryptPhone } from "../lib/crypto.js";

const messageSchema = z.object({ body: z.string().min(1).max(2000) });

export async function discussionRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/carpools/:id/discussion/messages",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const membership = await getMembership(id, request.user!.sub);
      if (!membership) return reply.status(403).send({ message: "Members only" });

      const [room] = await db.select().from(discussionRooms).where(eq(discussionRooms.carpoolId, id)).limit(1);
      if (!room) return reply.status(404).send({ message: "Discussion not found" });

      const rows = await db
        .select({
          id: messages.id,
          body: messages.body,
          isSystem: messages.isSystem,
          sentAt: messages.sentAt,
          senderId: messages.senderId,
          displayName: users.displayName,
          campusEmail: users.campusEmail,
        })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.roomId, room.id))
        .orderBy(asc(messages.sentAt));

      return reply.send({
        messages: rows.map((row) => ({
          id: row.id,
          body: row.body,
          isSystem: row.isSystem,
          sentAt: row.sentAt,
          senderId: row.senderId,
          displayName: row.isSystem
            ? null
            : resolveDisplayName(row.displayName, row.campusEmail),
        })),
        roomStatus: room.status,
      });
    }
  );

  app.post(
    "/api/v1/carpools/:id/discussion/messages",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = messageSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid message" });

      const membership = await getMembership(id, request.user!.sub);
      if (!membership) return reply.status(403).send({ message: "Members only" });

      const [room] = await db.select().from(discussionRooms).where(eq(discussionRooms.carpoolId, id)).limit(1);
      if (!room || room.status !== "ACTIVE") {
        return reply.status(400).send({ message: "Discussion is archived" });
      }

      const [msg] = await db
        .insert(messages)
        .values({
          roomId: room.id,
          senderId: request.user!.sub,
          body: parsed.data.body,
        })
        .returning();

      const members = await db
        .select({ userId: carpoolMemberships.userId })
        .from(carpoolMemberships)
        .where(eq(carpoolMemberships.carpoolId, id));

      for (const m of members) {
        if (m.userId === request.user!.sub) continue;
        await createNotification({
          userId: m.userId,
          type: "NEW_MESSAGE",
          title: "New trip message",
          body: parsed.data.body.slice(0, 100),
          metadata: { carpoolId: id },
        });
      }

      return reply.status(201).send(msg);
    }
  );

  app.post(
    "/api/v1/memberships/:id/reveal-contact",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [membership] = await db.select().from(carpoolMemberships).where(eq(carpoolMemberships.id, id)).limit(1);
      if (!membership || membership.userId !== request.user!.sub) {
        return reply.status(404).send({ message: "Membership not found" });
      }

      await db
        .update(carpoolMemberships)
        .set({ contactRevealed: true })
        .where(eq(carpoolMemberships.id, id));

      return reply.send({ contactRevealed: true });
    }
  );

  app.get(
    "/api/v1/carpools/:id/contacts",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const myMembership = await getMembership(id, request.user!.sub);
      if (!myMembership) return reply.status(403).send({ message: "Members only" });
      if (!myMembership.contactRevealed) {
        return reply.status(403).send({ message: "Reveal your contact first" });
      }

      const members = await db
        .select({
          membershipId: carpoolMemberships.id,
          userId: carpoolMemberships.userId,
          displayName: users.displayName,
          contactRevealed: carpoolMemberships.contactRevealed,
          phoneEncrypted: users.phoneEncrypted,
        })
        .from(carpoolMemberships)
        .innerJoin(users, eq(carpoolMemberships.userId, users.id))
        .where(
          and(
            eq(carpoolMemberships.carpoolId, id),
            eq(carpoolMemberships.contactRevealed, true)
          )
        );

      const contacts = members
        .filter((m) => m.phoneEncrypted)
        .map((m) => ({
          membershipId: m.membershipId,
          displayName: m.displayName,
          phone: decryptPhone(m.phoneEncrypted!),
        }));

      return reply.send({ contacts });
    }
  );

  app.get(
    "/api/v1/carpools/:id/cost-split",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id)).limit(1);
      if (!carpool) return reply.status(404).send({ message: "Carpool not found" });

      const { destinationFares } = await import("../db/schema.js");
      let fare = 1200;
      if (carpool.destinationId) {
        const [f] = await db
          .select()
          .from(destinationFares)
          .where(eq(destinationFares.destinationId, carpool.destinationId))
          .limit(1);
        if (f) fare = f.estimatedFareInr;
      }

      const memberCount = carpool.totalSeats - carpool.seatsAvailable;
      const perPerson = memberCount > 0 ? Math.ceil(fare / memberCount) : fare;
      const solo = fare;

      return reply.send({
        estimatedTotalFareInr: fare,
        memberCount,
        perPersonInr: perPerson,
        soloFareInr: solo,
        savingsInr: solo - perPerson,
      });
    }
  );
}
