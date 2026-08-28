import { eq, gt } from "drizzle-orm";
import type { AppDatabase } from "./db";
import { sourceBackoff, sources } from "./schema";
import { SOURCE_REGISTRY, type SourceConfig } from "./source-registry";

export function syncSources(database: AppDatabase, registry: SourceConfig[] = SOURCE_REGISTRY): void {
  const now = new Date().toISOString();
  database.sqlite.transaction(() => {
    for (const config of registry) {
      const row = {
        id: config.id, name: config.name, homepageUrl: config.homepageUrl, feedUrl: config.feedUrl,
        language: config.language, defaultRegion: config.defaultRegion, enabled: config.enabled,
        trustLevel: config.trustLevel, sourceType: config.sourceType, fetchMethod: config.fetchMethod,
        articleExtractionAllowed: config.articleExtractionAllowed, imagesAllowed: config.imagesAllowed,
        imageReusePolicy: config.imageReusePolicy, contentLicense: config.contentLicense ?? null,
        contentLicenseUrl: config.contentLicenseUrl ?? null, rateLimitMs: config.rateLimitMs,
        verificationNotes: config.verificationNotes, termsUrl: config.termsUrl,
        endpointVerifiedAt: config.endpointVerifiedAt, createdAt: now, updatedAt: now,
      };
      // Keep the owner's enabled/disabled selection across configuration refreshes.
      const { enabled: _enabled, createdAt: _createdAt, ...update } = row;
      void _enabled;
      void _createdAt;
      database.orm.insert(sources).values(row).onConflictDoUpdate({ target: sources.id, set: update }).run();
    }
  })();
}

export function enabledSourceConfigs(database: AppDatabase, registry: SourceConfig[] = SOURCE_REGISTRY, now = Date.now()): SourceConfig[] {
  const enabledIds = new Set(database.orm.select({ id: sources.id }).from(sources).where(eq(sources.enabled, true)).all().map((source) => source.id));
  const deferredIds = new Set(database.orm.select({ id: sourceBackoff.sourceId }).from(sourceBackoff).where(gt(sourceBackoff.retryAt, new Date(now).toISOString())).all().map((source) => source.id));
  return registry.filter((source) => enabledIds.has(source.id) && !deferredIds.has(source.id) && source.feedUrl && source.endpointVerifiedAt);
}
