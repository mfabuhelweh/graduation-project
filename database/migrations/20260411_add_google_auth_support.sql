ALTER TABLE admins
ADD COLUMN IF NOT EXISTS google_sub text;

ALTER TABLE voters
ADD COLUMN IF NOT EXISTS google_sub text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admins_google_sub
ON admins (google_sub)
WHERE google_sub IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_voters_google_sub
ON voters (google_sub)
WHERE google_sub IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_voters_email
ON voters (email)
WHERE email IS NOT NULL;
