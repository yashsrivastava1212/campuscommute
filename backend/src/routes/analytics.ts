import type { FastifyInstance } from "fastify";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  carpoolMemberships,
  carpools,
  joinRequests,
} from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/users/me/analytics",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.sub;
      const memberships = await db
        .select({ carpoolId: carpoolMemberships.carpoolId })
        .from(carpoolMemberships)
        .innerJoin(carpools, eq(carpoolMemberships.carpoolId, carpools.id))
        .where(
          sql`${carpools.status} IN ('COMPLETED', 'ARCHIVED') AND ${carpoolMemberships.userId} = ${userId}`
        );

      return reply.send({
        completedTrips: memberships.length,
        estimatedSavingsInr: memberships.length * 400,
      });
    }
  );

  app.get(
    "/api/v1/admin/metrics",
    { preHandler: requireAdmin },
    async (_request, reply) => {
      const [{ value: totalCarpools }] = await db
        .select({ value: count() })
        .from(carpools);

      const [{ value: completedCarpools }] = await db
        .select({ value: count() })
        .from(carpools)
        .where(eq(carpools.status, "COMPLETED"));

      const [{ value: joinAccepts }] = await db
        .select({ value: count() })
        .from(joinRequests)
        .where(eq(joinRequests.status, "ACCEPTED"));

      const [{ value: carpoolCreates }] = await db
        .select({ value: count() })
        .from(carpools);

      const members = await db
        .select({ carpoolId: carpoolMemberships.carpoolId })
        .from(carpoolMemberships)
        .innerJoin(carpools, eq(carpoolMemberships.carpoolId, carpools.id))
        .where(eq(carpools.status, "COMPLETED"));

      const avgPassengers =
        completedCarpools > 0 ? members.length / completedCarpools : 0;

      return reply.send({
        totalCarpools,
        completedCarpools,
        joinAccepts,
        carpoolCreates,
        joinToCreateRatio: carpoolCreates > 0 ? joinAccepts / carpoolCreates : 0,
        avgPassengersPerTaxi: avgPassengers,
        estimatedTrafficReduction: Math.max(0, completedCarpools - members.length / 4),
      });
    }
  );

  app.get(
    "/api/v1/admin/institutional-report",
    { preHandler: requireAdmin },
    async (_request, reply) => {
      const byDestination = await db
        .select({
          destination: carpools.destination,
          count: count(),
        })
        .from(carpools)
        .groupBy(carpools.destination)
        .orderBy(desc(count()));

      return reply.send({
        generatedAt: new Date().toISOString(),
        popularDestinations: byDestination,
        summary: "CampusCommute semester break mobility report for GIM",
      });
    }
  );
}
