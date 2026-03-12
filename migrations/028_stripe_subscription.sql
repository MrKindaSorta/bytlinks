-- Add Stripe subscription tracking to users table
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
