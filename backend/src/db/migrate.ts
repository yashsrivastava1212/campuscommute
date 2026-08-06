import "../env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createPostgresClient, resolveMigrationsFolder } from "./postgres-client.js";

const fromDir = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required for migrations");
    process.exit(1);
  }

  const migrationsFolder = resolveMigrationsFolder(fromDir);
  console.log(`Using migrations folder: ${migrationsFolder}`);

  const migrationClient = createPostgresClient(connectionString, 1);
  const db = drizzle(migrationClient);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");

  await migrationClient.end();
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
