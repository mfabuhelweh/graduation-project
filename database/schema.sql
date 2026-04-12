CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE admin_role AS ENUM ('super_admin', 'election_admin', 'auditor');
CREATE TYPE election_status AS ENUM ('draft', 'scheduled', 'active', 'closed', 'archived');
CREATE TYPE voter_status AS ENUM ('eligible', 'pending_verification', 'verified', 'voted', 'blocked');
CREATE TYPE face_verification_result AS ENUM ('passed', 'failed', 'manual_review');
CREATE TYPE voting_token_status AS ENUM ('active', 'used', 'expired', 'revoked');
CREATE TYPE audit_actor_type AS ENUM ('admin', 'voter', 'system');
CREATE TYPE candidate_kind AS ENUM ('person', 'party_list');
CREATE TYPE candidate_gender AS ENUM ('male', 'female');

CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email citext NOT NULL UNIQUE,
  google_sub text,
  password_hash text NOT NULL,
  role admin_role NOT NULL DEFAULT 'election_admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admins_email_not_blank CHECK (length(trim(email::text)) > 3),
  CONSTRAINT admins_password_hash_not_blank CHECK (length(trim(password_hash)) >= 20)
);

CREATE TABLE elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status election_status NOT NULL DEFAULT 'draft',
  enable_parties boolean NOT NULL DEFAULT true,
  enable_district_lists boolean NOT NULL DEFAULT true,
  district_candidate_selection_count integer,
  total_national_party_seats integer NOT NULL DEFAULT 41,
  show_turnout_publicly boolean NOT NULL DEFAULT true,
  allow_results_visibility_before_close boolean NOT NULL DEFAULT false,
  created_by_admin_id uuid NOT NULL REFERENCES admins(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elections_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT elections_time_range_valid CHECK (end_at > start_at),
  CONSTRAINT elections_candidate_selection_count_positive CHECK (
    district_candidate_selection_count IS NULL OR district_candidate_selection_count > 0
  ),
  CONSTRAINT elections_party_seats_positive CHECK (total_national_party_seats > 0)
);

CREATE TABLE districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  seats_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT districts_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT districts_code_not_blank CHECK (length(trim(code)) > 0),
  CONSTRAINT districts_seats_positive CHECK (seats_count > 0),
  CONSTRAINT districts_code_unique_per_election UNIQUE (election_id, code)
);

CREATE TABLE quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid REFERENCES districts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotas_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX uq_quotas_scope_name
  ON quotas (election_id, COALESCE(district_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

CREATE TABLE candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid REFERENCES districts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  quota_id uuid REFERENCES quotas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  kind candidate_kind NOT NULL DEFAULT 'person',
  full_name text NOT NULL,
  list_name text,
  candidate_number integer,
  profile_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidates_full_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT candidates_number_positive CHECK (candidate_number IS NULL OR candidate_number > 0),
  CONSTRAINT candidates_number_unique_per_district UNIQUE (election_id, district_id, candidate_number)
);

CREATE TABLE parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  party_name text NOT NULL,
  party_code text NOT NULL,
  logo_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parties_name_not_blank CHECK (length(trim(party_name)) > 0),
  CONSTRAINT parties_code_not_blank CHECK (length(trim(party_code)) > 0),
  CONSTRAINT parties_party_code_unique UNIQUE (election_id, party_code)
);

CREATE TABLE party_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON UPDATE CASCADE ON DELETE CASCADE,
  full_name text NOT NULL,
  national_id text NOT NULL,
  candidate_order integer NOT NULL,
  gender candidate_gender NOT NULL,
  quota_id uuid REFERENCES quotas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT party_candidates_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT party_candidates_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
  CONSTRAINT party_candidates_candidate_order_positive CHECK (candidate_order > 0),
  CONSTRAINT party_candidates_order_unique UNIQUE (party_id, candidate_order),
  CONSTRAINT party_candidates_national_unique UNIQUE (party_id, national_id)
);

CREATE TABLE district_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE CASCADE,
  list_name text NOT NULL,
  list_code text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_lists_name_not_blank CHECK (length(trim(list_name)) > 0),
  CONSTRAINT district_lists_code_not_blank CHECK (length(trim(list_code)) > 0),
  CONSTRAINT district_lists_code_unique UNIQUE (election_id, district_id, list_code)
);

CREATE TABLE district_list_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_list_id uuid NOT NULL REFERENCES district_lists(id) ON UPDATE CASCADE ON DELETE CASCADE,
  full_name text NOT NULL,
  national_id text NOT NULL,
  candidate_order integer NOT NULL,
  candidate_number integer,
  gender candidate_gender NOT NULL,
  quota_id uuid REFERENCES quotas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_list_candidates_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT district_list_candidates_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
  CONSTRAINT district_list_candidates_order_positive CHECK (candidate_order > 0),
  CONSTRAINT district_list_candidates_number_positive CHECK (
    candidate_number IS NULL OR candidate_number > 0
  ),
  CONSTRAINT district_list_candidates_order_unique UNIQUE (district_list_id, candidate_order),
  CONSTRAINT district_list_candidates_national_unique UNIQUE (district_list_id, national_id)
);

