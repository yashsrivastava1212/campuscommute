import type { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { transportBookings, transportListings } from "../db/schema.js";
import { authenticate } from "../middleware/auth.js";

const listingSchema = z.object({
  destination: z.string().min(2),
  departureAt: z.string().datetime(),
  vehicleType: z.string().default("TAXI"),
  totalSeats: z.number().int().min(1).max(8).default(4),
  pricePerSeatInr: z.number().int().min(100),
});

export async function transportRoutes(app: FastifyInstance) {
  app.get("/api/v1/transport", async (_request, reply) => {
    const rows = await db
      .select()
      .from(transportListings)
      .where(eq(transportListings.status, "OPEN"))
      .orderBy(desc(transportListings.departureAt));
    return reply.send({ listings: rows });
  });

  app.post(
    "/api/v1/transport",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = listingSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ message: "Invalid listing" });

      const [listing] = await db
        .insert(transportListings)
        .values({
          providerId: request.user!.sub,
          destination: parsed.data.destination,
          departureAt: new Date(parsed.data.departureAt),
          vehicleType: parsed.data.vehicleType,
          totalSeats: parsed.data.totalSeats,
          seatsAvailable: parsed.data.totalSeats,
          pricePerSeatInr: parsed.data.pricePerSeatInr,
        })
        .returning();

      return reply.status(201).send(listing);
    }
  );

  app.post(
    "/api/v1/transport/:id/book",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const [listing] = await db.select().from(transportListings).where(eq(transportListings.id, id)).limit(1);
      if (!listing || listing.seatsAvailable <= 0) {
        return reply.status(400).send({ message: "No seats available" });
      }

      const [booking] = await db
        .insert(transportBookings)
        .values({ listingId: id, userId: request.user!.sub })
        .returning();

      await db
        .update(transportListings)
        .set({
          seatsAvailable: listing.seatsAvailable - 1,
          status: listing.seatsAvailable - 1 === 0 ? "FULL" : "OPEN",
        })
        .where(eq(transportListings.id, id));

      return reply.status(201).send(booking);
    }
  );
}
