CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, homepage_url TEXT NOT NULL, feed_url TEXT,
  language TEXT NOT NULL, default_region TEXT NOT NULL CHECK(default_region IN ('Suomi','Maailmalta')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  trust_level TEXT NOT NULL CHECK(trust_level IN ('high','medium','low')),
  source_type TEXT NOT NULL CHECK(source_type IN ('independent','institution','organization')),
  fetch_method TEXT NOT NULL CHECK(fetch_method IN ('rss','json-feed','json-api')),
  article_extraction_allowed INTEGER NOT NULL DEFAULT 0,
  images_allowed INTEGER NOT NULL DEFAULT 0, image_reuse_policy TEXT NOT NULL,
  content_license TEXT, content_license_url TEXT,
  rate_limit_ms INTEGER NOT NULL DEFAULT 2000 CHECK(rate_limit_ms >= 0),
  verification_notes TEXT NOT NULL, terms_url TEXT, endpoint_verified_at TEXT,
  last_fetched_at TEXT, last_success_at TEXT, last_error TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY, source_id TEXT NOT NULL REFERENCES sources(id),
  canonical_url TEXT NOT NULL, original_title TEXT NOT NULL,
  original_excerpt TEXT NOT NULL CHECK(length(original_excerpt) <= 600),
  source_language TEXT NOT NULL, source_published_at TEXT NOT NULL, fetched_at TEXT NOT NULL,
  title_fi TEXT NOT NULL, summary_fi TEXT NOT NULL, slug TEXT NOT NULL,
  primary_category TEXT CHECK(primary_category IN ('elaimet','luonto','tiede-ja-teknologia','terveys','ihmiset-ja-yhteisot','yhteiskunta','kulttuuri-ja-oppiminen')),
  region TEXT CHECK(region IN ('Suomi','Maailmalta')),
  keywords TEXT NOT NULL CHECK(json_valid(keywords)),
  status TEXT NOT NULL CHECK(status IN ('pending','published','rejected','withdrawn')),
  decision_reason TEXT NOT NULL,
  positive_centrality REAL NOT NULL DEFAULT 0 CHECK(positive_centrality BETWEEN 0 AND 1),
  factual_confidence REAL NOT NULL DEFAULT 0 CHECK(factual_confidence BETWEEN 0 AND 1),
  source_sufficiency REAL NOT NULL DEFAULT 0 CHECK(source_sufficiency BETWEEN 0 AND 1),
  ranking_score REAL NOT NULL DEFAULT 0, published_at TEXT,
  normalized_title TEXT NOT NULL,
  named_entities TEXT NOT NULL CHECK(json_valid(named_entities)),
  fingerprint TEXT NOT NULL CHECK(json_valid(fingerprint)), search_text TEXT NOT NULL,
  image TEXT CHECK(image IS NULL OR json_valid(image)),
  is_fixture INTEGER NOT NULL DEFAULT 0 CHECK(is_fixture IN (0,1)),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  CHECK(status != 'published' OR (published_at IS NOT NULL AND primary_category IS NOT NULL AND region IS NOT NULL AND length(title_fi) > 0 AND length(summary_fi) > 0))
);
CREATE UNIQUE INDEX IF NOT EXISTS articles_canonical_url_unique ON articles(canonical_url);
CREATE UNIQUE INDEX IF NOT EXISTS articles_slug_unique ON articles(slug);
CREATE INDEX IF NOT EXISTS articles_status_date_idx ON articles(status, source_published_at);
CREATE INDEX IF NOT EXISTS articles_region_date_idx ON articles(region, source_published_at);
CREATE INDEX IF NOT EXISTS articles_category_date_idx ON articles(primary_category, source_published_at);
CREATE INDEX IF NOT EXISTS articles_source_idx ON articles(source_id);
CREATE INDEX IF NOT EXISTS articles_normalized_title_idx ON articles(normalized_title);
CREATE TABLE IF NOT EXISTS alternate_sources (
  id TEXT PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id), canonical_url TEXT NOT NULL,
  original_title TEXT NOT NULL, source_published_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS alternate_sources_url_unique ON alternate_sources(canonical_url);
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','completed','partial','failed')),
  source_count INTEGER NOT NULL DEFAULT 0, fetched_count INTEGER NOT NULL DEFAULT 0,
  candidate_count INTEGER NOT NULL DEFAULT 0, published_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0, duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0, log_summary TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS ingestion_runs_started_idx ON ingestion_runs(started_at);
CREATE TABLE IF NOT EXISTS ingestion_lock (id INTEGER PRIMARY KEY CHECK(id = 1), owner TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS source_backoff (source_id TEXT PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE, retry_at TEXT NOT NULL);
