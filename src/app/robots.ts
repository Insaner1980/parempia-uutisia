import type { MetadataRoute } from "next";
import { isIndexable, siteBase } from "@/lib/metadata";

export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return isIndexable() ? { rules: { userAgent: "*", allow: "/", disallow: ["/hallinta", "/api/", "/haku"] }, sitemap: new URL("/sitemap.xml", siteBase()).href }
    : { rules: { userAgent: "*", disallow: "/" } };
}