CREATE TABLE voters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  full_name text NOT NULL,
  national_id text NOT NULL,
  gender candidate_gender,
  birth_date date,
  phone_number text,
  email citext,
  google_sub text,
  password_hash text,
  id_card_image_url text,
  face_template_hash text,
  has_voted boolean NOT NULL DEFAULT false,
  verified_face boolean NOT NULL DEFAULT false,
  status voter_status NOT NULL DEFAULT 'eligible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voters_full_name_not_blank CHECK (length(trim(full_name)) > 0),
  CONSTRAINT voters_national_id_format CHECK (national_id ~ '^[0-9]{10}$'),
  CONSTRAINT voters_unique_national_id_per_election UNIQUE (election_id, national_id)
);

CREATE TABLE face_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES voters(id) ON UPDATE CASCADE ON DELETE CASCADE,
  id_card_image_url text NOT NULL,
  live_capture_image_url text NOT NULL,
  similarity_score numeric(5,2) NOT NULL,
  verification_result face_verification_result NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT face_similarity_range CHECK (similarity_score >= 0 AND similarity_score <= 100),
  CONSTRAINT face_verified_at_required_when_passed CHECK (
    verification_result <> 'passed' OR verified_at IS NOT NULL
  )
);

CREATE TABLE voting_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id uuid NOT NULL REFERENCES voters(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  token_expires_at timestamptz NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  invalidated_at timestamptz,
  status voting_token_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voting_tokens_hash_not_blank CHECK (length(trim(token_hash)) >= 32),
  CONSTRAINT voting_tokens_expiry_after_issue CHECK (token_expires_at > issued_at),
  CONSTRAINT voting_tokens_used_status_consistent CHECK (
    (status = 'used' AND used_at IS NOT NULL) OR (status <> 'used')
  ),
  CONSTRAINT voting_tokens_invalidated_status_consistent CHECK (
    (status IN ('expired', 'revoked') AND invalidated_at IS NOT NULL)
    OR (status NOT IN ('expired', 'revoked'))
  )
);

CREATE TABLE ballots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  ballot_reference text NOT NULL UNIQUE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ballots_reference_not_blank CHECK (length(trim(ballot_reference)) >= 16)
);

CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT votes_unique_candidate_per_ballot UNIQUE (ballot_id, candidate_id)
);

CREATE TABLE party_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT party_votes_one_party_per_ballot UNIQUE (ballot_id)
);

CREATE TABLE district_list_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  district_list_id uuid NOT NULL REFERENCES district_lists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_list_votes_one_list_per_ballot UNIQUE (ballot_id)
);

CREATE TABLE district_candidate_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  district_list_id uuid NOT NULL REFERENCES district_lists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES district_list_candidates(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_candidate_votes_unique_candidate_per_ballot UNIQUE (ballot_id, candidate_id)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type audit_actor_type NOT NULL,
  actor_id uuid,
  action_type text NOT NULL,
  target_table text,
  target_id uuid,
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_action_not_blank CHECK (length(trim(action_type)) > 0)
);

CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_key_not_blank CHECK (length(trim(key)) > 0)
);

CREATE TABLE sanad_auth_requests (
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
  CONSTRAINT sanad_auth_requests_attempts_valid CHECK (
    attempts_count >= 0 AND max_attempts >= 1 AND attempts_count <= max_attempts
  ),
  CONSTRAINT sanad_auth_requests_otp_hash_not_blank CHECK (length(trim(otp_hash)) >= 32)
);

CREATE TABLE import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  file_name text NOT NULL,
  actor_admin_id uuid REFERENCES admins(id) ON UPDATE CASCADE ON DELETE SET NULL,
  election_id uuid REFERENCES elections(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'completed',
  inserted_rows integer NOT NULL DEFAULT 0,
  skipped_rows integer NOT NULL DEFAULT 0,
  errors_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollback_note text,
  rolled_back_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batches_entity_not_blank CHECK (length(trim(entity_type)) > 0),
  CONSTRAINT import_batches_file_name_not_blank CHECK (length(trim(file_name)) > 0),
  CONSTRAINT import_batches_status_valid CHECK (status IN ('completed', 'rolled_back', 'partially_rolled_back'))
);

CREATE TABLE import_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batch_items_target_table_not_blank CHECK (length(trim(target_table)) > 0),
  CONSTRAINT import_batch_items_unique_target UNIQUE (batch_id, target_table, target_id)
);

