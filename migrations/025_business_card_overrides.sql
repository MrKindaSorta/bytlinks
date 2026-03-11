-- Per-card override fields for Cards 2+ (order_num > 0).
-- Card 1 (order_num = 0) always mirrors bio_pages; these columns stay NULL for it.
ALTER TABLE business_cards ADD COLUMN override_display_name TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_bio TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_job_title TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_profession TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_phone TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_company_name TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_address TEXT DEFAULT NULL;
ALTER TABLE business_cards ADD COLUMN override_email TEXT DEFAULT NULL;
