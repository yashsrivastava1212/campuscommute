import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";

type NotificationInput = {
  userId: string;
  type: typeof notifications.$inferInsert.type;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(input: NotificationInput) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
  });
}

export async function markNotificationRead(id: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));
}
