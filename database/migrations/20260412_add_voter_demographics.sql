ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS gender candidate_gender,
  ADD COLUMN IF NOT EXISTS birth_date date;

CREATE INDEX IF NOT EXISTS idx_voters_gender ON voters (gender);
CREATE INDEX IF NOT EXISTS idx_voters_birth_date ON voters (birth_date);
