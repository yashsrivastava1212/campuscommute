import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createPostgresClient, resolveMigrationsFolder } from "./postgres-client.js";
import { seedDatabase } from "./seed-data.js";
import * as schema from "./schema.js";

export async function runProductionSetup() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add a PostgreSQL database on Railway and link it to this service."
    );
  }

  const fromDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolveMigrationsFolder(fromDir);

  console.log("[DB] Preparing production database...");
  console.log(`[DB] migrations: ${migrationsFolder}`);

  const client = createPostgresClient(connectionString, 1);
  const db = drizzle(client, { schema });

  try {
    await migrate(db, { migrationsFolder });
    console.log("[DB] Migrations complete");
    await seedDatabase(db);
    console.log("[DB] Seed complete");
  } finally {
    await client.end();
  }
}
