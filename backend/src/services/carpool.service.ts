import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  carpoolMemberships,
  carpools,
  discussionRooms,
  joinRequests,
  messages,
  users,
} from "../db/schema.js";
import { createNotification } from "./notification.service.js";

const APP_TIMEZONE = "Asia/Kolkata";

export function getCalendarDateKey(
  date: Date,
  timeZone = APP_TIMEZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isSameCalendarDay(a: Date, b: Date, timeZone = APP_TIMEZONE): boolean {
  return getCalendarDateKey(a, timeZone) === getCalendarDateKey(b, timeZone);
}

export async function findUserTripOnSameDay(
  userId: string,
  departureAt: Date,
  excludeCarpoolId?: string
): Promise<Date | null> {
  const rows = await db
    .select({ id: carpools.id, departureAt: carpools.departureAt })
    .from(carpoolMemberships)
    .innerJoin(carpools, eq(carpoolMemberships.carpoolId, carpools.id))
    .where(
      and(
        eq(carpoolMemberships.userId, userId),
        inArray(carpools.status, ["OPEN", "LOCKED"])
      )
    );

  const proposedDay = getCalendarDateKey(departureAt);

  for (const row of rows) {
    if (excludeCarpoolId && row.id === excludeCarpoolId) continue;
    if (getCalendarDateKey(row.departureAt) === proposedDay) {
      return row.departureAt;
    }
  }

  return null;
}

export async function getMembership(carpoolId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(carpoolMemberships)
    .where(
      and(
        eq(carpoolMemberships.carpoolId, carpoolId),
        eq(carpoolMemberships.userId, userId)
      )
    )
    .limit(1);
  return membership ?? null;
}

export async function clearActiveCarpoolForMembers(carpoolId: string) {
  const members = await db
    .select({ userId: carpoolMemberships.userId })
    .from(carpoolMemberships)
    .where(eq(carpoolMemberships.carpoolId, carpoolId));

  for (const member of members) {
    await db
      .update(users)
      .set({ activeCarpoolId: null, updatedAt: new Date() })
      .where(eq(users.id, member.userId));
  }
}

export async function postSystemMessage(carpoolId: string, body: string) {
  const [room] = await db
    .select()
    .from(discussionRooms)
    .where(eq(discussionRooms.carpoolId, carpoolId))
    .limit(1);

  if (!room || room.status !== "ACTIVE") return;

  await db.insert(messages).values({
    roomId: room.id,
    body,
    isSystem: true,
  });
}

export async function transferOwnership(carpoolId: string, leavingOwnerId: string) {
  const remaining = await db
    .select()
    .from(carpoolMemberships)
    .where(
      and(
        eq(carpoolMemberships.carpoolId, carpoolId),
        eq(carpoolMemberships.userId, leavingOwnerId)
      )
    );

  await db
    .delete(carpoolMemberships)
    .where(
      and(
        eq(carpoolMemberships.carpoolId, carpoolId),
        eq(carpoolMemberships.userId, leavingOwnerId)
      )
    );

  const [carpool] = await db
    .select()
    .from(carpools)
    .where(eq(carpools.id, carpoolId))
    .limit(1);

  if (!carpool) return;

  const otherMembers = await db
    .select()
    .from(carpoolMemberships)
    .where(eq(carpoolMemberships.carpoolId, carpoolId))
    .orderBy(asc(carpoolMemberships.joinedAt));

  if (otherMembers.length === 0) {
    await db
      .update(carpools)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(carpools.id, carpoolId));
    await clearActiveCarpoolForMembers(carpoolId);
    return;
  }

  const newOwner = otherMembers[0];
  await db
    .update(carpoolMemberships)
    .set({ role: "OWNER" })
    .where(eq(carpoolMemberships.id, newOwner.id));

  await db
    .update(carpools)
    .set({ ownerId: newOwner.userId, updatedAt: new Date() })
    .where(eq(carpools.id, carpoolId));

  await db
    .update(users)
    .set({ activeCarpoolId: null, updatedAt: new Date() })
    .where(eq(users.id, leavingOwnerId));

  const [newOwnerUser] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, newOwner.userId))
    .limit(1);

  await postSystemMessage(
    carpoolId,
    `Ownership transferred to ${newOwnerUser?.displayName ?? "a member"}.`
  );

  await createNotification({
    userId: newOwner.userId,
    type: "OWNERSHIP_TRANSFER",
    title: "You are now the carpool owner",
    body: `You are now managing the carpool to ${carpool.destination}.`,
    metadata: { carpoolId },
  });
}

export async function expireJoinRequests() {
  const now = new Date();
  const openCarpools = await db
    .select({ id: carpools.id, joinCutoffAt: carpools.joinCutoffAt })
    .from(carpools)
    .where(eq(carpools.status, "OPEN"));

  for (const carpool of openCarpools) {
    if (now >= carpool.joinCutoffAt) {
      await db
        .update(joinRequests)
        .set({ status: "EXPIRED", updatedAt: new Date() })
        .where(
          and(
            eq(joinRequests.carpoolId, carpool.id),
            eq(joinRequests.status, "PENDING")
          )
        );
    }
  }
}

export async function completeCarpools() {
  const now = new Date();
  const active = await db
    .select()
    .from(carpools)
    .where(and(eq(carpools.status, "OPEN")));

  for (const carpool of active) {
    if (now >= carpool.departureAt) {
      await db
        .update(carpools)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(carpools.id, carpool.id));
      await clearActiveCarpoolForMembers(carpool.id);
    }
  }

  const locked = await db
    .select()
    .from(carpools)
    .where(eq(carpools.status, "LOCKED"));

  for (const carpool of locked) {
    if (now >= carpool.departureAt) {
      await db
        .update(carpools)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(carpools.id, carpool.id));
      await clearActiveCarpoolForMembers(carpool.id);
    }
  }
}

export async function archiveCarpools() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db.select().from(carpools);

  for (const carpool of stale) {
    if (
      (carpool.status === "COMPLETED" || carpool.status === "CANCELLED") &&
      carpool.updatedAt <= cutoff
    ) {
      await db
        .update(carpools)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(eq(carpools.id, carpool.id));

      await db
        .update(discussionRooms)
        .set({ status: "ARCHIVED", archivedAt: new Date() })
        .where(eq(discussionRooms.carpoolId, carpool.id));
    }
  }
}
