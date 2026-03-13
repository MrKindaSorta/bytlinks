-- Store raw invite token so the invite URL can be displayed after creation
ALTER TABLE affiliation_invites ADD COLUMN token TEXT DEFAULT NULL;
