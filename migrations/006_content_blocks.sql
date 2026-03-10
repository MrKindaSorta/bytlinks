-- Add section_order to bio_pages
ALTER TABLE bio_pages ADD COLUMN section_order TEXT DEFAULT '["social_links","links"]';

-- Content blocks (unified table for all block types)
CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES bio_pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL,
  title TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  is_visible INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_content_blocks_page ON content_blocks(page_id);

-- Newsletter signups
CREATE TABLE IF NOT EXISTS newsletter_signups (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_newsletter_block ON newsletter_signups(block_id);
