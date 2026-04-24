ALTER TABLE voters
  ADD COLUMN IF NOT EXISTS age integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'voters_age_range'
  ) THEN
    ALTER TABLE voters
      ADD CONSTRAINT voters_age_range CHECK (age IS NULL OR (age >= 0 AND age <= 120));
  END IF;
END $$;

UPDATE voters
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date))::int
WHERE birth_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voters_age ON voters (age);

CREATE OR REPLACE FUNCTION sync_voter_age()
RETURNS trigger AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.birth_date))::int;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_voters_sync_age ON voters;

CREATE TRIGGER trg_voters_sync_age
BEFORE INSERT OR UPDATE OF birth_date, age ON voters
FOR EACH ROW EXECUTE FUNCTION sync_voter_age();
