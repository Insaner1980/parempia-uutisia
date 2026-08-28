import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/domain";
import { isIndexable, siteBase } from "@/lib/metadata";
import { getArticles } from "@/server/queries";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexable()) return [];
  const paths = ["/", "/uusimmat", "/suomi", "/maailmalta", "/lahteet", "/miten-tama-toimii", "/tietoa", "/tietosuoja", ...CATEGORIES.map((category) => `/aihe/${category.slug}`)];
  const result: MetadataRoute.Sitemap = paths.map((path) => ({ url: new URL(path, siteBase()).href }));
  let page = 1;
  for (;;) {
    const data = getArticles({ page, pageSize: 50 });
    for (const article of data.items) if (!article.isFixture) result.push({ url: new URL(`/uutinen/${article.slug}`, siteBase()).href, lastModified: article.publishedAt });
    if (page * data.pageSize >= data.total) break;
    page++;
  }
  return result;
}
