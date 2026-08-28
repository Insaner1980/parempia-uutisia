import { eq } from "drizzle-orm";
import type { Article, ArticleSource, Region } from "../lib/domain";
import { canDisplayImage } from "../lib/images";
import { normalizeForSearch, normalizePublicText } from "../lib/text";
import type { AppDatabase } from "./db";
import { canonicalizeUrl, fingerprintText } from "./canonical";
import { articles, sources } from "./schema";

export interface FixtureSource extends ArticleSource { defaultRegion: Region }

export function seedFixtureArticles(database: AppDatabase, items: Article[], fixtureSources: FixtureSource[]): void {
  if (database.mode !== "demo") throw new Error("FIXTURE_SEED_REQUIRES_DEMO_DATABASE");
  if (items.some((article) => !article.isFixture || !article.id.startsWith("demo-") || !article.source.id.startsWith("demo-"))) throw new Error("INVALID_FIXTURE_ARTICLE");
  if (fixtureSources.some((source) => !source.id.startsWith("demo-"))) throw new Error("INVALID_FIXTURE_SOURCE");
  const now = new Date().toISOString();
  database.sqlite.transaction(() => {
    for (const source of fixtureSources) {
      database.orm.insert(sources).values({
        ...source, language: "fi", enabled: false, trustLevel: "high", fetchMethod: "rss",
        articleExtractionAllowed: false, imagesAllowed: true, imageReusePolicy: "Erikseen tarkistettu kehitysaineisto.",
        rateLimitMs: 2000, verificationNotes: "Näkyvästi merkitty kehitysaineisto. Ei mukana uutishaussa.",
        createdAt: now, updatedAt: now,
      }).onConflictDoUpdate({ target: sources.id, set: { name: source.name, updatedAt: now } }).run();
    }
    for (const article of items) {
      if (article.image && !canDisplayImage(article.image)) throw new Error("INVALID_FIXTURE_IMAGE_RIGHTS");
      const titleFi = normalizePublicText(article.titleFi);
      const summaryFi = normalizePublicText(article.summaryFi);
      const row: typeof articles.$inferInsert = {
        id: article.id, sourceId: article.source.id, canonicalUrl: canonicalizeUrl(article.canonicalUrl),
        originalTitle: normalizePublicText(article.originalTitle), originalExcerpt: "Kehitysaineisto. Ei oikea uutisjulkaisu.",
        sourceLanguage: "fi", sourcePublishedAt: article.sourcePublishedAt, fetchedAt: now,
        titleFi, summaryFi, slug: article.slug, primaryCategory: article.primaryCategory, region: article.region,
        keywords: article.keywords.map(normalizePublicText), status: "published", decisionReason: "Kehitysaineisto, merkitty erikseen.",
        positiveCentrality: 1, factualConfidence: 1, sourceSufficiency: 1, rankingScore: article.rankingScore,
        publishedAt: article.publishedAt, normalizedTitle: normalizeForSearch(titleFi), namedEntities: [],
        fingerprint: fingerprintText(`${titleFi} ${summaryFi}`), searchText: normalizeForSearch(`${titleFi} ${summaryFi} ${article.source.name} ${article.keywords.join(" ")}`),
        image: article.image, isFixture: true, createdAt: now, updatedAt: now,
      };
      const existing = database.orm.select({ isFixture: articles.isFixture }).from(articles).where(eq(articles.id, article.id)).get();
      if (existing && !existing.isFixture) throw new Error("FIXTURE_WOULD_OVERWRITE_LIVE_ARTICLE");
      database.orm.insert(articles).values(row).onConflictDoUpdate({ target: articles.id, set: row }).run();
    }
  })();
}
