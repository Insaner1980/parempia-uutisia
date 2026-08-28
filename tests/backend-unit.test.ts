import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, type Article, type ImageMetadata } from "../src/lib/domain";
import { formatFinnishDate, formatFinnishDateTime, startOfHelsinkiDay } from "../src/lib/dates";
import { canDisplayImage } from "../src/lib/images";
import { selectFrontPage } from "../src/lib/selection";
import { normalizePublicText } from "../src/lib/text";
import { assignRegion, FixtureAIProvider, parseAIResult, publicationDecision } from "../src/server/ai";
import { createAdminToken, isAdminConfigured, isSameOrigin, verifyAdminSecret, verifyAdminToken } from "../src/server/auth";
import { canonicalizeUrl, fingerprintText, isDuplicate } from "../src/server/canonical";
import { extractArticleText, normalizeCandidate, parseFeed, plainText } from "../src/server/feed";
import { FetchFailure, isPublicIp, requestPinnedHttps, SourceHttpClient, validateAllowedUrl, type HttpDependencies } from "../src/server/http";
import type { SourceConfig } from "../src/server/source-registry";

const source: SourceConfig = {
  id: "test-source", name: "Testilähde", homepageUrl: "https://news.example.org/", feedUrl: "https://news.example.org/feed",
  language: "en", defaultRegion: "Maailmalta", enabled: true, trustLevel: "high", sourceType: "institution", fetchMethod: "rss",
  allowedHosts: ["news.example.org"], articleExtractionAllowed: false, imagesAllowed: false, imageReusePolicy: "Ei kuvia.",
  rateLimitMs: 0, termsUrl: "https://news.example.org/terms", endpointVerifiedAt: "2026-08-27", verificationNotes: "Testiaineisto.",
};
const rawItem = {
  url: "https://news.example.org/story?utm_source=test", title: "A habitat restoration project has been completed",
  content: "The lake restoration project has been completed after several years of work. Local conservation staff reopened the water channel and will monitor water quality for three years. The project team says the habitat is expected to recover gradually, and no final ecological results are available yet.",
  publishedAt: "2026-08-27T10:00:00.000Z",
};
const validResult = {
  publish: true, decisionReason: "Tapahtuma on selvästi myönteinen ja lähde riittävä.",
  titleFi: "Järven kunnostus valmistui", summaryFi: "Järven vedenkulkua parantava kunnostus on valmistunut. Paikalliset luonnonsuojelun työntekijät seuraavat veden laatua kolmen vuoden ajan. Luonnon palautumista arvioidaan seurannassa, eikä lopullisia ekologisia tuloksia ole vielä käytettävissä.",
  primaryCategory: "Luonto", region: "Maailmalta", keywords: ["järvi", "ennallistaminen"],
  positiveCentrality: 0.95, factualConfidence: 0.96, sourceSufficiency: 0.94, sensitivityFlags: [],
};

test("URL canonicalisation removes known tracking and fragments, preserves meaningful parameters", () => {
  assert.equal(canonicalizeUrl("https://NEWS.example.org/story/?b=2&utm_campaign=x&a=1&fbclid=secret#part"), "https://news.example.org/story?a=1&b=2");
  assert.equal(canonicalizeUrl("https://news.example.org/story?id=123&ref=chapter"), "https://news.example.org/story?id=123&ref=chapter");
  assert.throws(() => canonicalizeUrl("javascript:alert(1)"));
  assert.throws(() => canonicalizeUrl("https://user:pass@news.example.org/story"));
});

