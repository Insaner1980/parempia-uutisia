import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, adminCookieOptions, createAdminToken, isAdminConfigured, isSameOrigin, verifyAdminSecret } from "@/server/auth";
import { siteBase } from "@/lib/metadata";
import { adminResponse, readAdminForm } from "../request";

const attempts = globalThis as typeof globalThis & { adminLoginAttempts?: { count: number; since: number } };

export async function POST(request: NextRequest) {
  if (!isAdminConfigured()) return adminResponse("Hallinta ei ole käytössä.", 503);
  if (!isSameOrigin(request)) return adminResponse("Pyyntöä ei sallita.", 403);
  if (!attempts.adminLoginAttempts || Date.now() - attempts.adminLoginAttempts.since > 60_000) attempts.adminLoginAttempts = { count: 0, since: Date.now() };
  if (++attempts.adminLoginAttempts.count > 10) return NextResponse.redirect(new URL("/hallinta?virhe=raja", siteBase()), 303);
  try {
    const form = await readAdminForm(request);
    if (!verifyAdminSecret(form.get("secret") || "")) return NextResponse.redirect(new URL("/hallinta?virhe=avain", siteBase()), 303);
    attempts.adminLoginAttempts.count = 0;
    const response = NextResponse.redirect(new URL("/hallinta", siteBase()), 303);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminToken(), adminCookieOptions());
    return response;
  } catch { return adminResponse("Kirjautumispyyntö ei kelpaa.", 400); }
}
