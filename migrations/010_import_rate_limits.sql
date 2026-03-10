CREATE TABLE IF NOT EXISTS import_rate_limits (
  user_id TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_import_rate_user ON import_rate_limits(user_id, attempted_at);
