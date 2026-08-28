import { randomUUID } from "node:crypto";
import { and, eq, gte, like, lte, ne, sql } from "drizzle-orm";
import { CATEGORIES, type IngestionReport } from "../lib/domain";
import { createSlug, normalizeForSearch } from "../lib/text";
import { createAIProvider, FixtureAIProvider, parseAIResult, publicationDecision, type AIProvider, type ProcessedResult } from "./ai";
import { canonicalizeUrl, extractNamedEntities, fingerprintText, isDuplicate, type DuplicateSignals } from "./canonical";
import { getDatabase, type AppDatabase } from "./db";
import { configuredNumber } from "./env";
import { extractArticleText, normalizeCandidate, parseFeed, type Candidate } from "./feed";
import { FetchFailure, SourceHttpClient, validateAllowedUrl } from "./http";
import { alternateSources, articles, ingestionRuns, sourceBackoff, sources, type ArticleRow } from "./schema";
import { SOURCE_REGISTRY, type SourceConfig } from "./source-registry";
import { enabledSourceConfigs, syncSources } from "./sources";

const MAX_RUN_MS = 10 * 60_000;
const LOCK_LEASE_MS = 12 * 60_000;

export function acquireIngestionLock(database: AppDatabase, owner: string, now = Date.now()): boolean {
  return database.sqlite.transaction(() => {
    const current = database.sqlite.prepare("SELECT owner, expires_at FROM ingestion_lock WHERE id = 1").get() as { owner: string; expires_at: string } | undefined;
    if (current && Date.parse(current.expires_at) > now) return false;
    if (current) {
      database.orm.update(ingestionRuns).set({ status: "failed", finishedAt: new Date(now).toISOString(), errorCount: sql`${ingestionRuns.errorCount} + 1`, logSummary: "Keskeytynyt ajo vapautettiin lukon määräajan jälkeen." })
        .where(and(eq(ingestionRuns.id, current.owner), eq(ingestionRuns.status, "running"))).run();
      database.sqlite.prepare("DELETE FROM ingestion_lock WHERE id = 1").run();
    }
    database.sqlite.prepare("INSERT INTO ingestion_lock(id, owner, expires_at) VALUES(1, ?, ?)").run(owner, new Date(now + LOCK_LEASE_MS).toISOString());
    return true;
  }).immediate();
}

export function releaseIngestionLock(database: AppDatabase, owner: string): void {
  database.sqlite.prepare("DELETE FROM ingestion_lock WHERE id = 1 AND owner = ?").run(owner);
}

function conciseError(error: unknown): string {
  if (error instanceof FetchFailure) {
    if (error.code.startsWith("ROBOTS")) return "Lähteen robots-säännöt estävät haun tai niitä ei voitu varmistaa.";
    if (["PRIVATE_ADDRESS", "PRIVATE_HOST", "HOST_NOT_ALLOWED", "UNSAFE_URL", "INVALID_URL"].includes(error.code)) return "Osoite ei läpäissyt turvallisuustarkistusta.";
    if (/^HTTP_\d{3}$/.test(error.code)) return `Lähde vastasi tilakoodilla ${error.code.slice(5)}.`;
    if (error.code === "RESPONSE_TOO_LARGE") return "Lähteen vastaus ylitti kokorajan.";
    if (error.code === "PUBLICATION_DATE_REQUIRED") return "Uutiselta puuttuu kelvollinen julkaisuaika.";
    if (error.code === "EXTRACTION_NOT_ALLOWED") return "Artikkelisivun poimintaa ei ole sallittu.";
    if (error.code === "RETRY_AFTER_DEFERRED") return "Lähde pyysi odottamaan. Uutishaku ohittaa lähteen ilmoitettuun ajankohtaan asti.";
    if (error.code.includes("TIMEOUT")) return "Haun aikaraja ylittyi.";
    if (error.code.startsWith("FEED") || error.code.startsWith("XML")) return "Lähteen syötettä ei voitu käsitellä.";
  }
  return "Käsittely epäonnistui. Lähdetekstiä tai salaisia asetuksia ei tallennettu lokiin.";
}

