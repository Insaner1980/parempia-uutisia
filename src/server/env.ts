import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadLocalEnvironment(): void {
  for (const filename of [".env.local", ".env"]) {
    const path = resolve(/* turbopackIgnore: true */ process.cwd(), filename);
    if (existsSync(path)) process.loadEnvFile(path);
  }
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

export function configuredNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`INVALID_${name}`);
  return parsed;
}
