-- Multi-card business card configurations
CREATE TABLE business_cards (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'My Card',
  order_num INTEGER NOT NULL DEFAULT 0,
  show_avatar INTEGER NOT NULL DEFAULT 1,
  show_job_title INTEGER NOT NULL DEFAULT 1,
  show_bio INTEGER NOT NULL DEFAULT 0,
  show_email INTEGER NOT NULL DEFAULT 1,
  show_phone INTEGER NOT NULL DEFAULT 1,
  show_company INTEGER NOT NULL DEFAULT 1,
  show_address INTEGER NOT NULL DEFAULT 1,
  show_socials INTEGER NOT NULL DEFAULT 1,
  qr_target TEXT NOT NULL DEFAULT 'card',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
