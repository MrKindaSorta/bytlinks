CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('interested', 'rsvp')),
  name TEXT,
  email TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_block_id ON event_rsvps(block_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_rsvps_email ON event_rsvps(block_id, email) WHERE email IS NOT NULL;
