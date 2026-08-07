import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { carpoolMemberships, carpools, users } from "../db/schema.js";
import { encryptPhone } from "../lib/crypto.js";
import { resolveDisplayName } from "../lib/display-name.js";
import { authenticate } from "../middleware/auth.js";

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/users/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return reply.status(404).send({ message: "User not found" });
      }

      return reply.send({
        id: user.id,
        email: user.campusEmail,
        displayName: resolveDisplayName(user.displayName, user.campusEmail),
        profileComplete: Boolean(user.displayName),
        activeCarpoolId: user.activeCarpoolId,
        isAdmin: user.isAdmin,
      });
    }
  );

  app.patch(
    "/api/v1/users/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = updateProfileSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ message: "Invalid profile data" });
      }

      const updates: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (parsed.data.displayName !== undefined) {
        updates.displayName = parsed.data.displayName;
      }

      if (parsed.data.phone !== undefined) {
        updates.phoneEncrypted = encryptPhone(parsed.data.phone);
      }

      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, request.user!.sub))
        .returning();

      return reply.send({
        id: user.id,
        email: user.campusEmail,
        displayName: user.displayName,
        profileComplete: Boolean(user.displayName),
      });
    }
  );

  app.get(
    "/api/v1/users/me/carpools",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;
      const rows = await db
        .select({
          id: carpools.id,
          destination: carpools.destination,
          departureAt: carpools.departureAt,
          status: carpools.status,
          role: carpoolMemberships.role,
        })
        .from(carpoolMemberships)
        .innerJoin(carpools, eq(carpoolMemberships.carpoolId, carpools.id))
        .where(eq(carpoolMemberships.userId, userId))
        .orderBy(desc(carpools.departureAt));

      return reply.send({ carpools: rows });
    }
  );
}
