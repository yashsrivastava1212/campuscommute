import { existsSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

export function createPostgresClient(connectionString: string, max = 10) {
  const useSsl =
    process.env.NODE_ENV === "production" ||
    /railway\.app|rlwy\.net|render\.com|sslmode=require/i.test(connectionString);

  return postgres(connectionString, {
    max,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    connect_timeout: 30,
    idle_timeout: 20,
  });
}

export function resolveMigrationsFolder(fromDir: string) {
  const candidates = [
    path.resolve(fromDir, "../../drizzle"),
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(process.cwd(), "backend/drizzle"),
  ];

  for (const folder of candidates) {
    if (existsSync(path.join(folder, "meta", "_journal.json"))) {
      return folder;
    }
  }

  throw new Error(
    `Migrations folder not found. Checked: ${candidates.join(", ")}`
  );
}
