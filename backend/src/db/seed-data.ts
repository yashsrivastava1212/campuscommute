import { eq } from "drizzle-orm";
import type { Database } from "./index.js";
import { destinationFares, destinations, institutes } from "./schema.js";

/** GIM campus, Goa airports, railway stations, and bus stands */
export const GOA_LOCATIONS = [
  {
    name: "GIM Campus (Sanquelim)",
    slug: "gim-campus",
    category: "campus",
    fare: 0,
  },
  {
    name: "Goa International Airport — Dabolim (GOX)",
    slug: "gox-airport",
    category: "airport",
    fare: 1200,
  },
  {
    name: "Manohar International Airport — Mopa (GOI)",
    slug: "mopa-airport",
    category: "airport",
    fare: 1500,
  },
  {
    name: "Madgaon Railway Station",
    slug: "madgaon-railway",
    category: "railway",
    fare: 800,
  },
  {
    name: "Thivim Railway Station",
    slug: "thivim-railway",
    category: "railway",
    fare: 900,
  },
  {
    name: "Karmali Railway Station",
    slug: "karmali-railway",
    category: "railway",
    fare: 700,
  },
  {
    name: "Vasco-da-Gama Railway Station",
    slug: "vasco-railway",
    category: "railway",
    fare: 1100,
  },
  {
    name: "Margao Bus Stand (KTC)",
    slug: "margao-bus-stand",
    category: "bus_stand",
    fare: 700,
  },
  {
    name: "Panjim Bus Stand (KTC)",
    slug: "panjim-bus-stand",
    category: "bus_stand",
    fare: 600,
  },
  {
    name: "Mapusa Bus Stand",
    slug: "mapusa-bus-stand",
    category: "bus_stand",
    fare: 650,
  },
  {
    name: "Vasco Bus Stand",
    slug: "vasco-bus-stand",
    category: "bus_stand",
    fare: 1100,
  },
  {
    name: "Ponda Bus Stand",
    slug: "ponda-bus-stand",
    category: "bus_stand",
    fare: 500,
  },
  {
    name: "Sanquelim Bus Stand",
    slug: "sanquelim-bus-stand",
    category: "bus_stand",
    fare: 200,
  },
  {
    name: "Cuncolim Bus Stand",
    slug: "cuncolim-bus-stand",
    category: "bus_stand",
    fare: 750,
  },
  {
    name: "Canacona Bus Stand",
    slug: "canacona-bus-stand",
    category: "bus_stand",
    fare: 900,
  },
] as const;

export async function seedDatabase(db: Database): Promise<void> {
  console.log("Seeding institutes...");
  let [gim] = await db
    .select()
    .from(institutes)
    .where(eq(institutes.code, "GIM"))
    .limit(1);

  if (!gim) {
    [gim] = await db
      .insert(institutes)
      .values({
        code: "GIM",
        name: "Goa Institute of Management",
        emailDomain: "gim.ac.in",
      })
      .returning();
    console.log("  + GIM institute");
  }

  console.log("Seeding Goa locations...");
  for (const loc of GOA_LOCATIONS) {
    const [existing] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.slug, loc.slug))
      .limit(1);

    let destinationId: string;
    if (!existing) {
      const [created] = await db
        .insert(destinations)
        .values({
          name: loc.name,
          slug: loc.slug,
          category: loc.category,
          instituteCode: "GIM",
          instituteId: gim.id,
          isActive: true,
        })
        .returning();
      destinationId = created.id;
      console.log(`  + ${loc.name}`);
    } else {
      destinationId = existing.id;
      await db
        .update(destinations)
        .set({ name: loc.name, category: loc.category, isActive: true })
        .where(eq(destinations.id, existing.id));
    }

    const [fare] = await db
      .select()
      .from(destinationFares)
      .where(eq(destinationFares.destinationId, destinationId))
      .limit(1);

    if (!fare) {
      await db.insert(destinationFares).values({
        destinationId,
        estimatedFareInr: loc.fare,
      });
    }
  }

  console.log("Seed complete.");
}
