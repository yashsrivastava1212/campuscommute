import "../env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import * as schema from "./schema.js";
import { seedDatabase } from "./seed-data.js";

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../drizzle"
);

async function initDb() {
  const usePglite =
    process.env.USE_PGLITE === "true" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.USE_PGLITE !== "false");

  if (usePglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    const client = new PGlite();
    const instance = drizzlePglite(client, { schema });

    console.log("[DB] Using embedded PGLite (local dev — no PostgreSQL required)");
    await migrate(instance, { migrationsFolder });
    await seedDatabase(instance);

    return instance;
  }

  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://campuscommute:campuscommute@localhost:5432/campuscommute";

  const client = postgres(connectionString, { max: 10 });
  return drizzlePostgres(client, { schema });
}

export const db = await initDb();
export type Database = typeof db;
