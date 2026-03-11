-- Rolodex: store scanned/saved business cards from other users
CREATE TABLE IF NOT EXISTS rolodex_entries (
  id                TEXT PRIMARY KEY,
  owner_page_id     TEXT NOT NULL,
  contact_username  TEXT NOT NULL,
  contact_page_id   TEXT,
  contact_snapshot  TEXT NOT NULL,   -- JSON blob of their card data at save time
  notes             TEXT DEFAULT '',
  saved_at          TEXT NOT NULL DEFAULT (datetime('now')),
  last_refreshed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner_page_id, contact_username)
);

CREATE INDEX IF NOT EXISTS idx_rolodex_owner ON rolodex_entries(owner_page_id);
