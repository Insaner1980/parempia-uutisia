import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import { createDemoArticles, demoSources } from "../fixtures/articles";
import { FixtureAIProvider, type AIProvider } from "../src/server/ai";
import { createDatabase } from "../src/server/db";
import { seedFixtureArticles } from "../src/server/fixtures";
import { acquireIngestionLock, releaseIngestionLock, runDemoIngestion, runIngestion } from "../src/server/ingest";
import { getArticleBySlug, getArticles, getHomeArticles, getSources, withdrawArticle } from "../src/server/queries";
import { FetchFailure } from "../src/server/http";
import { alternateSources, articles, ingestionRuns, sources } from "../src/server/schema";
import type { SourceConfig } from "../src/server/source-registry";

const NOW = Date.parse("2026-08-27T12:00:00.000Z");
const source: SourceConfig = {
  id: "test-source", name: "Testilähde", homepageUrl: "https://news.example.org/", feedUrl: "https://news.example.org/feed",
  language: "en", defaultRegion: "Suomi", enabled: true, trustLevel: "high", sourceType: "institution", fetchMethod: "rss",
  allowedHosts: ["news.example.org"], articleExtractionAllowed: false, imagesAllowed: false, imageReusePolicy: "Ei kuvia.",
  rateLimitMs: 0, termsUrl: "https://news.example.org/terms", endpointVerifiedAt: "2026-08-27", verificationNotes: "Testiaineisto.",
};
const result = {
  publish: true, decisionReason: "Lähde kertoo valmistuneesta myönteisestä hankkeesta.",
  titleFi: "Järven kunnostus valmistui", summaryFi: "Järven vedenkulkua parantava kunnostus on valmistunut. Paikalliset luonnonsuojelun työntekijät seuraavat veden laatua kolmen vuoden ajan. Luonnon palautumista arvioidaan seurannassa, eikä lopullisia ekologisia tuloksia ole vielä käytettävissä.",
  primaryCategory: "Luonto", region: "Maailmalta", keywords: ["järvi", "ennallistaminen"],
  positiveCentrality: 0.95, factualConfidence: 0.97, sourceSufficiency: 0.96, sensitivityFlags: [],
};
const sourceText = "The lake restoration project has been completed after several years of work. Local conservation staff reopened the water channel and will monitor water quality for three years. The project team says the habitat is expected to recover gradually, and no final ecological results are available yet. ".repeat(5);

function rss(url = "https://news.example.org/story", date = "Thu, 27 Aug 2026 10:00:00 GMT", title = "Lake restoration has been completed"): string {
  return `<rss version="2.0"><channel><title>Fixture</title><item><title>${title}</title><link>${url}</link><pubDate>${date}</pubDate><description><![CDATA[<p>${sourceText}</p><script>UNSAFE_SCRIPT_SENTINEL</script>]]></description></item></channel></rss>`;
}
function provider(output: unknown = result): AIProvider { return { kind: "deepseek", available: true, process: async () => output }; }
const unavailable: AIProvider = { kind: "unavailable", available: false, process: async () => { throw new Error("not configured"); } };

test("fixture RSS, real SQLite and explicit AI mock pass through publication eligibility", async () => {
  const database = createDatabase(":memory:", { mode: "demo" });
  try {
    const fixtureProvider = new FixtureAIProvider({ "https://news.example.org/story": result });
    const report = await runIngestion({ database, registry: [source], fixtureFeeds: { [source.id]: rss() }, provider: fixtureProvider, now: () => NOW });
    assert.equal(report.status, "completed");
    assert.equal(report.publishedCount, 1);
    const stored = database.orm.select().from(articles).get()!;
    assert.equal(stored.status, "published");
    assert.equal(stored.region, "Maailmalta", "story geography must not inherit Finnish source geography");
    assert.equal(stored.primaryCategory, "luonto");
    assert.equal(stored.isFixture, true);
    assert.ok(stored.originalExcerpt.length <= 500);
    assert.equal(stored.originalExcerpt.includes("UNSAFE_SCRIPT_SENTINEL"), false);
    assert.equal(stored.summaryFi, result.summaryFi);
    assert.equal(getArticleBySlug(stored.slug, database)?.source.name, source.name);
    assert.equal(database.orm.select().from(ingestionRuns).get()?.publishedCount, 1);
  } finally { database.sqlite.close(); }
});