test("duplicate signals need URL or a close dated and sufficiently similar event", () => {
  const base = { canonicalUrl: "https://one.example.org/story", normalizedTitle: "kosteikon ennallistaminen valmistui kaupungin yhteisella hankkeella", sourcePublishedAt: "2026-08-27T10:00:00Z", namedEntities: ["lake example", "helsinki"], fingerprint: fingerprintText("Lake Example Helsinki restoration water channel habitat ecosystem river volunteers completed") };
  assert.equal(isDuplicate(base, { ...base, canonicalUrl: "https://two.example.org/story" }), true);
  assert.equal(isDuplicate(base, { ...base, canonicalUrl: "https://two.example.org/story", sourcePublishedAt: "2025-08-27T10:00:00Z" }), false);
  assert.equal(isDuplicate(base, { ...base, canonicalUrl: "https://two.example.org/story", normalizedTitle: "a different project opened", fingerprint: fingerprintText("Library book reading school children summer") }), false);
  assert.equal(isDuplicate(base, { ...base, normalizedTitle: "updated wording", sourcePublishedAt: "2020-01-01T00:00:00Z" }), true);
});

test("strict AI schema accepts exactly the categories and keeps story geography independent of source", () => {
  for (const category of CATEGORIES) assert.equal(parseAIResult({ ...validResult, primaryCategory: category.label }).primaryCategory, category.slug);
  assert.throws(() => parseAIResult({ ...validResult, primaryCategory: "Lemmikit" }));
  assert.throws(() => parseAIResult({ ...validResult, region: "Eurooppa" }));
  assert.throws(() => parseAIResult({ ...validResult, publish: "true" }));
  assert.throws(() => parseAIResult({ ...validResult, unsupported: true }));
  assert.equal(parseAIResult(validResult).publicImportance, 0.5);
  assert.throws(() => parseAIResult({ ...validResult, publicImportance: 1.1 }));
  assert.throws(() => parseAIResult({ ...validResult, summaryFi: "<script>untrusted output</script>" }));
  assert.equal(assignRegion("FI", "Maailmalta"), "Suomi");
  assert.equal(assignRegion("SE", "Suomi"), "Maailmalta");
  assert.equal(assignRegion(undefined, "Maailmalta"), "Maailmalta");
  assert.throws(() => assignRegion("Finland", "Maailmalta"));
});

test("publication thresholds, sensitive flags, missing source and copied passages fail closed", () => {
  const candidate = normalizeCandidate(rawItem, source);
  const result = parseAIResult(validResult);
  assert.equal(publicationDecision(result, candidate).publish, true);
  for (const key of ["positiveCentrality", "factualConfidence", "sourceSufficiency"] as const) {
    assert.equal(publicationDecision({ ...result, [key]: 0.2 }, candidate).publish, false);
  }
  assert.equal(publicationDecision({ ...result, sensitivityFlags: ["uncertain"] }, candidate).publish, false);
  assert.equal(publicationDecision({ ...result, publish: false }, candidate).publish, false);
  assert.equal(publicationDecision(result, { ...candidate, sourceText: "Short." }).publish, false);
  assert.equal(publicationDecision({ ...result, summaryFi: candidate.sourceText }, candidate).publish, false);
});

test("mock AI cannot process live or unknown fixture candidates", async () => {
  const candidate = normalizeCandidate(rawItem, source, true);
  const provider = new FixtureAIProvider({ [candidate.canonicalUrl]: validResult });
  assert.deepEqual(await provider.process(candidate), validResult);
  await assert.rejects(() => provider.process({ ...candidate, isFixture: false }), /MOCK_REQUIRES_KNOWN_FIXTURE/);
  await assert.rejects(() => provider.process({ ...candidate, canonicalUrl: "https://news.example.org/other" }), /MOCK_REQUIRES_KNOWN_FIXTURE/);
});

test("public punctuation is normalised in fetched and generated text", () => {
  const forbidden = String.fromCodePoint(0x00b7, 0x2022, 0x2219, 0x2014, 0x2013);
  const value = normalizePublicText(`Yle ${forbidden} 27. elokuuta 2026`);
  assert.equal(/[\u00b7\u2022\u2219\u2014\u2013]/.test(value), false);
  assert.equal(normalizePublicText("  Tavallinen teksti  "), "Tavallinen teksti");
  assert.equal(/[\u2013\u2014]/.test(parseAIResult({ ...validResult, titleFi: `Järvi ${String.fromCodePoint(0x2014)} kunnostus valmistui` }).titleFi), false);
  assert.equal(plainText("<p>Turvallinen <strong>uutinen</strong></p><script>alert('secret')</script><nav>Navigation</nav>"), "Turvallinen uutinen");
});

