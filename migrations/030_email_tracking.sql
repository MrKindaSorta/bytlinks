-- Track sent drip emails to prevent duplicates
CREATE TABLE IF NOT EXISTS email_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(user_id, email_type)
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