test("missing AI remains pending and a later real provider run can publish that same candidate", async () => {
  const database = createDatabase(":memory:");
  try {
    const options = { database, registry: [source], fetchText: async () => rss(), now: () => NOW };
    const first = await runIngestion({ ...options, provider: unavailable });
    assert.equal(first.publishedCount, 0);
    assert.equal(database.orm.select().from(articles).get()?.status, "pending");
    assert.equal(getArticles({}, database).total, 0);
    const second = await runIngestion({ ...options, provider: provider() });
    assert.equal(second.publishedCount, 1);
    assert.equal(database.orm.select().from(articles).all().length, 1);
    assert.equal(getArticles({}, database).total, 1);
  } finally { database.sqlite.close(); }
});

test("malformed, insufficient, sensitive and stale results never become public", async () => {
  for (const [output, date] of [
    [{ ...result, factualConfidence: "very high" }, undefined],
    [{ ...result, factualConfidence: 0.5 }, undefined],
    [{ ...result, sensitivityFlags: ["unverified_medical_claim"] }, undefined],
    [result, "Thu, 27 Aug 2020 10:00:00 GMT"],
  ] as const) {
    const database = createDatabase(":memory:");
    try {
      const report = await runIngestion({ database, registry: [source], provider: provider(output), fetchText: async () => rss(undefined, date), now: () => NOW });
      assert.equal(report.publishedCount, 0);
      assert.equal(report.rejectedCount, 1);
      assert.equal(getArticles({}, database).total, 0);
      assert.equal(database.orm.select().from(articles).get()?.status, "rejected");
    } finally { database.sqlite.close(); }
  }
});

test("same event merges references and prefers the stronger source without duplicate cards", async () => {
  const database = createDatabase(":memory:");
  const weak = { ...source, id: "weak", trustLevel: "medium" as const, sourceType: "organization" as const, feedUrl: "https://news.example.org/weak-feed" };
  const strong = { ...source, id: "strong", sourceType: "independent" as const, feedUrl: "https://news.example.org/strong-feed" };
  try {
    const report = await runIngestion({ database, registry: [weak, strong], provider: provider(), fetchText: async (_url, configured) => rss(`https://news.example.org/${configured.id}`), now: () => NOW });
    assert.equal(report.publishedCount, 1);
    assert.equal(report.duplicateCount, 1);
    const stored = database.orm.select().from(articles).all();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].sourceId, "strong");
    assert.equal(database.orm.select().from(alternateSources).get()?.canonicalUrl, "https://news.example.org/weak");
    assert.equal(getArticles({}, database).total, 1);
  } finally { database.sqlite.close(); }
});

test("one failing source is isolated and error logs contain neither response data nor credentials", async () => {
  const database = createDatabase(":memory:");
  const broken = { ...source, id: "broken", feedUrl: "https://news.example.org/broken" };
  try {
    const report = await runIngestion({ database, registry: [broken, source], provider: unavailable,
      fetchText: async (_url, configured) => { if (configured.id === "broken") throw new Error("Bearer PRIVATE_KEY_123 copyrighted full response text"); return rss(); }, now: () => NOW });
    assert.equal(report.status, "partial");
    assert.equal(report.errorCount, 1);
    assert.equal(report.candidateCount, 1);
    assert.equal(report.logSummary.includes("PRIVATE_KEY_123"), false);
    assert.equal(report.logSummary.includes("copyrighted"), false);
    const brokenRow = database.orm.select().from(sources).where(eq(sources.id, "broken")).get()!;
    assert.ok(brokenRow.lastError);
    assert.equal(brokenRow.lastError.includes("PRIVATE_KEY_123"), false);
    assert.ok(database.orm.select().from(sources).where(eq(sources.id, source.id)).get()?.lastSuccessAt);
  } finally { database.sqlite.close(); }
});

