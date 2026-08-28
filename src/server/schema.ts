import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { ArticleStatus, CategorySlug, ImageMetadata, Region, SourceType } from "../lib/domain";

export const appMeta = sqliteTable("app_meta", { key: text("key").primaryKey(), value: text("value").notNull() });

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  homepageUrl: text("homepage_url").notNull(),
  feedUrl: text("feed_url"),
  language: text("language").notNull(),
  defaultRegion: text("default_region").$type<Region>().notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  trustLevel: text("trust_level").$type<"high" | "medium" | "low">().notNull(),
  sourceType: text("source_type").$type<SourceType>().notNull(),
  fetchMethod: text("fetch_method").$type<"rss" | "json-feed" | "json-api">().notNull(),
  articleExtractionAllowed: integer("article_extraction_allowed", { mode: "boolean" }).notNull().default(false),
  imagesAllowed: integer("images_allowed", { mode: "boolean" }).notNull().default(false),
  imageReusePolicy: text("image_reuse_policy").notNull(),
  contentLicense: text("content_license"),
  contentLicenseUrl: text("content_license_url"),
  rateLimitMs: integer("rate_limit_ms").notNull().default(2000),
  verificationNotes: text("verification_notes").notNull(),
  termsUrl: text("terms_url"),
  endpointVerifiedAt: text("endpoint_verified_at"),
  lastFetchedAt: text("last_fetched_at"),
  lastSuccessAt: text("last_success_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id),
  canonicalUrl: text("canonical_url").notNull(),
  originalTitle: text("original_title").notNull(),
  originalExcerpt: text("original_excerpt").notNull(),
  sourceLanguage: text("source_language").notNull(),
  sourcePublishedAt: text("source_published_at").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  titleFi: text("title_fi").notNull(),
  summaryFi: text("summary_fi").notNull(),
  slug: text("slug").notNull(),
  primaryCategory: text("primary_category").$type<CategorySlug>(),
  region: text("region").$type<Region>(),
  keywords: text("keywords", { mode: "json" }).$type<string[]>().notNull(),
  status: text("status").$type<ArticleStatus>().notNull(),
  decisionReason: text("decision_reason").notNull(),
  positiveCentrality: real("positive_centrality").notNull().default(0),
  factualConfidence: real("factual_confidence").notNull().default(0),
  sourceSufficiency: real("source_sufficiency").notNull().default(0),
  rankingScore: real("ranking_score").notNull().default(0),
  publishedAt: text("published_at"),
  normalizedTitle: text("normalized_title").notNull(),
  namedEntities: text("named_entities", { mode: "json" }).$type<string[]>().notNull(),
  fingerprint: text("fingerprint", { mode: "json" }).$type<string[]>().notNull(),
  searchText: text("search_text").notNull(),
  image: text("image", { mode: "json" }).$type<ImageMetadata | null>(),
  isFixture: integer("is_fixture", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("articles_canonical_url_unique").on(table.canonicalUrl),
  uniqueIndex("articles_slug_unique").on(table.slug),
  index("articles_status_date_idx").on(table.status, table.sourcePublishedAt),
  index("articles_region_date_idx").on(table.region, table.sourcePublishedAt),
  index("articles_category_date_idx").on(table.primaryCategory, table.sourcePublishedAt),
  index("articles_source_idx").on(table.sourceId),
  index("articles_normalized_title_idx").on(table.normalizedTitle),
]);

export const alternateSources = sqliteTable("alternate_sources", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull().references(() => sources.id),
  canonicalUrl: text("canonical_url").notNull(),
  originalTitle: text("original_title").notNull(),
  sourcePublishedAt: text("source_published_at").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("alternate_sources_url_unique").on(table.canonicalUrl)]);

export const ingestionRuns = sqliteTable("ingestion_runs", {
  id: text("id").primaryKey(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").$type<"running" | "completed" | "partial" | "failed">().notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  fetchedCount: integer("fetched_count").notNull().default(0),
  candidateCount: integer("candidate_count").notNull().default(0),
  publishedCount: integer("published_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  logSummary: text("log_summary").notNull().default(""),
}, (table) => [index("ingestion_runs_started_idx").on(table.startedAt)]);

export const ingestionLock = sqliteTable("ingestion_lock", {
  id: integer("id").primaryKey(),
  owner: text("owner").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const sourceBackoff = sqliteTable("source_backoff", {
  sourceId: text("source_id").primaryKey().references(() => sources.id, { onDelete: "cascade" }),
  retryAt: text("retry_at").notNull(),
});

export type ArticleRow = typeof articles.$inferSelect;
