WITH admin_seed AS (
  INSERT INTO admins (id, full_name, email, password_hash, role)
  VALUES (
    '00000000-0000-0000-0000-000000000001',
    'System Administrator',
    'admin@votesecure.test',
    '$2b$10$OxmNxzmxSCeymOEoFpamyOR45B8mvUp28h2a9GHNvTXZlpWFg2Ie6',
    'super_admin'
  )
  ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
  RETURNING id
),
election_seed AS (
  INSERT INTO elections (id, title, description, start_at, end_at, status, created_by_admin_id)
  VALUES (
    '10000000-0000-0000-0000-000000000001',
    'Jordan Online Parliamentary Election 2026',
    'Graduation project production-like online election.',
    '2026-05-01 08:00:00+03',
    '2026-05-01 20:00:00+03',
    'scheduled',
    '00000000-0000-0000-0000-000000000001'
  )
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
),
district_seed AS (
  INSERT INTO districts (id, election_id, name, code, seats_count)
  VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Amman First District', 'AMM-1', 5),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Irbid Second District', 'IRB-2', 4)
  ON CONFLICT (election_id, code) DO UPDATE SET seats_count = EXCLUDED.seats_count
  RETURNING id
),
quota_seed AS (
  INSERT INTO quotas (id, election_id, district_id, name, description)
  VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', NULL, 'General', 'General national competition.'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Women quota', 'Reserved district quota.')
  ON CONFLICT (election_id, district_id, name) DO UPDATE SET description = EXCLUDED.description
  RETURNING id
)
INSERT INTO candidates (id, election_id, district_id, quota_id, kind, full_name, list_name, candidate_number, profile_image_url)
VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'person', 'Khaled Al-Majali', 'Karama List', 1, NULL),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'person', 'Sara Al-Abadi', 'Karama List', 2, NULL),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'person', 'Mohammad Al-Zoubi', 'Wafa List', 1, NULL),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', NULL, '30000000-0000-0000-0000-000000000001', 'party_list', 'Progress Party National List', 'Progress Party', 101, NULL)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO voters (id, election_id, district_id, full_name, national_id, gender, birth_date, phone_number, email, password_hash, status)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ahmad Saleh', '1234567890', 'male', '1997-03-14', '0791111111', 'ahmad@example.test', crypt('12345', gen_salt('bf')), 'eligible'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lina Hassan', '1234567891', 'female', '1999-08-21', '0792222222', 'lina@example.test', crypt('12345', gen_salt('bf')), 'eligible'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Omar Khaled', '1234567892', 'male', '1994-11-02', '0793333333', 'omar@example.test', crypt('12345', gen_salt('bf')), 'eligible')
ON CONFLICT (election_id, national_id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash;

INSERT INTO system_settings (key, value)
VALUES
  ('token_ttl_minutes', '10'::jsonb),
  ('face_verification_threshold', '90'::jsonb),
  ('max_face_verification_attempts', '3'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
