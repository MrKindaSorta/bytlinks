-- Card exchanges: track when users send their card to another user's rolodex
CREATE TABLE IF NOT EXISTS card_exchanges (
  id              TEXT PRIMARY KEY,
  from_page_id    TEXT NOT NULL,
  from_username   TEXT NOT NULL,
  to_page_id      TEXT NOT NULL,
  to_username     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined
  card_snapshot   TEXT NOT NULL,   -- JSON blob of sender's card data
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at    TEXT,
  expires_at      TEXT NOT NULL,   -- 14 days from created_at
  UNIQUE(from_page_id, to_page_id)
);

CREATE INDEX IF NOT EXISTS idx_exchanges_to   ON card_exchanges(to_page_id, status);
CREATE INDEX IF NOT EXISTS idx_exchanges_from ON card_exchanges(from_page_id);
