-- Affiliations: page-to-page many-to-many relationship (business ↔ member)

CREATE TABLE IF NOT EXISTS page_affiliations (
  id TEXT PRIMARY KEY,
  business_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  member_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL DEFAULT 'Team Member',
  status TEXT NOT NULL DEFAULT 'pending',
  show_on_business_page INTEGER DEFAULT 1,
  show_on_member_page INTEGER DEFAULT 1,
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(business_page_id, member_page_id)
);

CREATE INDEX IF NOT EXISTS idx_affiliations_business ON page_affiliations(business_page_id, status);
CREATE INDEX IF NOT EXISTS idx_affiliations_member ON page_affiliations(member_page_id, status);

CREATE TABLE IF NOT EXISTS affiliation_invites (
  id TEXT PRIMARY KEY,
  business_page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id),
  max_uses INTEGER DEFAULT NULL,
  use_count INTEGER DEFAULT 0,
  expires_at INTEGER DEFAULT NULL,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_invites_business ON affiliation_invites(business_page_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON affiliation_invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_token ON affiliation_invites(token_hash);

ALTER TABLE bio_pages ADD COLUMN show_team_section INTEGER DEFAULT 0;
