-- Add icon_style column to social_links
ALTER TABLE social_links ADD COLUMN icon_style TEXT DEFAULT 'plain';
