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
      "DATABASE_URL is not set. Link your Render Postgres database to this web service."
    );
  }

  const fromDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolveMigrationsFolder(fromDir);

  console.log("[DB] Preparing production database...");
  console.log(`[DB] cwd: ${process.cwd()}`);
  console.log(`[DB] migrations: ${migrationsFolder}`);

  const client = createPostgresClient(connectionString, 1);
  const db = drizzle(client, { schema });

  try {
    console.log("[DB] Running migrations...");
    await migrate(db, { migrationsFolder });
    console.log("[DB] Migrations complete");

    console.log("[DB] Seeding reference data...");
    await seedDatabase(db);
    console.log("[DB] Seed complete");
  } finally {
    await client.end();
  }
}