test("temporary AI failure is unpublished and retains only a short audit excerpt", async () => {
  const database = createDatabase(":memory:");
  try {
    const failed: AIProvider = { kind: "deepseek", available: true, process: async () => { throw new Error("sensitive upstream response"); } };
    const report = await runIngestion({ database, registry: [source], provider: failed, fetchText: async () => rss(), now: () => NOW });
    assert.equal(report.errorCount, 1);
    const stored = database.orm.select().from(articles).get()!;
    assert.equal(stored.status, "pending");
    assert.ok(stored.originalExcerpt.length < sourceText.length);
    assert.equal(getArticles({}, database).total, 0);
    assert.equal(report.logSummary.includes("sensitive upstream"), false);
  } finally { database.sqlite.close(); }
});

test("withdrawal survives the next ingestion run", async () => {
  const database = createDatabase(":memory:");
  try {
    const options = { database, registry: [source], provider: provider(), fetchText: async () => rss(), now: () => NOW };
    await runIngestion(options);
    const row = database.orm.select().from(articles).get()!;
    assert.equal(withdrawArticle(row.id, database), true);
    assert.equal(getArticleBySlug(row.slug, database), null);
    const replay = await runIngestion(options);
    assert.equal(replay.duplicateCount, 1);
    assert.equal(getArticles({}, database).total, 0);
    assert.equal(database.orm.select().from(articles).get()?.status, "withdrawn");
  } finally { database.sqlite.close(); }
});

test("database lock coordinates separate connections, ignores wrong owner and recovers stale runs", () => {
  const base = resolve(tmpdir());
  const directory = mkdtempSync(join(base, "parempia-lock-"));
  const path = join(directory, "lock.sqlite");
  const first = createDatabase(path);
  const second = createDatabase(path);
  try {
    first.orm.insert(ingestionRuns).values({ id: "first", startedAt: new Date(NOW).toISOString(), status: "running" }).run();
    assert.equal(acquireIngestionLock(first, "first", NOW), true);
    assert.equal(acquireIngestionLock(second, "second", NOW + 1), false);
    releaseIngestionLock(second, "wrong-owner");
    assert.equal(acquireIngestionLock(second, "second", NOW + 2), false);
    assert.equal(acquireIngestionLock(second, "second", NOW + 13 * 60_000), true);
    assert.equal(first.orm.select().from(ingestionRuns).get()?.status, "failed");
    releaseIngestionLock(first, "first");
    assert.equal(acquireIngestionLock(first, "third", NOW + 13 * 60_000), false);
    releaseIngestionLock(second, "second");
  } finally {
    first.sqlite.close(); second.sqlite.close();
    assert.ok(resolve(directory).startsWith(`${base}${sep}parempia-lock-`));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a concurrent ingestion attempt returns locked while the first provider is processing", async () => {
  const database = createDatabase(":memory:");
  let continueProcessing!: () => void;
  let entered!: () => void;
  const providerEntered = new Promise<void>((resolve) => { entered = resolve; });
  const gate = new Promise<void>((resolve) => { continueProcessing = resolve; });
  const slow: AIProvider = { kind: "deepseek", available: true, process: async () => { entered(); await gate; return result; } };
  const options = { database, registry: [source], provider: slow, fetchText: async () => rss(), now: () => NOW };
  try {
    const first = runIngestion(options);
    await providerEntered;
    const second = await runIngestion(options);
    assert.equal(second.status, "locked");
    continueProcessing();
    assert.equal((await first).publishedCount, 1);
    assert.equal(database.sqlite.prepare("SELECT COUNT(*) AS value FROM ingestion_lock").get() && (database.sqlite.prepare("SELECT COUNT(*) AS value FROM ingestion_lock").get() as { value: number }).value, 0);
  } finally { continueProcessing(); database.sqlite.close(); }
});

test("demo data remains isolated, seed is idempotent and production needs explicit preview", () => {
  const live = createDatabase(":memory:");
  const demo = createDatabase(":memory:", { mode: "demo" });
  const previousMode = process.env.NODE_ENV;
  const previousPreview = process.env.ALLOW_DEMO_PREVIEW;
  try {
    const items = createDemoArticles(new Date(NOW));
    assert.throws(() => seedFixtureArticles(live, items, demoSources), /FIXTURE_SEED_REQUIRES_DEMO_DATABASE/);
    seedFixtureArticles(demo, items, demoSources);
    seedFixtureArticles(demo, items, demoSources);
    assert.equal(getArticles({ pageSize: 50 }, demo).total, items.length);
    assert.equal(getArticles({}, live).total, 0);
    assert.throws(() => createDatabase("data/not-demo.sqlite", { mode: "demo" }), /DEMO_DATABASE_NAME_REQUIRED/);
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true, writable: true, enumerable: true });
    delete process.env.ALLOW_DEMO_PREVIEW;
    assert.throws(() => createDatabase(":memory:", { mode: "demo" }), /DEMO_PRODUCTION_PREVIEW_NOT_ENABLED/);
  } finally {
    live.sqlite.close(); demo.sqlite.close();
    if (previousMode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.defineProperty(process.env, "NODE_ENV", { value: previousMode, configurable: true, writable: true, enumerable: true });
    if (previousPreview === undefined) delete process.env.ALLOW_DEMO_PREVIEW; else process.env.ALLOW_DEMO_PREVIEW = previousPreview;
  }
});

