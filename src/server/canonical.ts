import { normalizeForSearch } from "../lib/text";

const TRACKING_PARAMETERS = /^(?:utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|vero_id|_hsenc|_hsmi|ref_src|ref_url|cmpid|campaign_id)$/i;

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("INVALID_ARTICLE_URL");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (TRACKING_PARAMETERS.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  return url.toString();
}

const STOP_WORDS = new Set(["ja", "on", "oli", "ovat", "etta", "se", "sen", "myos", "kun", "kunnes", "the", "and", "for", "with", "from", "this", "that", "are", "was", "has", "have", "will"]);

export function fingerprintText(value: string): string[] {
  return [...new Set(normalizeForSearch(value).split(" ").filter((word) => word.length >= 3 && !STOP_WORDS.has(word)))].sort().slice(0, 200);
}

export function extractNamedEntities(value: string): string[] {
  const names = value.match(/\b(?:[A-ZÅÄÖ][\p{L}\d'-]{2,})(?:\s+[A-ZÅÄÖ][\p{L}\d'-]{2,}){0,3}\b/gu) ?? [];
  return [...new Set(names.map(normalizeForSearch).filter((name) => name.length > 3))].slice(0, 30);
}

export interface DuplicateSignals {
  canonicalUrl: string;
  normalizedTitle: string;
  sourcePublishedAt: string;
  namedEntities: string[];
  fingerprint: string[];
}

export function similarity(first: string[], second: string[]): number {
  const a = new Set(first);
  const b = new Set(second);
  if (!a.size || !b.size) return 0;
  const common = [...a].filter((value) => b.has(value)).length;
  return common / (a.size + b.size - common);
}

export function isDuplicate(first: DuplicateSignals, second: DuplicateSignals): boolean {
  if (first.canonicalUrl === second.canonicalUrl) return true;
  const delta = Math.abs(Date.parse(first.sourcePublishedAt) - Date.parse(second.sourcePublishedAt));
  if (!Number.isFinite(delta) || delta > 7 * 86_400_000) return false;
  if (first.normalizedTitle.length >= 20 && first.normalizedTitle === second.normalizedTitle) return true;
  if (delta > 3 * 86_400_000) return false;
  const titleSimilarity = similarity(fingerprintText(first.normalizedTitle), fingerprintText(second.normalizedTitle));
  if (fingerprintText(first.normalizedTitle).length >= 5 && titleSimilarity >= 0.9) return true;
  const textSimilarity = similarity(first.fingerprint, second.fingerprint);
  const sharedEntities = first.namedEntities.filter((entity) => second.namedEntities.includes(entity)).length;
  return (first.fingerprint.length >= 8 && second.fingerprint.length >= 8 && textSimilarity >= 0.78)
    || (sharedEntities >= 2 && textSimilarity >= 0.5);
}
