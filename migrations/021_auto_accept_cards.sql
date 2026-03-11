-- Allow users to auto-accept incoming card exchanges into their rolodex
ALTER TABLE bio_pages ADD COLUMN auto_accept_cards INTEGER NOT NULL DEFAULT 0;
