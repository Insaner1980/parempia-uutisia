import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, adminCookieOptions, isSameOrigin } from "@/server/auth";
import { siteBase } from "@/lib/metadata";
import { adminResponse } from "../request";

export function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return adminResponse("Pyyntöä ei sallita.", 403);
  const response = NextResponse.redirect(new URL("/hallinta", siteBase()), 303);
  response.cookies.set(ADMIN_COOKIE_NAME, "", { ...adminCookieOptions(), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
