import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://campuscommute:campuscommute@localhost:5432/campuscommute";

async function runMigrations() {
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  await migrationClient.end();
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
