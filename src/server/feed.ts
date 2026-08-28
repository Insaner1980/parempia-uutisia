import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { Region } from "../lib/domain";
import { normalizeForSearch, normalizePublicText } from "../lib/text";
import { canonicalizeUrl, extractNamedEntities, fingerprintText, type DuplicateSignals } from "./canonical";
import { FetchFailure, validateAllowedUrl } from "./http";
import type { SourceConfig } from "./source-registry";

export interface RawFeedItem {
  url: string;
  title: string;
  content: string;
  publishedAt: string;
}

export interface Candidate extends DuplicateSignals {
  sourceId: string;
  originalTitle: string;
  originalExcerpt: string;
  sourceText: string;
  sourceLanguage: string;
  regionHint: Region;
  isFixture: boolean;
}

export function plainText(html: string): string {
  const $ = load(html.slice(0, 150_000), {}, false);
  $("script, style, noscript, iframe, svg, form, nav, footer").remove();
  $("br, p, div, h1, h2, h3, li").each((_index, element) => { $(element).append(" "); });
  return normalizePublicText($.root().text());
}

function stringValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "#text" in value) return stringValue(value["#text"]);
  return "";
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function values(value: unknown): unknown[] { return Array.isArray(value) ? value : value ? [value] : []; }

function pathValue(value: unknown, path: string): unknown {
  if (!/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/.test(path) || /(?:^|\.)(?:__proto__|prototype|constructor)(?:\.|$)/.test(path)) throw new FetchFailure("INVALID_API_MAPPING");
  return path.split(".").reduce<unknown>((node, part) => {
    const record = object(node);
    return Object.hasOwn(record, part) ? record[part] : undefined;
  }, value);
}

export function parseFeed(body: string, source: SourceConfig): RawFeedItem[] {
  if (Buffer.byteLength(body, "utf8") > 2_000_000) throw new FetchFailure("RESPONSE_TOO_LARGE");
  if (source.fetchMethod === "json-feed") {
    const feed = object(JSON.parse(body) as unknown);
    if (!/^https:\/\/jsonfeed\.org\/version\/1(?:\.1)?$/.test(stringValue(feed.version)) || !Array.isArray(feed.items)) throw new FetchFailure("FEED_INVALID");
    return feed.items.slice(0, 40).map((value) => {
      const item = object(value);
      return { url: stringValue(item.url || item.external_url), title: stringValue(item.title), content: stringValue(item.content_text || item.content_html || item.summary), publishedAt: stringValue(item.date_published) };
    });
  }
  if (source.fetchMethod === "json-api") {
    const mapping = source.jsonApiMapping;
    if (!mapping) throw new FetchFailure("API_MAPPING_REQUIRED");
    const bodyObject: unknown = JSON.parse(body);
    const items = pathValue(bodyObject, mapping.itemsPath);
    if (!Array.isArray(items)) throw new FetchFailure("FEED_INVALID");
    return items.slice(0, 40).map((item) => ({
      url: stringValue(pathValue(item, mapping.urlPath)), title: stringValue(pathValue(item, mapping.titlePath)),
      content: stringValue(pathValue(item, mapping.contentPath)), publishedAt: stringValue(pathValue(item, mapping.datePath)),
    }));
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(body)) throw new FetchFailure("XML_ENTITIES_FORBIDDEN");
  const parsed = object(new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: false, isArray: (name) => name === "item" || name === "entry" }).parse(body));
  if (parsed.rss) {
    const channel = object(object(parsed.rss).channel);
    return values(channel.item).slice(0, 40).map((value) => {
      const item = object(value);
      return { url: stringValue(item.link), title: stringValue(item.title), content: stringValue(item["content:encoded"] || item.description), publishedAt: stringValue(item.pubDate || item["dc:date"]) };
    });
  }
  if (parsed.feed) {
    return values(object(parsed.feed).entry).slice(0, 40).map((value) => {
      const item = object(value);
      const link = values(item.link).map(object).find((entry) => !entry["@_rel"] || entry["@_rel"] === "alternate");
      return { url: stringValue(link?.["@_href"]), title: stringValue(item.title), content: stringValue(item.content || item.summary), publishedAt: stringValue(item.published || item.updated) };
    });
  }
  throw new FetchFailure("FEED_INVALID");
}

export function normalizeCandidate(item: RawFeedItem, source: SourceConfig, isFixture = false): Candidate {
  const canonicalUrl = canonicalizeUrl(validateAllowedUrl(item.url, source.allowedHosts).href);
  const timestamp = Date.parse(item.publishedAt);
  if (!item.publishedAt || !Number.isFinite(timestamp)) throw new FetchFailure("PUBLICATION_DATE_REQUIRED");
  const originalTitle = plainText(item.title).slice(0, 500);
  const sourceText = plainText(item.content).slice(0, 24_000);
  if (originalTitle.length < 4) throw new FetchFailure("TITLE_REQUIRED");
  return {
    sourceId: source.id, canonicalUrl, originalTitle, originalExcerpt: sourceText.slice(0, 500),
    sourceText, sourceLanguage: source.language, sourcePublishedAt: new Date(timestamp).toISOString(),
    regionHint: source.defaultRegion, normalizedTitle: normalizeForSearch(originalTitle),
    namedEntities: extractNamedEntities(`${originalTitle} ${sourceText}`), fingerprint: fingerprintText(`${originalTitle} ${sourceText}`), isFixture,
  };
}

export function extractArticleText(html: string, source: SourceConfig, url: string): string {
  const parsed = validateAllowedUrl(url, source.allowedHosts);
  if (!source.articleExtractionAllowed || !source.articleTextSelector || !source.allowedArticlePathPrefixes?.some((prefix) => parsed.pathname.startsWith(prefix))) throw new FetchFailure("EXTRACTION_NOT_ALLOWED");
  if (/%2f|%5c/i.test(parsed.pathname)) throw new FetchFailure("EXTRACTION_NOT_ALLOWED");
  const $ = load(html);
  $("script, style, noscript, iframe, svg, form, nav, footer").remove();
  return $(source.articleTextSelector).toArray().map((element) => plainText($.html(element))).join(" ").slice(0, 24_000).trim();
}
