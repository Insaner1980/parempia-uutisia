import { mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { isDemoMode } from "./env";

export type DatabaseMode = "live" | "demo";

export function createDatabase(path: string, options: { mode?: DatabaseMode } = {}) {
  const mode = options.mode ?? "live";
  const inMemory = path === ":memory:";
  if (mode === "demo" && !inMemory && basename(path) !== "demo.sqlite") throw new Error("DEMO_DATABASE_NAME_REQUIRED");
  if (mode === "demo" && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_PREVIEW !== "true") {
    throw new Error("DEMO_PRODUCTION_PREVIEW_NOT_ENABLED");
  }
  const databasePath = inMemory ? path : resolve(path);
  if (!inMemory) mkdirSync(dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath, { timeout: 5000 });
  try {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");
    sqlite.transaction(() => {
      sqlite.exec(readFileSync(resolve(process.cwd(), "drizzle/0000_initial.sql"), "utf8"));
      const recorded = sqlite.prepare("SELECT value FROM app_meta WHERE key = 'database_mode'").get() as { value: string } | undefined;
      if (recorded && recorded.value !== mode) throw new Error("DATABASE_MODE_MISMATCH");
      if (mode === "live") {
        const fixture = sqlite.prepare("SELECT id FROM articles WHERE is_fixture = 1 LIMIT 1").get();
        if (fixture) throw new Error("FIXTURES_NOT_ALLOWED_IN_LIVE_DATABASE");
      }
      sqlite.prepare("INSERT OR IGNORE INTO app_meta(key, value) VALUES('database_mode', ?)").run(mode);
      sqlite.prepare("INSERT OR IGNORE INTO app_meta(key, value) VALUES('schema_version', '1')").run();
    })();
    return { sqlite, orm: drizzle(sqlite, { schema }), mode, path: databasePath };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

export type AppDatabase = ReturnType<typeof createDatabase>;
const databaseGlobal = globalThis as typeof globalThis & { parempiaDatabase?: AppDatabase };

export function getDatabase(): AppDatabase {
  const mode = isDemoMode() ? "demo" : "live";
  const configuredPath = process.env.DATABASE_PATH || "data/parempia.sqlite";
  if (mode === "demo" && !process.env.DATABASE_PATH) throw new Error("DEMO_DATABASE_PATH_REQUIRED");
  const path = resolve(/* turbopackIgnore: true */ configuredPath);
  if (databaseGlobal.parempiaDatabase?.path !== path || databaseGlobal.parempiaDatabase.mode !== mode) {
    databaseGlobal.parempiaDatabase?.sqlite.close();
    databaseGlobal.parempiaDatabase = createDatabase(path, { mode });
  }
  return databaseGlobal.parempiaDatabase;
}
