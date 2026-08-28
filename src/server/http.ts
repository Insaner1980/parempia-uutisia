import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
import ipaddr from "ipaddr.js";
import robotsParser from "robots-parser";
import type { SourceConfig } from "./source-registry";

export const INGEST_USER_AGENT = "ParempiaUutisiaBot/1.0 (Finnish news summaries; RSS and approved sources)";
const ROBOT_NAME = "ParempiaUutisiaBot";

export class FetchFailure extends Error {
  constructor(public readonly code: string, public readonly retryAt?: number) { super(code); this.name = "FetchFailure"; }
}

export function validateAllowedUrl(value: string, allowedHosts: string[]): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new FetchFailure("INVALID_URL"); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new FetchFailure("UNSAFE_URL");
  if (url.href.length > 4096 || isIP(url.hostname) || !allowedHosts.includes(url.hostname.toLowerCase())) throw new FetchFailure("HOST_NOT_ALLOWED");
  if (url.hostname === "localhost" || /\.(?:local|localhost|internal)$/.test(url.hostname)) throw new FetchFailure("PRIVATE_HOST");
  url.hash = "";
  return url;
}

export function isPublicIp(value: string): boolean {
  try { return ipaddr.parse(value).range() === "unicast"; } catch { return false; }
}

export interface AddressRecord { address: string; family: number }
export interface HttpResponse { status: number; headers: Record<string, string | undefined>; body: string }
export interface HttpOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  maxBytes?: number;
  timeoutMs?: number;
}
export interface HttpDependencies {
  resolve?: (hostname: string) => Promise<AddressRecord[]>;
  transport?: (url: URL, address: AddressRecord, options: HttpOptions) => Promise<HttpResponse>;
  wait?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  deadlineAt?: number;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function resolvePublic(hostname: string, resolver: (hostname: string) => Promise<AddressRecord[]>): Promise<AddressRecord> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const addresses = await Promise.race([
      resolver(hostname),
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new FetchFailure("DNS_TIMEOUT")), 5000); }),
    ]);
    if (!addresses.length || addresses.some((record) => !isPublicIp(record.address))) throw new FetchFailure("PRIVATE_ADDRESS");
    return addresses[0];
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Connect to the validated IP, while retaining the original TLS name and Host. */
export function pinnedTransport(url: URL, address: AddressRecord, options: HttpOptions): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const maximumBytes = options.maxBytes ?? 2_000_000;
    let total = 0;
    const requestBody = options.body ? Buffer.from(options.body, "utf8") : undefined;
    const req = request({
      hostname: address.address, family: address.family, port: 443,
      servername: url.hostname, checkServerIdentity: (_host, certificate) => checkServerIdentity(url.hostname, certificate),
      method: options.method ?? "GET", path: `${url.pathname}${url.search}`, agent: false,
      headers: {
        "User-Agent": INGEST_USER_AGENT, "Accept-Encoding": "identity", Accept: "application/rss+xml, application/atom+xml, application/json, text/html, text/plain;q=0.8",
        ...options.headers, Host: url.hostname,
        ...(requestBody ? { "Content-Length": String(requestBody.byteLength) } : {}),
      },
    }, (response) => {
      if (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity") {
        response.destroy();
        reject(new FetchFailure("UNSUPPORTED_ENCODING"));
        return;
      }
      if (Number(response.headers["content-length"] ?? 0) > maximumBytes) {
        response.destroy(); reject(new FetchFailure("RESPONSE_TOO_LARGE")); return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > maximumBytes) { response.destroy(new FetchFailure("RESPONSE_TOO_LARGE")); return; }
        chunks.push(chunk);
      });
      response.on("error", (error) => reject(error instanceof FetchFailure ? error : new FetchFailure("NETWORK_FAILURE")));
      response.on("end", () => {
        const headers = Object.fromEntries(Object.entries(response.headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(", ") : value]));
        resolve({ status: response.statusCode ?? 0, headers, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    const timeout = setTimeout(() => req.destroy(new FetchFailure("REQUEST_TIMEOUT")), options.timeoutMs ?? 12_000);
    req.on("close", () => clearTimeout(timeout));
    req.on("error", (error) => reject(error instanceof FetchFailure ? error : new FetchFailure("NETWORK_FAILURE")));
    req.end(requestBody);
  });
}