test("Finnish dates use Helsinki and filters respect summer and winter midnight", () => {
  assert.equal(formatFinnishDate("2026-08-27T22:30:00Z"), "28. elokuuta 2026");
  assert.match(formatFinnishDateTime("2026-08-27T22:30:00Z"), /28\.8\.2026.*01[.:]30/);
  assert.equal(startOfHelsinkiDay(new Date("2026-08-27T10:00:00Z")).toISOString(), "2026-08-26T21:00:00.000Z");
  assert.equal(startOfHelsinkiDay(new Date("2026-01-27T10:00:00Z")).toISOString(), "2026-01-26T22:00:00.000Z");
  assert.equal(startOfHelsinkiDay(new Date("2026-03-29T12:00:00Z")).toISOString(), "2026-03-28T22:00:00.000Z");
  assert.equal(formatFinnishDate("invalid"), "Päivämäärä ei ole tiedossa");
});

test("images need exact relevance, commercial rights, licence evidence and dimensions", () => {
  const image: ImageMetadata = {
    imageUrl: "/demo/approved.jpg", imageAltFi: "Tarkistettu kuva tapahtumasta", imageCaptionFi: "Tapahtuma.", imageCreator: "Tekijä",
    imageSourceUrl: "https://example.org/asset", imageLicense: "CC BY 4.0", imageLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    imageRightsStatus: "approved", imageRelevanceConfirmed: true, imageRightsConfirmed: true, width: 800, height: 600,
  };
  assert.equal(canDisplayImage(image), true);
  assert.equal(canDisplayImage(null), false);
  for (const patch of [{ imageRightsConfirmed: false }, { imageRelevanceConfirmed: false }, { imageRightsStatus: "unknown" as const }, { imageLicense: "CC BY-NC 4.0" }, { imageLicenseUrl: "" }, { width: 0 }, { imageUrl: "javascript:alert(1)" }]) {
    assert.equal(canDisplayImage({ ...image, ...patch }), false);
  }
});

test("front page contains each story at most once and latest is chronological", () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    id: `id-${index}`, slug: `story-${index}`, titleFi: `Uutinen ${index}`, summaryFi: "Kehitysaineistoa testausta varten.",
    primaryCategory: index % 3 === 0 ? "elaimet" : "luonto", region: index % 2 === 0 ? "Suomi" : "Maailmalta",
    source: { id: "test", name: "Testi", homepageUrl: "https://example.org", sourceType: "institution" },
    canonicalUrl: `https://example.org/${index}`, originalTitle: "Testi", sourcePublishedAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
    publishedAt: "2026-08-27T00:00:00Z", rankingScore: 30 - index, isFixture: true, keywords: [], image: null,
  })) as Article[];
  const selection = selectFrontPage([...items, ...items]);
  const selected = [selection.lead!, ...selection.secondary, ...selection.suomi, ...selection.maailmalta, ...selection.animals, ...selection.latest];
  assert.equal(new Set(selected.map((item) => item.id)).size, selected.length);
  assert.equal(selection.secondary.length, 4);
  assert.deepEqual(selection.latest.map((item) => item.sourcePublishedAt), selection.latest.map((item) => item.sourcePublishedAt).sort().reverse());
  assert.equal(selectFrontPage([]).lead, null);
  const varied = [...items.slice(0, 10).map((item) => ({ ...item, primaryCategory: "luonto" as const })), ...CATEGORIES.filter((category) => category.slug !== "luonto").map((category, index) => ({ ...items[index + 10], primaryCategory: category.slug }))];
  assert.equal(new Set(selectFrontPage(varied).secondary.map((item) => item.primaryCategory)).size, 4);
});

