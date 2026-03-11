-- Add cryptographic access tokens for private card URLs
ALTER TABLE business_cards ADD COLUMN access_token TEXT;

-- Create unique index for fast token lookups
CREATE UNIQUE INDEX idx_business_cards_access_token ON business_cards(access_token);
