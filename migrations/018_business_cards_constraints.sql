-- Add index on page_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_cards_page ON business_cards(page_id);

-- Add unique constraint on (page_id, order_num) to prevent duplicate ordering
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_cards_page_order ON business_cards(page_id, order_num);
