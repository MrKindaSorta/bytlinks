-- SEO fields for public page meta tag injection
ALTER TABLE bio_pages ADD COLUMN seo_title TEXT DEFAULT NULL;
ALTER TABLE bio_pages ADD COLUMN seo_description TEXT DEFAULT NULL;
ALTER TABLE bio_pages ADD COLUMN seo_keywords TEXT DEFAULT NULL;
