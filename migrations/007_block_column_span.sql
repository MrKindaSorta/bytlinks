-- Per-block column span override for 2-column desktop grid
ALTER TABLE content_blocks ADD COLUMN column_span TEXT DEFAULT NULL;
