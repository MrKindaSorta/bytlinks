-- Add updated_at column to bio_pages
ALTER TABLE bio_pages ADD COLUMN updated_at INTEGER
  DEFAULT (unixepoch()) NOT NULL;

-- Backfill existing rows with created_at value
-- so existing users don't show epoch 0
UPDATE bio_pages SET updated_at = created_at
  WHERE updated_at = 0 OR updated_at IS NULL;

-- Trigger: keep updated_at current on any row change
CREATE TRIGGER bio_pages_updated_at
AFTER UPDATE ON bio_pages
FOR EACH ROW
BEGIN
  UPDATE bio_pages SET updated_at = unixepoch()
  WHERE id = NEW.id;
END;
