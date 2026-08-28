import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { createDemoArticles, demoSources } from "../fixtures/articles";
import { createDatabase } from "../src/server/db";
import { seedFixtureArticles } from "../src/server/fixtures";

mkdirSync(resolve("data"), { recursive: true });
const databasePath = join(mkdtempSync(resolve("data/e2e-")), "demo.sqlite");
console.log(`Selaintestien erillinen kehitystietokanta: ${databasePath}`);
process.env.DATABASE_PATH = databasePath;
process.env.DEMO_MODE = "true";
process.env.ALLOW_DEMO_PREVIEW = "true";
const database = createDatabase(databasePath, { mode: "demo" });
try {
  seedFixtureArticles(database, createDemoArticles(), demoSources);
} finally {
  database.sqlite.close();
}

const require = createRequire(import.meta.url);
const production = process.env.E2E_PRODUCTION === "true";
const child = spawn(process.execPath, [
  require.resolve("next/dist/bin/next"),
  production ? "start" : "dev",
  "--hostname", "127.0.0.1", "--port", "3100",
], {
  cwd: process.cwd(),
  stdio: "inherit",
  windowsHide: true,
  env: {
    ...process.env,
    NODE_ENV: production ? "production" : "development",
    DATABASE_PATH: databasePath,
    DEMO_MODE: "true",
    ALLOW_DEMO_PREVIEW: "true",
    SITE_URL: "http://127.0.0.1:3100",
    ADMIN_SECRET: "playwright-local-test-secret-only",
    NEXT_TELEMETRY_DISABLED: "1",
  },
});

let stopping = false;
function stopChild() {
  if (stopping || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  stopping = true;
  if (process.platform === "win32") {
    // The PID is this script's own child. Include its Next.js worker descendants.
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill("SIGTERM");
  }
}

process.once("SIGINT", () => { stopChild(); process.exit(0); });
process.once("SIGTERM", () => { stopChild(); process.exit(0); });
process.once("exit", stopChild);
child.once("error", (error) => {
  console.error(`Testipalvelimen käynnistys epäonnistui: ${error.message}`);
  process.exitCode = 1;
});
child.once("exit", (code) => { process.exitCode = stopping ? 0 : (code ?? 1); });