function findDuplicate(database: AppDatabase, signals: DuplicateSignals, excludeId?: string): ArticleRow | undefined {
  const excludeSelf = excludeId ? ne(articles.id, excludeId) : undefined;
  const canonical = database.orm.select().from(articles).where(and(eq(articles.canonicalUrl, signals.canonicalUrl), excludeSelf)).get();
  if (canonical) return canonical;
  const alternate = database.orm.select({ article: articles }).from(alternateSources)
    .innerJoin(articles, eq(alternateSources.articleId, articles.id)).where(and(eq(alternateSources.canonicalUrl, signals.canonicalUrl), excludeSelf)).get();
  if (alternate) return alternate.article;
  const timestamp = Date.parse(signals.sourcePublishedAt);
  const nearby = database.orm.select().from(articles).where(and(
    gte(articles.sourcePublishedAt, new Date(timestamp - 7 * 86_400_000).toISOString()),
    lte(articles.sourcePublishedAt, new Date(timestamp + 7 * 86_400_000).toISOString()),
    excludeSelf,
  )).all();
  return nearby.find((article) => isDuplicate(signals, article));
}

function candidateRow(candidate: Candidate, now: string, existing?: ArticleRow): typeof articles.$inferInsert {
  const id = existing?.id ?? randomUUID();
  return {
    id, sourceId: candidate.sourceId, canonicalUrl: candidate.canonicalUrl,
    originalTitle: candidate.originalTitle, originalExcerpt: candidate.originalExcerpt.slice(0, 500),
    sourceLanguage: candidate.sourceLanguage, sourcePublishedAt: candidate.sourcePublishedAt, fetchedAt: now,
    titleFi: "", summaryFi: "", slug: existing?.slug ?? createSlug(candidate.originalTitle, id),
    primaryCategory: null, region: null, keywords: [], status: "pending",
    decisionReason: "AI-palvelua ei ole määritetty. Uutista ei julkaistu.",
    positiveCentrality: 0, factualConfidence: 0, sourceSufficiency: 0, rankingScore: 0, publishedAt: null,
    normalizedTitle: candidate.normalizedTitle, namedEntities: candidate.namedEntities, fingerprint: candidate.fingerprint,
    searchText: "", image: null, isFixture: candidate.isFixture, createdAt: existing?.createdAt ?? now, updatedAt: now,
  };
}

function saveRow(database: AppDatabase, row: typeof articles.$inferInsert): void {
  database.orm.insert(articles).values(row).onConflictDoUpdate({ target: articles.id, set: row }).run();
}

function sourceStrength(source: Pick<SourceConfig, "trustLevel" | "sourceType">, sufficiency: number): number {
  return ({ high: 30, medium: 20, low: 10 }[source.trustLevel]) + (source.sourceType === "independent" ? 2 : 0) + 5 * sufficiency;
}

function addAlternate(database: AppDatabase, targetId: string, candidate: Pick<Candidate, "sourceId" | "canonicalUrl" | "originalTitle" | "sourcePublishedAt">, now: string): void {
  database.orm.insert(alternateSources).values({ id: randomUUID(), articleId: targetId, sourceId: candidate.sourceId, canonicalUrl: candidate.canonicalUrl, originalTitle: candidate.originalTitle, sourcePublishedAt: candidate.sourcePublishedAt, createdAt: now })
    .onConflictDoNothing({ target: alternateSources.canonicalUrl }).run();
}

function mergeDuplicate(database: AppDatabase, duplicate: ArticleRow, row: typeof articles.$inferInsert, source: SourceConfig, now: string, pendingId?: string): boolean {
  const previousSource = database.orm.select().from(sources).where(eq(sources.id, duplicate.sourceId)).get()!;
  const replace = duplicate.status !== "withdrawn" && row.status === "published"
    && (duplicate.status !== "published" || sourceStrength(source, row.sourceSufficiency ?? 0) > sourceStrength(previousSource, duplicate.sourceSufficiency));
  database.sqlite.transaction(() => {
    if (pendingId && pendingId !== duplicate.id) {
      database.orm.update(alternateSources).set({ articleId: duplicate.id }).where(eq(alternateSources.articleId, pendingId)).run();
      database.orm.delete(articles).where(and(eq(articles.id, pendingId), eq(articles.status, "pending"))).run();
    }
    if (replace) {
      if (duplicate.canonicalUrl !== row.canonicalUrl) addAlternate(database, duplicate.id, duplicate, now);
      database.orm.update(articles).set({ ...row, id: duplicate.id, slug: duplicate.slug, createdAt: duplicate.createdAt }).where(eq(articles.id, duplicate.id)).run();
    } else if (duplicate.canonicalUrl !== row.canonicalUrl) {
      addAlternate(database, duplicate.id, row as ArticleRow, now);
    }
  })();
  return replace && duplicate.status !== "published";
}

