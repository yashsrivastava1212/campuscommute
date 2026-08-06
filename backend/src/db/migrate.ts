import "../env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createPostgresClient, resolveMigrationsFolder } from "./postgres-client.js";

async function runMigrations() {
  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://campuscommute:campuscommute@localhost:5432/campuscommute";

  const fromDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolveMigrationsFolder(fromDir);

  const migrationClient = createPostgresClient(connectionString, 1);
  const db = drizzle(migrationClient);

  console.log(`Running migrations from ${migrationsFolder}...`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");

  await migrationClient.end();
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
