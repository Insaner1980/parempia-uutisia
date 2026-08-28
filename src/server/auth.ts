import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "parempia_hallinta";
const SESSION_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  const configured = process.env.ADMIN_SECRET;
  return configured && configured.length >= 32 ? configured : null;
}

export function isAdminConfigured(): boolean { return secret() !== null; }

function signature(value: string, key: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

export function verifyAdminSecret(input: string): boolean {
  const key = secret();
  if (!key || input.length > 1024) return false;
  return timingSafeEqual(signature(input, key), signature(key, key));
}

export function createAdminToken(now = Date.now()): string {
  const key = secret();
  if (!key) throw new Error("ADMIN_NOT_CONFIGURED");
  const payload = Buffer.from(JSON.stringify({ issuedAt: now, expiresAt: now + SESSION_SECONDS * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, key).toString("base64url")}`;
}

export function verifyAdminToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token || token.length > 1024) return false;
  const pieces = token.split(".");
  if (pieces.length !== 2 || !pieces.every((piece) => /^[a-zA-Z0-9_-]+$/.test(piece))) return false;
  try {
    const actual = Buffer.from(pieces[1], "base64url");
    const expected = signature(pieces[0], key);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const payload: unknown = JSON.parse(Buffer.from(pieces[0], "base64url").toString("utf8"));
    if (!payload || typeof payload !== "object") return false;
    const { issuedAt, expiresAt, nonce } = payload as Record<string, unknown>;
    return typeof issuedAt === "number" && typeof expiresAt === "number" && typeof nonce === "string"
      && issuedAt <= now && expiresAt > now && expiresAt - issuedAt === SESSION_SECONDS * 1000 && nonce.length === 32;
  } catch {
    return false;
  }
}

export function adminCookieOptions() {
  return { httpOnly: true, sameSite: "strict" as const, secure: process.env.SITE_URL?.startsWith("https://") ?? false, path: "/", maxAge: SESSION_SECONDS };
}

export function isSameOrigin(request: Request): boolean {
  if (request.method !== "POST") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = new URL(process.env.SITE_URL || "http://localhost:3000").origin;
    return new URL(origin).origin === origin && origin === expected;
  } catch {
    return false;
  }
}