function processedRow(row: typeof articles.$inferInsert, candidate: Candidate, result: ProcessedResult, source: SourceConfig, now: string): typeof articles.$inferInsert {
  const decision = publicationDecision(result, candidate);
  const ageDays = Math.max(0, (Date.parse(now) - Date.parse(candidate.sourcePublishedAt)) / 86_400_000);
  return {
    ...row, titleFi: result.titleFi, summaryFi: result.summaryFi,
    slug: createSlug(result.titleFi, row.id), primaryCategory: result.primaryCategory, region: result.region,
    keywords: result.keywords, status: decision.publish ? "published" : "rejected", decisionReason: decision.reason,
    positiveCentrality: result.positiveCentrality, factualConfidence: result.factualConfidence, sourceSufficiency: result.sourceSufficiency,
    rankingScore: result.positiveCentrality * 0.3 + result.factualConfidence * 0.3 + result.sourceSufficiency * 0.15 + result.publicImportance * 0.1
      + ({ high: 0.1, medium: 0.06, low: 0.02 }[source.trustLevel]) + 0.05 / (1 + ageDays),
    publishedAt: decision.publish ? now : null, normalizedTitle: normalizeForSearch(result.titleFi),
    namedEntities: [...new Set([...candidate.namedEntities, ...extractNamedEntities(`${result.titleFi} ${result.summaryFi}`)])].slice(0, 40),
    fingerprint: fingerprintText(`${result.titleFi} ${result.summaryFi} ${result.keywords.join(" ")}`),
    searchText: normalizeForSearch(`${result.titleFi} ${result.summaryFi} ${source.name} ${result.keywords.join(" ")}`),
  };
}

export interface IngestionOptions {
  database?: AppDatabase;
  registry?: SourceConfig[];
  provider?: AIProvider;
  fetchText?: (url: string, source: SourceConfig, allowedPathPrefixes?: string[]) => Promise<string>;
  fixtureFeeds?: Record<string, string>;
  now?: () => number;
}

