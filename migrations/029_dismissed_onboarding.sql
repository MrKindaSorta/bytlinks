-- Track onboarding checklist dismissal
ALTER TABLE users ADD COLUMN dismissed_onboarding INTEGER DEFAULT 0;
