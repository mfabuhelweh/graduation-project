CREATE TABLE IF NOT EXISTS sanad_auth_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES voters(id) ON UPDATE CASCADE ON DELETE CASCADE,
  national_id text NOT NULL,
  phone_number_snapshot text,
  request_reference text NOT NULL UNIQUE,
  otp_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending_otp',
  attempts_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sanad_auth_requests_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
  CONSTRAINT sanad_auth_requests_status_valid CHECK (
    status IN ('pending_otp', 'otp_verified', 'consumed', 'expired', 'cancelled')
  ),
  CONSTRAINT sanad_auth_requests_attempts_valid CHECK (attempts_count >= 0 AND max_attempts >= 1 AND attempts_count <= max_attempts),
  CONSTRAINT sanad_auth_requests_otp_hash_not_blank CHECK (length(trim(otp_hash)) >= 32)
);

CREATE INDEX IF NOT EXISTS idx_sanad_auth_requests_voter_id
ON sanad_auth_requests (voter_id);

CREATE INDEX IF NOT EXISTS idx_sanad_auth_requests_national_status
ON sanad_auth_requests (national_id, status);

CREATE INDEX IF NOT EXISTS idx_sanad_auth_requests_expires_at
ON sanad_auth_requests (expires_at);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sanad_auth_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_sanad_auth_requests_updated_at
    BEFORE UPDATE ON sanad_auth_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