test("search covers Finnish text, source and keywords with category, region, date and pagination", () => {
  const database = createDatabase(":memory:", { mode: "demo" });
  try {
    const items = createDemoArticles(new Date(NOW));
    seedFixtureArticles(database, items, demoSources);
    assert.equal(getArticles({ q: "kosteikko" }, database, new Date(NOW)).items.some((item) => item.slug === "demo-ennallistettu-kosteikko"), true);
    assert.ok(getArticles({ q: "NASA" }, database, new Date(NOW)).total > 0);
    const filtered = getArticles({ region: "Suomi", category: "luonto" }, database, new Date(NOW));
    assert.ok(filtered.total > 0);
    assert.ok(filtered.items.every((item) => item.region === "Suomi" && item.primaryCategory === "luonto"));
    assert.ok(getSources(database).some((item) => item.id === "demo-suomi"));
    const bySource = getArticles({ source: "demo-nasa" }, database, new Date(NOW));
    assert.ok(bySource.items.every((item) => item.source.id === "demo-nasa"));
    const today = getArticles({ period: "today", pageSize: 50 }, database, new Date(NOW));
    assert.ok(today.total > 0 && today.total < items.length);
    const firstPage = getArticles({ page: 1, pageSize: 5 }, database);
    const secondPage = getArticles({ page: 2, pageSize: 5 }, database);
    assert.equal(firstPage.items.length, 5);
    assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size, 10);
    assert.equal(getArticles({ q: "' OR 1=1 --" }, database).total, 0);
    assert.equal(getArticles({ q: "ei-loydy-123456" }, database).total, 0);
  } finally { database.sqlite.close(); }
});

test("explicit demo replay uses the same pipeline without live requests and keeps fixtures labelled", async () => {
  const database = createDatabase(":memory:", { mode: "demo" });
  try {
    const items = createDemoArticles(new Date());
    seedFixtureArticles(database, items, demoSources);
    const report = await runDemoIngestion(database);
    assert.equal(report.status, "completed", JSON.stringify(report));
    assert.equal(report.duplicateCount, items.length);
    assert.equal(report.publishedCount, 0);
    assert.match(report.logSummary, /Paikallinen esimerkkiajo/);
    assert.ok(database.orm.select().from(articles).all().every((item) => item.isFixture));
    const forbidden = await runIngestion({ database, registry: [source] });
    assert.equal(forbidden.status, "failed");
  } finally { database.sqlite.close(); }
});

