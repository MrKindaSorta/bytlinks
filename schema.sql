-- BytLinks Database Schema (Cloudflare D1 / SQLite)

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  verified INTEGER DEFAULT 0,
  verified_at INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Bio Pages (one per user for now, expandable)
CREATE TABLE IF NOT EXISTS bio_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  about_me TEXT,
  about_me_expanded INTEGER DEFAULT 0,
  avatar_r2_key TEXT,
  custom_domain TEXT,
  show_branding INTEGER DEFAULT 1,
  theme JSON NOT NULL DEFAULT '{}',
  section_order TEXT DEFAULT '["social_links","links"]',
  is_published INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Links
CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_featured INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  order_num INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  style_overrides TEXT,
  published_at INTEGER DEFAULT NULL,
  expires_at INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Social Links
CREATE TABLE IF NOT EXISTS social_links (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_style TEXT DEFAULT 'plain',
  order_num INTEGER DEFAULT 0
);

-- Embedded Content Blocks
CREATE TABLE IF NOT EXISTS embed_blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  embed_url TEXT NOT NULL,
  order_num INTEGER DEFAULT 0
);

-- Analytics Events (server-side only, no client tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL,
  link_id TEXT,
  event_type TEXT NOT NULL,
  referrer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  session_id TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

-- Content Blocks (unified table for all block types)
CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  is_visible INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Newsletter Signups (for newsletter block)
CREATE TABLE IF NOT EXISTS newsletter_signups (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(block_id, email)
);

-- NSFW Blocklist (server-side validation)
CREATE TABLE IF NOT EXISTS blocked_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'adult_content',
  added_at INTEGER DEFAULT (unixepoch())
);

-- Verification Requests
CREATE TABLE IF NOT EXISTS verification_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  reviewed_at INTEGER DEFAULT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id);

-- Import Rate Limits
CREATE TABLE IF NOT EXISTS import_rate_limits (
  user_id TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_import_rate_user ON import_rate_limits(user_id, attempted_at);

-- Indexes for analytics query performance
CREATE INDEX IF NOT EXISTS idx_events_page_time ON analytics_events(page_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_link ON analytics_events(link_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_links_page ON links(page_id, order_num);
CREATE INDEX IF NOT EXISTS idx_bio_pages_username ON bio_pages(username);
CREATE INDEX IF NOT EXISTS idx_content_blocks_page ON content_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_block ON newsletter_signups(block_id);
