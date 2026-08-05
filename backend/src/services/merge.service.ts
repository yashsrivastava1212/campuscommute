import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  carpools,
  carpoolMemberships,
  discussionRooms,
  mergeProposals,
  users,
} from "../db/schema.js";
import { createNotification } from "./notification.service.js";
import { postSystemMessage } from "./carpool.service.js";

const MERGE_WINDOW_MS = 45 * 60 * 1000;
const MERGE_EXPIRY_MS = 2 * 60 * 60 * 1000;
const MIN_SCORE = 70;

function scorePair(a: typeof carpools.$inferSelect, b: typeof carpools.$inferSelect) {
  if (a.destination !== b.destination) return 0;
  const timeDiff = Math.abs(a.departureAt.getTime() - b.departureAt.getTime());
  if (timeDiff > MERGE_WINDOW_MS) return 0;

  const membersA = a.totalSeats - a.seatsAvailable;
  const membersB = b.totalSeats - b.seatsAvailable;
  if (membersA + membersB > a.totalSeats) return 0;

  const timeScore = 1 - timeDiff / MERGE_WINDOW_MS;
  const seatScore = (membersA + membersB) / a.totalSeats;
  return Math.round((0.4 + 0.35 * timeScore + 0.25 * seatScore) * 100);
}

export async function scanMergeProposals() {
  const open = await db
    .select()
    .from(carpools)
    .where(and(eq(carpools.status, "OPEN"), eq(carpools.isLocked, false)));

  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const a = open[i];
      const b = open[j];
      if (a.ownerId === b.ownerId) continue;

      const score = scorePair(a, b);
      if (score < MIN_SCORE) continue;

      const existing = await db
        .select()
        .from(mergeProposals)
        .where(
          and(
            eq(mergeProposals.status, "PENDING"),
            sql`(${mergeProposals.carpoolAId} = ${a.id} AND ${mergeProposals.carpoolBId} = ${b.id}) OR (${mergeProposals.carpoolAId} = ${b.id} AND ${mergeProposals.carpoolBId} = ${a.id})`
          )
        )
        .limit(1);

      if (existing.length > 0) continue;

      const [proposal] = await db
        .insert(mergeProposals)
        .values({
          carpoolAId: a.id,
          carpoolBId: b.id,
          compatibilityScore: score,
          expiresAt: new Date(Date.now() + MERGE_EXPIRY_MS),
        })
        .returning();

      for (const ownerId of [a.ownerId, b.ownerId]) {
        await createNotification({
          userId: ownerId,
          type: "MERGE_SUGGESTION",
          title: "Compatible carpool found",
          body: `Merge suggestion to fill a taxi to ${a.destination}.`,
          metadata: { mergeProposalId: proposal.id },
        });
      }
    }
  }

  await db
    .update(mergeProposals)
    .set({ status: "EXPIRED" })
    .where(and(eq(mergeProposals.status, "PENDING"), lt(mergeProposals.expiresAt, new Date())));
}

export async function approveMerge(proposalId: string, userId: string) {
  const [proposal] = await db
    .select()
    .from(mergeProposals)
    .where(eq(mergeProposals.id, proposalId))
    .limit(1);

  if (!proposal || proposal.status !== "PENDING") return null;

  const [carpoolA] = await db.select().from(carpools).where(eq(carpools.id, proposal.carpoolAId)).limit(1);
  const [carpoolB] = await db.select().from(carpools).where(eq(carpools.id, proposal.carpoolBId)).limit(1);
  if (!carpoolA || !carpoolB) return null;

  const isOwnerA = carpoolA.ownerId === userId;
  const isOwnerB = carpoolB.ownerId === userId;
  if (!isOwnerA && !isOwnerB) return null;

  const updates: Partial<typeof mergeProposals.$inferInsert> = {};
  if (isOwnerA) updates.ownerAApproved = true;
  if (isOwnerB) updates.ownerBApproved = true;

  const [updated] = await db
    .update(mergeProposals)
    .set(updates)
    .where(eq(mergeProposals.id, proposalId))
    .returning();

  if (!updated.ownerAApproved || !updated.ownerBApproved) {
    return { merged: false, proposal: updated };
  }

  const membersA = await db.select().from(carpoolMemberships).where(eq(carpoolMemberships.carpoolId, carpoolA.id));
  const membersB = await db.select().from(carpoolMemberships).where(eq(carpoolMemberships.carpoolId, carpoolB.id));
  const totalMembers = membersA.length + membersB.length;
  const totalSeats = Math.max(carpoolA.totalSeats, carpoolB.totalSeats);
  const newOwnerId = membersA.length >= membersB.length ? carpoolA.ownerId : carpoolB.ownerId;

  const [merged] = await db
    .insert(carpools)
    .values({
      ownerId: newOwnerId,
      destination: carpoolA.destination,
      destinationId: carpoolA.destinationId,
      instituteId: carpoolA.instituteId,
      departureAt: carpoolA.departureAt < carpoolB.departureAt ? carpoolA.departureAt : carpoolB.departureAt,
      totalSeats,
      seatsAvailable: totalSeats - totalMembers,
      joinCutoffAt: carpoolA.joinCutoffAt < carpoolB.joinCutoffAt ? carpoolA.joinCutoffAt : carpoolB.joinCutoffAt,
      notes: "Merged carpool",
    })
    .returning();

  await db.insert(discussionRooms).values({ carpoolId: merged.id });

  for (const m of [...membersA, ...membersB]) {
    await db.insert(carpoolMemberships).values({
      carpoolId: merged.id,
      userId: m.userId,
      role: m.userId === newOwnerId ? "OWNER" : "MEMBER",
    });
    await db.update(users).set({ activeCarpoolId: merged.id, updatedAt: new Date() }).where(eq(users.id, m.userId));
  }

  await db.update(carpools).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(carpools.id, carpoolA.id));
  await db.update(carpools).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(carpools.id, carpoolB.id));

  await db
    .update(mergeProposals)
    .set({ status: "MERGED", resultingCarpoolId: merged.id })
    .where(eq(mergeProposals.id, proposalId));

  await postSystemMessage(merged.id, "Carpools merged. Coordinate here for your shared trip.");

  for (const m of [...membersA, ...membersB]) {
    await createNotification({
      userId: m.userId,
      type: "MERGE_COMPLETE",
      title: "Carpools merged",
      body: `Your group is now sharing one taxi to ${merged.destination}.`,
      metadata: { carpoolId: merged.id },
    });
  }

  return { merged: true, carpool: merged };
}

export async function declineMerge(proposalId: string, userId: string) {
  const [proposal] = await db.select().from(mergeProposals).where(eq(mergeProposals.id, proposalId)).limit(1);
  if (!proposal) return false;

  const [a] = await db.select().from(carpools).where(eq(carpools.id, proposal.carpoolAId)).limit(1);
  const [b] = await db.select().from(carpools).where(eq(carpools.id, proposal.carpoolBId)).limit(1);
  if (!a || !b) return false;
  if (a.ownerId !== userId && b.ownerId !== userId) return false;

  await db.update(mergeProposals).set({ status: "DECLINED" }).where(eq(mergeProposals.id, proposalId));
  return true;
}