test("different pending source candidates merge after later Finnish AI processing", async () => {
  const database = createDatabase(":memory:");
  const other = { ...source, id: "other", language: "fi", feedUrl: "https://news.example.org/other-feed" };
  const fetchText = async (_url: string, configured: SourceConfig) => configured.id === source.id
    ? rss("https://news.example.org/english", undefined, "Water management work has ended at the local lake")
    : rss("https://news.example.org/finnish", undefined, "Paikallinen järvi on kunnostettu").replaceAll(sourceText, "Kunnostustyössä avattiin järven vanha veden kulkureitti. Alueen luonnonsuojelutyöntekijät seuraavat laatua kolmen vuoden ajan. Kunnostuksen tavoitteena on vähittäinen elpyminen. Lopulliset seurantatulokset eivät ole vielä saatavilla.");
  try {
    const options = { database, registry: [source, other], fetchText, now: () => NOW };
    await runIngestion({ ...options, provider: unavailable });
    assert.equal(database.orm.select().from(articles).all().length, 2);
    const second = await runIngestion({ ...options, provider: provider() });
    assert.equal(second.publishedCount, 1);
    assert.equal(second.duplicateCount, 1);
    assert.equal(getArticles({}, database).total, 1);
    assert.equal(database.orm.select().from(articles).all().length, 1);
    assert.equal(database.orm.select().from(alternateSources).all().length, 1);
  } finally { database.sqlite.close(); }
});

test("source Retry-After persists across separate ingestion runs", async () => {
  const database = createDatabase(":memory:");
  let fetches = 0;
  try {
    const fetchText = async () => { fetches++; throw new FetchFailure("RETRY_AFTER_DEFERRED", NOW + 120_000); };
    const first = await runIngestion({ database, registry: [source], provider: unavailable, fetchText, now: () => NOW });
    assert.equal(first.status, "failed");
    const second = await runIngestion({ database, registry: [source], provider: unavailable, fetchText, now: () => NOW + 30_000 });
    assert.equal(second.sourceCount, 0);
    assert.equal(fetches, 1);
    await runIngestion({ database, registry: [source], provider: unavailable, fetchText: async () => { fetches++; return rss(); }, now: () => NOW + 121_000 });
    assert.equal(fetches, 2);
  } finally { database.sqlite.close(); }
});

test("editorial importance can put an older substantial development before a newer light story", async () => {
  const database = createDatabase(":memory:");
  const important = { ...result, publicImportance: 1 };
  const light = {
    ...result, titleFi: "Kirjastokissa palasi kotiin", primaryCategory: "Eläimet", keywords: ["kissa", "koti"], publicImportance: 0.1,
    summaryFi: "Kirjaston pihalta karannut kissa on löytynyt ja palannut omistajansa luo. Eläin löytyi naapurustosta hyvävointisena. Omistaja kiitti kissan löytämiseen osallistuneita vapaaehtoisia ja varmisti tunnistustiedot eläinlääkärillä.",
  };
  try {
    const older = rss("https://news.example.org/older", "Mon, 24 Aug 2026 10:00:00 GMT");
    const newer = rss("https://news.example.org/newer", undefined, "Library cat reunites with family").replaceAll(sourceText, "The library cat has safely returned to its owner after being found in the neighbourhood. Volunteers helped search nearby gardens. The family confirmed identification details at the veterinary clinic. The cat was in good condition when found.");
    const rankingProvider: AIProvider = { kind: "deepseek", available: true, process: async (candidate) => candidate.canonicalUrl.endsWith("older") ? important : light };
    const combined = older.replace("</channel></rss>", newer.match(/<item>[\s\S]*<\/item>/)![0] + "</channel></rss>");
    const report = await runIngestion({ database, registry: [source], provider: rankingProvider, fetchText: async () => combined, now: () => NOW });
    assert.equal(report.publishedCount, 2);
    const home = getHomeArticles(database);
    assert.equal(home[0].canonicalUrl, "https://news.example.org/older");
    assert.equal(home[1].primaryCategory, "elaimet", "a verified light animal story remains publishable");
  } finally { database.sqlite.close(); }
});
