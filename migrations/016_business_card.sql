-- Business card fields and visibility toggles
ALTER TABLE bio_pages ADD COLUMN phone TEXT;
ALTER TABLE bio_pages ADD COLUMN company_name TEXT;
ALTER TABLE bio_pages ADD COLUMN address TEXT;

-- Per-field visibility: page = shown on public page, card = shown on business card
ALTER TABLE bio_pages ADD COLUMN show_email_page INTEGER DEFAULT 0;
ALTER TABLE bio_pages ADD COLUMN show_email_card INTEGER DEFAULT 1;
ALTER TABLE bio_pages ADD COLUMN show_phone_page INTEGER DEFAULT 0;
ALTER TABLE bio_pages ADD COLUMN show_phone_card INTEGER DEFAULT 1;
ALTER TABLE bio_pages ADD COLUMN show_company_page INTEGER DEFAULT 0;
ALTER TABLE bio_pages ADD COLUMN show_company_card INTEGER DEFAULT 1;
ALTER TABLE bio_pages ADD COLUMN show_address_page INTEGER DEFAULT 0;
ALTER TABLE bio_pages ADD COLUMN show_address_card INTEGER DEFAULT 1;