export async function runIngestion(options: IngestionOptions = {}): Promise<IngestionReport> {
  const database = options.database ?? getDatabase();
  const now = options.now ?? Date.now;
  const started = now();
  const id = randomUUID();
  const report: IngestionReport = {
    id, status: "running", startedAt: new Date(started).toISOString(), finishedAt: null, sourceCount: 0,
    fetchedCount: 0, candidateCount: 0, publishedCount: 0, rejectedCount: 0, duplicateCount: 0, errorCount: 0, logSummary: "",
  };
  if (!acquireIngestionLock(database, id, started)) return { ...report, status: "locked", finishedAt: report.startedAt, logSummary: "Uutishaku on jo käynnissä." };
  database.orm.insert(ingestionRuns).values({ ...report, status: "running" }).run();
  const logs: string[] = [];
  let successfulSources = 0;
  try {
    if ((database.mode === "demo") !== Boolean(options.fixtureFeeds)) throw new Error("INGESTION_MODE_MISMATCH");
    const registry = options.registry ?? SOURCE_REGISTRY;
    syncSources(database, options.fixtureFeeds ? registry.map((source) => ({ ...source, enabled: false, feedUrl: null, endpointVerifiedAt: null })) : registry);
    const configured = options.fixtureFeeds ? registry.filter((source) => Object.hasOwn(options.fixtureFeeds!, source.id)) : enabledSourceConfigs(database, registry, now());
    report.sourceCount = configured.length;
    const provider = options.provider ?? createAIProvider();
    if (provider.kind === "mock" && database.mode !== "demo") throw new Error("MOCK_NOT_ALLOWED_IN_LIVE_DATABASE");
    const maxAgeDays = configuredNumber("INGEST_MAX_AGE_DAYS", 30, 1, 90);
    const maxItems = configuredNumber("INGEST_MAX_ITEMS_PER_SOURCE", 20, 1, 40);
    const deadline = started + MAX_RUN_MS;
    for (const source of configured) {
      if (now() >= deadline) { report.errorCount++; logs.push("Ajon aikaraja ylittyi."); break; }
      const client = new SourceHttpClient(source, { deadlineAt: deadline, now });
      const fetchText = options.fetchText ?? ((_url: string, _source: SourceConfig, paths?: string[]) => client.get(_url, paths));
      database.orm.update(sources).set({ lastFetchedAt: new Date(now()).toISOString(), lastError: null }).where(eq(sources.id, source.id)).run();
      try {
        validateAllowedUrl(source.feedUrl!, source.allowedHosts);
        const body = options.fixtureFeeds ? options.fixtureFeeds[source.id] : await fetchText(source.feedUrl!, source);
        const items = parseFeed(body, source).slice(0, maxItems);
        report.fetchedCount += items.length;
        successfulSources++;
        database.orm.update(sources).set({ lastSuccessAt: new Date(now()).toISOString(), lastError: null }).where(eq(sources.id, source.id)).run();
        for (const item of items) {
          if (now() >= deadline) { report.errorCount++; logs.push("Ajon aikaraja ylittyi."); break; }
          try {
            let candidate = normalizeCandidate(item, source, Boolean(options.fixtureFeeds));
            report.candidateCount++;
            const timestamp = new Date(now()).toISOString();
            const duplicateBefore = findDuplicate(database, candidate);
            const exactExisting = duplicateBefore?.canonicalUrl === candidate.canonicalUrl ? duplicateBefore : undefined;
            if (exactExisting && exactExisting.status !== "pending") { report.duplicateCount++; continue; }
            let row = candidateRow(candidate, timestamp, exactExisting);
            const age = now() - Date.parse(candidate.sourcePublishedAt);
            if (age > maxAgeDays * 86_400_000 || age < -5 * 60_000) {
              row.status = "rejected"; row.decisionReason = "Uutisen julkaisuaika ei ole sallitussa aikaikkunassa.";
              saveRow(database, row); report.rejectedCount++; continue;
            }
            if (!provider.available) {
              if (duplicateBefore && !exactExisting) {
                addAlternate(database, duplicateBefore.id, candidate, timestamp); report.duplicateCount++;
              } else saveRow(database, row);
              continue;
            }
            if (source.articleExtractionAllowed && candidate.sourceText.length < 1000 && !candidate.isFixture) {
              try {
                const html = await fetchText(candidate.canonicalUrl, source, source.allowedArticlePathPrefixes);
                const extracted = extractArticleText(html, source, candidate.canonicalUrl);
                if (extracted.length > candidate.sourceText.length) candidate = normalizeCandidate({ ...item, content: extracted }, source);
                row = candidateRow(candidate, timestamp, exactExisting);
              } catch (error) {
                if (error instanceof FetchFailure && error.retryAt) throw error;
                report.errorCount++; logs.push(`${source.id}: ${conciseError(error)}`);
              }
            }
            let output: unknown;
            try { output = await provider.process(candidate); }
            catch {
              row.decisionReason = "AI-palvelu ei ollut käytettävissä. Uutista ei julkaistu.";
              logs.push(`${source.id}: ${row.decisionReason}`);
              saveRow(database, row); report.errorCount++; continue;
            }
            try { row = processedRow(row, candidate, parseAIResult(output), source, timestamp); }
            catch {
              row.status = "rejected"; row.decisionReason = "AI-vastaus ei täyttänyt vaadittua rakennetta tai asetuksia.";
              logs.push(`${source.id}: ${row.decisionReason}`);
              report.errorCount++;
            }
            const duplicateAfter = findDuplicate(database, row as ArticleRow, exactExisting?.id)
              ?? (duplicateBefore?.id !== exactExisting?.id ? duplicateBefore : undefined);
            if (duplicateAfter) {
              if (mergeDuplicate(database, duplicateAfter, row, source, timestamp, exactExisting?.id)) report.publishedCount++;
              report.duplicateCount++;
            } else {
              saveRow(database, row);
              if (row.status === "published") report.publishedCount++;
              if (row.status === "rejected") report.rejectedCount++;
            }
          } catch (error) {
            if (error instanceof FetchFailure && error.retryAt) throw error;
            report.errorCount++; logs.push(`${source.id}: ${conciseError(error)}`);
          }
        }
      } catch (error) {
        const message = conciseError(error);
        database.orm.update(sources).set({ lastError: message }).where(eq(sources.id, source.id)).run();
        if (error instanceof FetchFailure && error.retryAt) {
          database.orm.insert(sourceBackoff).values({ sourceId: source.id, retryAt: new Date(error.retryAt).toISOString() })
            .onConflictDoUpdate({ target: sourceBackoff.sourceId, set: { retryAt: new Date(error.retryAt).toISOString() } }).run();
        }
        report.errorCount++; logs.push(`${source.id}: ${message}`);
      }
    }
    if (!provider.available) logs.push("AI-palvelua ei ole määritetty. Uudet ehdokkaat odottavat julkaisemattomina.");
    report.status = report.errorCount ? (successfulSources ? "partial" : "failed") : "completed";
  } catch (error) {
    report.status = "failed"; report.errorCount++;
    logs.push(error instanceof Error && error.message === "INGESTION_MODE_MISMATCH"
      ? "Kehitysaineisto ei käytä oikeita lähteitä. Alusta esimerkit komennolla pnpm seed:demo."
      : conciseError(error));
  } finally {
    report.finishedAt = new Date(now()).toISOString();
    report.logSummary = logs.slice(0, 12).join(" ").slice(0, 1600) || "Uutishaku valmistui.";
    try {
      database.orm.update(ingestionRuns).set({ ...report, status: report.status === "locked" ? "failed" : report.status }).where(eq(ingestionRuns.id, id)).run();
    } finally { releaseIngestionLock(database, id); }
  }
  return report;
}