export async function requestPinnedHttps(value: string, allowedHosts: string[], options: HttpOptions = {}, dependencies: HttpDependencies = {}): Promise<HttpResponse> {
  const remaining = dependencies.deadlineAt === undefined ? Number.POSITIVE_INFINITY : dependencies.deadlineAt - (dependencies.now ?? Date.now)();
  if (remaining <= 0) throw new FetchFailure("RUN_TIMEOUT");
  const url = validateAllowedUrl(value, allowedHosts);
  const resolver = dependencies.resolve ?? ((hostname: string) => lookup(hostname, { all: true, verbatim: true }));
  const address = await resolvePublic(url.hostname, resolver);
  return (dependencies.transport ?? pinnedTransport)(url, address, { ...options, timeoutMs: Math.min(options.timeoutMs ?? 12_000, remaining) });
}

export class SourceHttpClient {
  private readonly robots = new Map<string, ReturnType<typeof robotsParser>>();
  private readonly lastRequest = new Map<string, number>();
  private readonly crawlDelays = new Map<string, number>();
  private readonly now: () => number;
  private readonly wait: (milliseconds: number) => Promise<void>;

  constructor(private readonly source: SourceConfig, private readonly dependencies: HttpDependencies = {}) {
    this.now = dependencies.now ?? Date.now;
    this.wait = dependencies.wait ?? wait;
  }

  private async fetchRaw(url: URL, maximumBytes = 2_000_000): Promise<HttpResponse> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const previous = this.lastRequest.get(url.hostname);
      const spacing = Math.max(this.source.rateLimitMs, this.crawlDelays.get(url.hostname) ?? 0);
      if (previous !== undefined) await this.wait(Math.max(0, spacing - (this.now() - previous)));
      this.lastRequest.set(url.hostname, this.now());
      try {
        const response = await requestPinnedHttps(url.href, this.source.allowedHosts, { maxBytes: maximumBytes }, this.dependencies);
        if ([429, 502, 503, 504].includes(response.status)) {
          const header = response.headers["retry-after"];
          const retryAfter = !header ? 0 : /^\d+$/.test(header) ? Number(header) * 1000 : Date.parse(header) - this.now();
          if (Number.isFinite(retryAfter) && retryAfter > 5000) throw new FetchFailure("RETRY_AFTER_DEFERRED", this.now() + retryAfter);
          if (attempt === 2) return response;
          await this.wait(Math.max(500 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter : 0));
          continue;
        }
        return response;
      } catch (error) {
        if (!(error instanceof FetchFailure) || !["NETWORK_FAILURE", "REQUEST_TIMEOUT"].includes(error.code) || attempt === 2) throw error;
        await this.wait(500 * 2 ** attempt);
      }
    }
    throw new FetchFailure("RETRY_LIMIT");
  }

  private async ensureRobots(url: URL): Promise<void> {
    if (!this.robots.has(url.origin)) {
      let robotsUrl = validateAllowedUrl(`${url.origin}/robots.txt`, this.source.allowedHosts);
      let body: string | null = null;
      for (let redirects = 0; redirects <= 3; redirects++) {
        const response = await this.fetchRaw(robotsUrl, 256_000);
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
          robotsUrl = validateAllowedUrl(new URL(response.headers.location, robotsUrl).href, this.source.allowedHosts);
          continue;
        }
        if (response.status < 200 || response.status >= 300) throw new FetchFailure("ROBOTS_UNAVAILABLE");
        body = response.body;
        break;
      }
      if (body === null || /<html|<!doctype html/i.test(body) || !/user-agent\s*:/i.test(body)) throw new FetchFailure("ROBOTS_INVALID");
      const rules = robotsParser(`${url.origin}/robots.txt`, body);
      this.robots.set(url.origin, rules);
      const crawlDelay = rules.getCrawlDelay(ROBOT_NAME);
      if (crawlDelay !== undefined && Number.isFinite(crawlDelay)) {
        if (crawlDelay > 30) throw new FetchFailure("CRAWL_DELAY_TOO_LONG");
        this.crawlDelays.set(url.hostname, Math.max(0, crawlDelay * 1000));
      }
    }
    if (this.robots.get(url.origin)?.isAllowed(url.href, ROBOT_NAME) !== true) throw new FetchFailure("ROBOTS_DISALLOWED");
  }

  async get(value: string, allowedPathPrefixes?: string[]): Promise<string> {
    let url = validateAllowedUrl(value, this.source.allowedHosts);
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (allowedPathPrefixes && (!allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix)) || /%2f|%5c/i.test(url.pathname))) throw new FetchFailure("EXTRACTION_NOT_ALLOWED");
      await this.ensureRobots(url);
      const response = await this.fetchRaw(url);
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        url = validateAllowedUrl(new URL(response.headers.location, url).href, this.source.allowedHosts);
        continue;
      }
      if (response.status < 200 || response.status >= 300) throw new FetchFailure(`HTTP_${response.status}`);
      return response.body;
    }
    throw new FetchFailure("REDIRECT_LIMIT");
  }
}
