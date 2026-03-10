CREATE TABLE IF NOT EXISTS oembed_cache (
  url TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  html TEXT,
  cached_at INTEGER NOT NULL DEFAULT (unixepoch())
);
