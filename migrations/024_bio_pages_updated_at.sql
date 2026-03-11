-- Add updated_at column to bio_pages (D1 requires constant defaults for ALTER TABLE)
ALTER TABLE bio_pages ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with created_at value
UPDATE bio_pages SET updated_at = created_at WHERE updated_at = 0;

-- Trigger: keep updated_at current on any row change
CREATE TRIGGER bio_pages_updated_at
AFTER UPDATE ON bio_pages
FOR EACH ROW
BEGIN
  UPDATE bio_pages SET updated_at = unixepoch()
  WHERE id = NEW.id;
END;
