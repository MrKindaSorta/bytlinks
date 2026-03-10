-- Add optional "About Me" extended bio field (up to 1000 chars, enforced client-side)
ALTER TABLE bio_pages ADD COLUMN about_me TEXT;
ALTER TABLE bio_pages ADD COLUMN about_me_expanded INTEGER DEFAULT 0;
