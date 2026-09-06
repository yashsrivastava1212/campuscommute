import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

function isFrontendService() {
  if (process.env.SERVICE_ROLE === "frontend") return true;
  if (process.env.SERVICE_ROLE === "backend") return false;

  const meta = `${process.env.RAILWAY_SERVICE_NAME ?? ""} ${
    process.env.RAILWAY_PUBLIC_DOMAIN ?? ""
  } ${process.env.RAILWAY_STATIC_URL ?? ""}`;
  if (/frontend/i.test(meta)) return true;
  if (!process.env.DATABASE_URL?.trim()) return true;

  return false;
}

function run(command) {
  execSync(command, { stdio: "inherit" });
}

const mode = process.argv[2];
const frontend = isFrontendService();

if (mode === "build") {
  console.log(
    `[railway-dispatch] ${frontend ? "FRONTEND" : "BACKEND"} build (SERVICE_ROLE=${
      process.env.SERVICE_ROLE ?? ""
    }, DATABASE_URL=${process.env.DATABASE_URL ? "set" : "unset"})`
  );
  run("npm install --include=dev");
  run(frontend ? "npm run build -w frontend" : "npm run build -w backend");
  if (frontend && !existsSync("frontend/.next/BUILD_ID")) {
    console.error("[railway-dispatch] frontend/.next/BUILD_ID missing after build");
    process.exit(1);
  }
  console.log("[railway-dispatch] build complete");
} else if (mode === "start") {
  console.log(
    `[railway-dispatch] ${frontend ? "FRONTEND" : "BACKEND"} start on PORT=${
      process.env.PORT ?? "unset"
    }`
  );
  if (!frontend && !process.env.DATABASE_URL?.trim()) {
    console.error(
      "[railway-dispatch] DATABASE_URL is missing on the backend service. Link Postgres in Railway Variables."
    );
    process.exit(1);
  }
  if (frontend && !existsSync("frontend/.next/BUILD_ID")) {
    console.log("[railway-dispatch] building frontend before start");
    run("npm install --include=dev");
    run("npm run build -w frontend");
  }
  run(frontend ? "npm run start -w frontend" : "npm run start -w backend");
} else {
  console.error("Usage: node scripts/railway-dispatch.mjs <build|start>");
  process.exit(1);
}
