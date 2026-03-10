-- D1-backed rate limiting (survives Worker restarts/deploys)
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL
);
