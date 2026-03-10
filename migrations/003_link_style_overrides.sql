-- Add per-link style overrides (JSON: { buttonStyle?, buttonBg?, buttonText? })
ALTER TABLE links ADD COLUMN style_overrides TEXT;