/** Explicit development replay. It never makes source or AI network requests. */
export async function runDemoIngestion(database = getDatabase()): Promise<IngestionReport> {
  if (database.mode !== "demo") throw new Error("DEMO_REPLAY_REQUIRES_DEMO_DATABASE");
  const fixtureRows = database.orm.select({ article: articles, source: sources }).from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id)).where(and(eq(articles.isFixture, true), like(articles.id, "demo-%"))).all();
  const registry: SourceConfig[] = [];
  const fixtureFeeds: Record<string, string> = {};
  const results: Record<string, unknown> = {};
  for (const sourceId of new Set(fixtureRows.map((row) => row.source.id))) {
    const rows = fixtureRows.filter((row) => row.source.id === sourceId);
    const source = rows[0].source;
    const hosts = [...new Set([new URL(source.homepageUrl).hostname, ...rows.map((row) => new URL(row.article.canonicalUrl).hostname)])];
    registry.push({
      ...source, enabled: false, feedUrl: source.homepageUrl, fetchMethod: "json-feed", allowedHosts: hosts,
      articleExtractionAllowed: false, endpointVerifiedAt: null, verificationNotes: "Paikallinen esimerkkiajo. Ei verkkohakua.",
    });
    fixtureFeeds[sourceId] = JSON.stringify({
      version: "https://jsonfeed.org/version/1.1", title: source.name,
      items: rows.map(({ article }) => ({ id: article.id, url: article.canonicalUrl, title: article.originalTitle, content_text: article.summaryFi, date_published: article.sourcePublishedAt })),
    });
    for (const { article } of rows) {
      results[canonicalizeUrl(article.canonicalUrl)] = {
        publish: true, decisionReason: "Erikseen merkitty paikallinen kehitysaineisto.",
        titleFi: article.titleFi, summaryFi: article.summaryFi,
        primaryCategory: CATEGORIES.find((category) => category.slug === article.primaryCategory)!.label,
        region: article.region, keywords: article.keywords,
        positiveCentrality: 1, factualConfidence: 1, sourceSufficiency: 1, sensitivityFlags: [],
      };
    }
  }
  const result = await runIngestion({ database, registry, fixtureFeeds, provider: new FixtureAIProvider(results), fetchText: async () => { throw new Error("DEMO_NETWORK_FORBIDDEN"); } });
  result.logSummary = `Paikallinen esimerkkiajo. Oikeita lähteitä tai AI-palvelua ei kutsuttu. ${result.logSummary}`;
  if (result.status !== "locked") database.orm.update(ingestionRuns).set({ logSummary: result.logSummary }).where(eq(ingestionRuns.id, result.id)).run();
  return result;
}
