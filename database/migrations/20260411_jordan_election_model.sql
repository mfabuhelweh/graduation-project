DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'candidate_gender') THEN
    CREATE TYPE candidate_gender AS ENUM ('male', 'female');
  END IF;
END $$;

ALTER TABLE elections
  ADD COLUMN IF NOT EXISTS enable_parties boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_district_lists boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS district_candidate_selection_count integer,
  ADD COLUMN IF NOT EXISTS total_national_party_seats integer NOT NULL DEFAULT 41,
  ADD COLUMN IF NOT EXISTS show_turnout_publicly boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_results_visibility_before_close boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'elections_candidate_selection_count_positive'
  ) THEN
    ALTER TABLE elections
      ADD CONSTRAINT elections_candidate_selection_count_positive CHECK (
        district_candidate_selection_count IS NULL OR district_candidate_selection_count > 0
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'elections_party_seats_positive'
  ) THEN
    ALTER TABLE elections
      ADD CONSTRAINT elections_party_seats_positive CHECK (total_national_party_seats > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS parties (
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

CREATE TABLE IF NOT EXISTS party_candidates (
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

CREATE TABLE IF NOT EXISTS district_lists (
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

CREATE TABLE IF NOT EXISTS district_list_candidates (
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

CREATE TABLE IF NOT EXISTS party_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT party_votes_one_party_per_ballot UNIQUE (ballot_id)
);

CREATE TABLE IF NOT EXISTS district_list_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  district_list_id uuid NOT NULL REFERENCES district_lists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_list_votes_one_list_per_ballot UNIQUE (ballot_id)
);

CREATE TABLE IF NOT EXISTS district_candidate_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id uuid NOT NULL REFERENCES ballots(id) ON UPDATE CASCADE ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES elections(id) ON UPDATE CASCADE ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES districts(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  district_list_id uuid NOT NULL REFERENCES district_lists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES district_list_candidates(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT district_candidate_votes_unique_candidate_per_ballot UNIQUE (ballot_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_parties_election_id ON parties (election_id);
CREATE INDEX IF NOT EXISTS idx_parties_party_code ON parties (election_id, party_code);
CREATE INDEX IF NOT EXISTS idx_party_candidates_party_id ON party_candidates (party_id);
CREATE INDEX IF NOT EXISTS idx_party_candidates_quota_id ON party_candidates (quota_id);
CREATE INDEX IF NOT EXISTS idx_party_candidates_national_id ON party_candidates (national_id);

CREATE INDEX IF NOT EXISTS idx_district_lists_election_id ON district_lists (election_id);
CREATE INDEX IF NOT EXISTS idx_district_lists_district_id ON district_lists (district_id);
CREATE INDEX IF NOT EXISTS idx_district_lists_lookup ON district_lists (election_id, district_id, list_code);
CREATE INDEX IF NOT EXISTS idx_district_list_candidates_list_id ON district_list_candidates (district_list_id);
CREATE INDEX IF NOT EXISTS idx_district_list_candidates_quota_id ON district_list_candidates (quota_id);
CREATE INDEX IF NOT EXISTS idx_district_list_candidates_national_id ON district_list_candidates (national_id);

CREATE INDEX IF NOT EXISTS idx_party_votes_party_id ON party_votes (party_id);
CREATE INDEX IF NOT EXISTS idx_party_votes_election_id ON party_votes (election_id);
CREATE INDEX IF NOT EXISTS idx_party_votes_ballot_id ON party_votes (ballot_id);

CREATE INDEX IF NOT EXISTS idx_district_list_votes_election_id ON district_list_votes (election_id);
CREATE INDEX IF NOT EXISTS idx_district_list_votes_district_id ON district_list_votes (district_id);
CREATE INDEX IF NOT EXISTS idx_district_list_votes_list_id ON district_list_votes (district_list_id);
CREATE INDEX IF NOT EXISTS idx_district_list_votes_ballot_id ON district_list_votes (ballot_id);

CREATE INDEX IF NOT EXISTS idx_district_candidate_votes_candidate_id ON district_candidate_votes (candidate_id);
CREATE INDEX IF NOT EXISTS idx_district_candidate_votes_election_id ON district_candidate_votes (election_id);
CREATE INDEX IF NOT EXISTS idx_district_candidate_votes_district_id ON district_candidate_votes (district_id);
CREATE INDEX IF NOT EXISTS idx_district_candidate_votes_list_id ON district_candidate_votes (district_list_id);
CREATE INDEX IF NOT EXISTS idx_district_candidate_votes_ballot_id ON district_candidate_votes (ballot_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quotas_scope_name
  ON quotas (election_id, COALESCE(district_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

CREATE TABLE IF NOT EXISTS import_batches (
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

CREATE TABLE IF NOT EXISTS import_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES import_batches(id) ON UPDATE CASCADE ON DELETE CASCADE,
  target_table text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_batch_items_target_table_not_blank CHECK (length(trim(target_table)) > 0),
  CONSTRAINT import_batch_items_unique_target UNIQUE (batch_id, target_table, target_id)
);

CREATE INDEX IF NOT EXISTS idx_import_batches_entity_type ON import_batches (entity_type);
CREATE INDEX IF NOT EXISTS idx_import_batches_election_id ON import_batches (election_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_status_created_at ON import_batches (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_batch_items_batch_id ON import_batch_items (batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_items_target_table ON import_batch_items (target_table);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_parties_updated_at'
  ) THEN
    CREATE TRIGGER trg_parties_updated_at
    BEFORE UPDATE ON parties
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_party_candidates_updated_at'
  ) THEN
    CREATE TRIGGER trg_party_candidates_updated_at
    BEFORE UPDATE ON party_candidates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_district_lists_updated_at'
  ) THEN
    CREATE TRIGGER trg_district_lists_updated_at
    BEFORE UPDATE ON district_lists
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_district_list_candidates_updated_at'
  ) THEN
    CREATE TRIGGER trg_district_list_candidates_updated_at
    BEFORE UPDATE ON district_list_candidates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