CREATE INDEX idx_voters_national_id ON voters (national_id);
CREATE INDEX idx_voters_election_id ON voters (election_id);
CREATE INDEX idx_voters_district_id ON voters (district_id);
CREATE INDEX idx_voters_gender ON voters (gender);
CREATE INDEX idx_voters_birth_date ON voters (birth_date);
CREATE INDEX idx_voters_status ON voters (status);
CREATE UNIQUE INDEX uq_voters_email ON voters (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_voters_google_sub ON voters (google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX uq_admins_google_sub ON admins (google_sub) WHERE google_sub IS NOT NULL;

CREATE INDEX idx_candidates_election_id ON candidates (election_id);
CREATE INDEX idx_candidates_district_id ON candidates (district_id);
CREATE INDEX idx_candidates_quota_id ON candidates (quota_id);
CREATE INDEX idx_candidates_kind ON candidates (kind);

CREATE INDEX idx_parties_election_id ON parties (election_id);
CREATE INDEX idx_parties_party_code ON parties (election_id, party_code);
CREATE INDEX idx_party_candidates_party_id ON party_candidates (party_id);
CREATE INDEX idx_party_candidates_quota_id ON party_candidates (quota_id);
CREATE INDEX idx_party_candidates_national_id ON party_candidates (national_id);

CREATE INDEX idx_district_lists_election_id ON district_lists (election_id);
CREATE INDEX idx_district_lists_district_id ON district_lists (district_id);
CREATE INDEX idx_district_lists_lookup ON district_lists (election_id, district_id, list_code);
CREATE INDEX idx_district_list_candidates_list_id ON district_list_candidates (district_list_id);
CREATE INDEX idx_district_list_candidates_quota_id ON district_list_candidates (quota_id);
CREATE INDEX idx_district_list_candidates_national_id ON district_list_candidates (national_id);

CREATE INDEX idx_elections_status_time ON elections (status, start_at, end_at);
CREATE INDEX idx_districts_election_id ON districts (election_id);
CREATE INDEX idx_quotas_election_id ON quotas (election_id);
CREATE INDEX idx_quotas_district_id ON quotas (district_id);

CREATE INDEX idx_face_verifications_voter_id_created_at ON face_verifications (voter_id, created_at DESC);
CREATE INDEX idx_face_verifications_result ON face_verifications (verification_result);

CREATE INDEX idx_voting_tokens_hash_status ON voting_tokens (token_hash, status);
CREATE INDEX idx_voting_tokens_voter_election ON voting_tokens (voter_id, election_id);
CREATE INDEX idx_voting_tokens_expiry ON voting_tokens (token_expires_at);
CREATE INDEX idx_voting_tokens_active_partial ON voting_tokens (election_id, token_expires_at)
  WHERE status = 'active';

CREATE INDEX idx_ballots_election_submitted_at ON ballots (election_id, submitted_at DESC);

CREATE INDEX idx_votes_ballot_id ON votes (ballot_id);
CREATE INDEX idx_votes_election_candidate ON votes (election_id, candidate_id);

CREATE INDEX idx_party_votes_party_id ON party_votes (party_id);
CREATE INDEX idx_party_votes_election_id ON party_votes (election_id);
CREATE INDEX idx_party_votes_ballot_id ON party_votes (ballot_id);

CREATE INDEX idx_district_list_votes_election_id ON district_list_votes (election_id);
CREATE INDEX idx_district_list_votes_district_id ON district_list_votes (district_id);
CREATE INDEX idx_district_list_votes_list_id ON district_list_votes (district_list_id);
CREATE INDEX idx_district_list_votes_ballot_id ON district_list_votes (ballot_id);

CREATE INDEX idx_district_candidate_votes_candidate_id ON district_candidate_votes (candidate_id);
CREATE INDEX idx_district_candidate_votes_election_id ON district_candidate_votes (election_id);
CREATE INDEX idx_district_candidate_votes_district_id ON district_candidate_votes (district_id);
CREATE INDEX idx_district_candidate_votes_list_id ON district_candidate_votes (district_list_id);
CREATE INDEX idx_district_candidate_votes_ballot_id ON district_candidate_votes (ballot_id);

CREATE INDEX idx_sanad_auth_requests_voter_id ON sanad_auth_requests (voter_id);
CREATE INDEX idx_sanad_auth_requests_national_status ON sanad_auth_requests (national_id, status);
CREATE INDEX idx_sanad_auth_requests_expires_at ON sanad_auth_requests (expires_at);

CREATE INDEX idx_import_batches_entity_type ON import_batches (entity_type);
CREATE INDEX idx_import_batches_election_id ON import_batches (election_id);
CREATE INDEX idx_import_batches_status_created_at ON import_batches (status, created_at DESC);
CREATE INDEX idx_import_batch_items_batch_id ON import_batch_items (batch_id);
CREATE INDEX idx_import_batch_items_target_table ON import_batch_items (target_table);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_type, actor_id);
CREATE INDEX idx_audit_logs_action_created_at ON audit_logs (action_type, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_table, target_id);
CREATE INDEX idx_audit_logs_details_json ON audit_logs USING gin (details_json);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_elections_updated_at
BEFORE UPDATE ON elections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_parties_updated_at
BEFORE UPDATE ON parties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_party_candidates_updated_at
BEFORE UPDATE ON party_candidates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_district_lists_updated_at
BEFORE UPDATE ON district_lists
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_district_list_candidates_updated_at
BEFORE UPDATE ON district_list_candidates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_voters_updated_at
BEFORE UPDATE ON voters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sanad_auth_requests_updated_at
BEFORE UPDATE ON sanad_auth_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
