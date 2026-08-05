import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendSrcDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(backendSrcDir, "../..");

const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(projectRoot, ".env"),
  path.join(process.cwd(), "..", ".env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}
