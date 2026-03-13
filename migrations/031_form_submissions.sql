CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_block ON form_submissions(block_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_block_created ON form_submissions(block_id, created_at DESC);
