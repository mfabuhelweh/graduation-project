ALTER TABLE voters
ADD COLUMN IF NOT EXISTS password_hash text;

CREATE INDEX IF NOT EXISTS idx_voters_email ON voters (email);
