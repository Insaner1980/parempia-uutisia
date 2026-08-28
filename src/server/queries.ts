import { and, asc, count, desc, eq, gte, like, or, sql, type SQL } from "drizzle-orm";
import { getCategory, type Article, type ArticleFilters, type ArticlePage, type SourceRecord } from "../lib/domain";
import { startOfHelsinkiDay } from "../lib/dates";
import { canDisplayImage } from "../lib/images";
import { normalizeForSearch, normalizePublicText } from "../lib/text";
import { getDatabase, type AppDatabase } from "./db";
import { articles, alternateSources, ingestionRuns, sources } from "./schema";
import { SOURCE_REGISTRY } from "./source-registry";
import { syncSources } from "./sources";

function publicConditions(database: AppDatabase): SQL[] {
  return [eq(articles.status, "published"), eq(articles.isFixture, database.mode === "demo")];
}

function toArticle(row: { article: typeof articles.$inferSelect; source: typeof sources.$inferSelect }): Article {
  const { article, source } = row;
  const image = canDisplayImage(article.image) ? {
    ...article.image,
    imageAltFi: normalizePublicText(article.image.imageAltFi),
    imageCaptionFi: normalizePublicText(article.image.imageCaptionFi),
    imageCreator: normalizePublicText(article.image.imageCreator),
    imageLicense: normalizePublicText(article.image.imageLicense),
  } : null;
  return {
    id: article.id, slug: article.slug, titleFi: normalizePublicText(article.titleFi), summaryFi: normalizePublicText(article.summaryFi),
    primaryCategory: article.primaryCategory!, region: article.region!,
    source: {
      id: source.id, name: normalizePublicText(source.name), homepageUrl: source.homepageUrl,
      sourceType: source.sourceType, contentLicense: source.contentLicense, contentLicenseUrl: source.contentLicenseUrl,
    },
    canonicalUrl: article.canonicalUrl, originalTitle: normalizePublicText(article.originalTitle),
    sourcePublishedAt: article.sourcePublishedAt, publishedAt: article.publishedAt!, rankingScore: article.rankingScore,
    keywords: article.keywords.map(normalizePublicText), isFixture: article.isFixture, image,
  };
}

export function getArticles(filters: ArticleFilters = {}, database = getDatabase(), now = new Date()): ArticlePage {
  const conditions = publicConditions(database);
  const query = normalizeForSearch((filters.q ?? "").slice(0, 200));
  if (query) {
    for (const token of query.split(" ").slice(0, 12)) {
      conditions.push(like(articles.searchText, `%${token}%`));
    }
  }
  if (filters.region === "Suomi" || filters.region === "Maailmalta") conditions.push(eq(articles.region, filters.region));
  const category = filters.category ? getCategory(filters.category) : undefined;
  if (category) conditions.push(eq(articles.primaryCategory, category.slug));
  if (filters.source) conditions.push(eq(articles.sourceId, filters.source.slice(0, 100)));
  const from = filters.period === "today" ? startOfHelsinkiDay(now)
    : filters.period === "7" ? new Date(now.getTime() - 7 * 86_400_000)
    : filters.period === "30" ? new Date(now.getTime() - 30 * 86_400_000) : null;
  if (from) conditions.push(gte(articles.sourcePublishedAt, from.toISOString()));
  const total = database.orm.select({ value: count() }).from(articles).where(and(...conditions)).get()?.value ?? 0;
  const pageSize = Math.max(1, Math.min(50, Math.floor(filters.pageSize ?? 12)) || 12);
  const requestedPage = Math.max(1, Math.min(10_000, Math.floor(Number(filters.page ?? 1))) || 1);
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
  const order = filters.sort === "oldest" ? asc(articles.sourcePublishedAt) : desc(articles.sourcePublishedAt);
  const rows = database.orm.select({ article: articles, source: sources }).from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id)).where(and(...conditions))
    .orderBy(order, asc(articles.id)).limit(pageSize).offset((page - 1) * pageSize).all();
  return { items: rows.map(toArticle), total, page, pageSize };
}

export function getArticleBySlug(slug: string, database = getDatabase()): Article | null {
  if (slug.length > 180) return null;
  const row = database.orm.select({ article: articles, source: sources }).from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(...publicConditions(database), eq(articles.slug, slug))).get();
  return row ? toArticle(row) : null;
}

export function getHomeArticles(database = getDatabase()): Article[] {
  return getArticles({ pageSize: 50 }, database).items
    .sort((a, b) => b.rankingScore - a.rankingScore || b.sourcePublishedAt.localeCompare(a.sourcePublishedAt));
}

export function getSources(database = getDatabase()): SourceRecord[] {
  syncSources(database);
  const condition = database.mode === "demo"
    ? or(eq(sources.enabled, true), like(sources.id, "demo-%"))
    : eq(sources.enabled, true);
  return database.orm.select().from(sources).where(condition).orderBy(asc(sources.name)).all();
}

export function getAdminOverview(database = getDatabase()) {
  syncSources(database);
  const totals = database.orm.select({ status: articles.status, value: count() }).from(articles).groupBy(articles.status).all();
  const byStatus = Object.fromEntries(totals.map((row) => [row.status, row.value]));
  const duplicates = database.orm.select({ value: count() }).from(alternateSources).get()?.value ?? 0;
  const failed = database.orm.select({ value: sql<number>`coalesce(sum(${ingestionRuns.errorCount}), 0)` }).from(ingestionRuns).get()?.value ?? 0;
  return {
    counts: { published: byStatus.published ?? 0, pending: byStatus.pending ?? 0, rejected: byStatus.rejected ?? 0, withdrawn: byStatus.withdrawn ?? 0, duplicates, failed },
    sources: database.orm.select().from(sources).orderBy(asc(sources.name)).all(),
    runs: database.orm.select().from(ingestionRuns).orderBy(desc(ingestionRuns.startedAt)).limit(10).all(),
    articles: database.orm.select({
      id: articles.id, titleFi: articles.titleFi, originalTitle: articles.originalTitle, status: articles.status,
      decisionReason: articles.decisionReason, sourceName: sources.name, sourcePublishedAt: articles.sourcePublishedAt,
    }).from(articles).innerJoin(sources, eq(articles.sourceId, sources.id)).orderBy(desc(articles.updatedAt)).limit(50).all(),
  };
}

export function setSourceEnabled(id: string, enabled: boolean, database = getDatabase()): boolean {
  const configured = SOURCE_REGISTRY.find((source) => source.id === id);
  if (!configured || (enabled && (!configured.feedUrl || !configured.endpointVerifiedAt))) return false;
  syncSources(database);
  const result = database.orm.update(sources).set({ enabled, updatedAt: new Date().toISOString() }).where(eq(sources.id, id)).run();
  return result.changes > 0;
}

export function withdrawArticle(id: string, database = getDatabase()): boolean {
  return database.orm.update(articles).set({ status: "withdrawn", decisionReason: "Ylläpito poisti uutisen julkaisusta.", updatedAt: new Date().toISOString() })
    .where(and(eq(articles.id, id), eq(articles.status, "published"))).run().changes > 0;
}