test("RSS, Atom, JSON Feed and configured JSON API produce normalised feed items", () => {
  const rss = `<rss version="2.0"><channel><title>Fixture</title><item><title>A &amp; B</title><link>https://news.example.org/story</link><pubDate>Thu, 27 Aug 2026 13:00:00 +0300</pubDate><description><![CDATA[<p>Safe content</p>]]></description></item></channel></rss>`;
  const rssItems = parseFeed(rss, source);
  assert.equal(normalizeCandidate(rssItems[0], source).originalTitle, "A & B");
  assert.equal(normalizeCandidate(rssItems[0], source).sourcePublishedAt, "2026-08-27T10:00:00.000Z");
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom item</title><link rel="self" href="https://news.example.org/api/1"/><link rel="alternate" href="https://news.example.org/atom-item"/><published>2026-08-27T10:00:00Z</published><summary>Source content</summary></entry></feed>`;
  assert.equal(parseFeed(atom, source)[0].url, "https://news.example.org/atom-item");
  const json = JSON.stringify({ version: "https://jsonfeed.org/version/1.1", items: [{ url: rawItem.url, title: rawItem.title, content_text: rawItem.content, date_published: rawItem.publishedAt }] });
  assert.equal(parseFeed(json, { ...source, fetchMethod: "json-feed" })[0].content, rawItem.content);
  const api = JSON.stringify({ data: [{ link: rawItem.url, heading: rawItem.title, body: rawItem.content, date: rawItem.publishedAt }] });
  assert.equal(parseFeed(api, { ...source, fetchMethod: "json-api", jsonApiMapping: { itemsPath: "data", urlPath: "link", titlePath: "heading", contentPath: "body", datePath: "date" } })[0].title, rawItem.title);
  assert.throws(() => parseFeed('<!DOCTYPE rss [<!ENTITY secret SYSTEM "file:///C:/secret">]><rss/>', source), /XML_ENTITIES_FORBIDDEN/);
  assert.throws(() => normalizeCandidate({ ...rawItem, publishedAt: "" }, source), /PUBLICATION_DATE_REQUIRED/);
});

test("configured extraction ignores surrounding page text and refuses other paths", () => {
  const extracting = { ...source, articleExtractionAllowed: true, articleTextSelector: "article .body", allowedArticlePathPrefixes: ["/news/"] };
  const body = '<nav>Navigation</nav><article><div class="body"><p>Varsinainen uutinen.</p></div></article><footer>Footer</footer>';
  assert.equal(extractArticleText(body, extracting, "https://news.example.org/news/story"), "Varsinainen uutinen.");
  assert.throws(() => extractArticleText(body, extracting, "https://news.example.org/admin/story"), /EXTRACTION_NOT_ALLOWED/);
});

test("SSRF rejects private IP classes, credentials, ports, HTTP and unconfigured hosts", async () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1"]) assert.equal(isPublicIp(ip), false, ip);
  assert.equal(isPublicIp("8.8.8.8"), true);
  for (const url of ["http://news.example.org/", "https://news.example.org:444/", "https://user@news.example.org/", "https://evil.example.org/", "https://127.0.0.1/"]) assert.throws(() => validateAllowedUrl(url, source.allowedHosts));
  let transportCalled = false;
  await assert.rejects(() => requestPinnedHttps(source.feedUrl!, source.allowedHosts, {}, {
    resolve: async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }],
    transport: async () => { transportCalled = true; return { status: 200, headers: {}, body: "" }; },
  }), /PRIVATE_ADDRESS/);
  assert.equal(transportCalled, false);
  await requestPinnedHttps(source.feedUrl!, source.allowedHosts, {}, {
    resolve: async () => [{ address: "8.8.8.8", family: 4 }],
    transport: async (url, address) => { assert.equal(url.hostname, "news.example.org"); assert.equal(address.address, "8.8.8.8"); return { status: 200, headers: {}, body: "ok" }; },
  });
});

test("robots fail closed, redirects are revalidated and retries are bounded", async () => {
  const calls: string[] = [];
  const dependencies: HttpDependencies = {
    resolve: async () => [{ address: "8.8.8.8", family: 4 }], wait: async () => {},
    transport: async (url) => { calls.push(url.pathname); return { status: 200, headers: {}, body: "User-agent: *\nDisallow: /feed" }; },
  };
  await assert.rejects(() => new SourceHttpClient(source, dependencies).get(source.feedUrl!), /ROBOTS_DISALLOWED/);
  assert.deepEqual(calls, ["/robots.txt"]);
  await assert.rejects(() => new SourceHttpClient(source, { ...dependencies, transport: async () => ({ status: 404, headers: {}, body: "" }) }).get(source.feedUrl!), /ROBOTS_UNAVAILABLE/);
  await assert.rejects(() => new SourceHttpClient(source, {
    ...dependencies, transport: async (url) => url.pathname === "/robots.txt"
      ? { status: 200, headers: {}, body: "User-agent: *\nAllow: /" }
      : { status: 302, headers: { location: "https://evil.example.org/secret" }, body: "" },
  }).get(source.feedUrl!), /HOST_NOT_ALLOWED/);
  let attempts = 0;
  const retryClient = new SourceHttpClient(source, { ...dependencies, transport: async (url) => {
    if (url.pathname === "/robots.txt") return { status: 200, headers: {}, body: "User-agent: *\nAllow: /" };
    attempts++;
    return { status: 503, headers: {}, body: "" };
  } });
  await assert.rejects(() => retryClient.get(source.feedUrl!), (error: unknown) => error instanceof FetchFailure && error.code === "HTTP_503");
  assert.equal(attempts, 3);
});

test("admin authentication expires, rejects tampering and checks POST origin", () => {
  const previousSecret = process.env.ADMIN_SECRET;
  const previousSite = process.env.SITE_URL;
  try {
    delete process.env.ADMIN_SECRET;
    assert.equal(isAdminConfigured(), false);
    assert.equal(verifyAdminSecret("anything"), false);
    process.env.ADMIN_SECRET = "a-test-only-secret-with-at-least-thirty-two-characters";
    assert.equal(verifyAdminSecret(process.env.ADMIN_SECRET), true);
    assert.equal(verifyAdminSecret("wrong"), false);
    const token = createAdminToken(1000);
    assert.equal(verifyAdminToken(token, 1001), true);
    assert.equal(verifyAdminToken(`${token}x`, 1001), false);
    assert.equal(verifyAdminToken(token, 1000 + 8 * 60 * 60 * 1000), false);
    assert.equal(verifyAdminToken(token, 999), false);
    process.env.SITE_URL = "https://news.example.org";
    assert.equal(isSameOrigin(new Request("https://news.example.org/api/admin", { method: "POST", headers: { origin: "https://news.example.org" } })), true);
    assert.equal(isSameOrigin(new Request("https://news.example.org/api/admin", { method: "POST", headers: { origin: "https://evil.example.org" } })), false);
    assert.equal(isSameOrigin(new Request("https://news.example.org/api/admin", { method: "POST" })), false);
    process.env.ADMIN_SECRET = "a-different-test-secret-with-at-least-thirty-two-characters";
    assert.equal(verifyAdminToken(token, 1001), false);
  } finally {
    if (previousSecret === undefined) delete process.env.ADMIN_SECRET; else process.env.ADMIN_SECRET = previousSecret;
    if (previousSite === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previousSite;
  }
});

test("server Retry-After in seconds or HTTP-date is never shortened by retry backoff", async () => {
  const now = Date.parse("2026-08-27T12:00:00Z");
  for (const retryAfter of ["120", new Date(now + 120_000).toUTCString()]) {
    let attempts = 0;
    const client = new SourceHttpClient(source, {
      now: () => now, resolve: async () => [{ address: "8.8.8.8", family: 4 }], wait: async () => {},
      transport: async (url) => {
        if (url.pathname === "/robots.txt") return { status: 200, headers: {}, body: "User-agent: *\nAllow: /" };
        attempts++;
        return { status: 429, headers: { "retry-after": retryAfter }, body: "" };
      },
    });
    await assert.rejects(() => client.get(source.feedUrl!));
    assert.equal(attempts, 1, "a long Retry-After must defer this source instead of retrying early");
  }
});
