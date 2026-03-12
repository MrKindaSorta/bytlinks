-- Add email labels and secondary email support

-- bio_pages: label for the primary (login) email
ALTER TABLE bio_pages ADD COLUMN email_label TEXT DEFAULT NULL;

-- bio_pages: secondary email + its label + page-visibility toggle
ALTER TABLE bio_pages ADD COLUMN secondary_email TEXT DEFAULT NULL;
ALTER TABLE bio_pages ADD COLUMN secondary_email_label TEXT DEFAULT NULL;
ALTER TABLE bio_pages ADD COLUMN show_secondary_email_page INTEGER NOT NULL DEFAULT 0;

-- business_cards: per-card toggle for secondary email visibility
ALTER TABLE business_cards ADD COLUMN show_secondary_email INTEGER NOT NULL DEFAULT 0;

-- business_cards: per-card overrides for email labels and secondary email (Cards 2+)
ALTER TABLE business_cards ADD COLUMN override_email_label TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_secondary_email TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_secondary_email_label TEXT DEFAULT NULL;
