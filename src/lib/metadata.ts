import type { Metadata } from "next";
import { normalizePublicText } from "./text";

export const SITE_NAME = "Parempia Uutisia";
export const SITE_DESCRIPTION = "Myönteisiä uutisia Suomesta ja maailmalta. Lyhyet suomenkieliset tiivistelmät, tarkistetut lähteet ja suora yhteys alkuperäiseen uutiseen.";

export function siteBase(): URL {
  const configured = process.env.SITE_URL || "http://localhost:3000";
  const url = new URL(configured);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Invalid SITE_URL");
  return new URL(url.origin);
}

export function isIndexable(): boolean {
  const url = siteBase();
  return process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true" && url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
}

export function metadataFor(title: string, description: string, path: string): Metadata {
  const cleanTitle = normalizePublicText(title);
  const cleanDescription = normalizePublicText(description);
  const url = new URL(path, siteBase());
  return {
    title: cleanTitle,
    description: cleanDescription,
    alternates: { canonical: url },
    openGraph: { title: `${cleanTitle} | ${SITE_NAME}`, description: cleanDescription, url, siteName: SITE_NAME, type: "website", locale: "fi_FI" },
    robots: { index: isIndexable(), follow: isIndexable() },
  };
}

export function contactEmail(): string | null {
  const email = process.env.CONTACT_EMAIL?.trim();
  return email && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}
