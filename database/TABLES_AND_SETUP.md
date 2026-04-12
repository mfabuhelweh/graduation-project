# PostgreSQL Tables and Setup

## Database overview

This project uses PostgreSQL as the primary database for the Jordanian e-voting system.
The schema supports:

- admin accounts
- elections
- districts
- quotas
- national parties
- party candidates
- district lists
- district list candidates
- voters
- face verification
- hashed one-time voting tokens
- anonymous ballots
- separated vote tables for party vote and district vote
- audit logs

The system keeps voter identity out of vote tables. The voter is linked only to:

- `voters`
- `face_verifications`
- `voting_tokens`

The actual ballot is anonymous and stored through:

- `ballots`
- `party_votes`
- `district_list_votes`
- `district_candidate_votes`

The import center also tracks every uploaded file through:

- `import_batches`
- `import_batch_items`

## How to run the database

1. Create a PostgreSQL database named `election_system`.
2. Put this in `.env`:

```env
DATABASE_URL="postgresql://postgres:123@localhost:5432/election_system"
ENABLE_MEMORY_STORE="false"
```

3. Run migrations:

```bash
npm run db:migrate
```

4. Optional full schema apply:

```bash
npm run db:schema
```

5. Optional seeds:

```bash
npm run db:seed
```

## Tables imported manually by admin

These tables are loaded by admin from CSV/XLSX import files or direct SQL:

### `admins`

- `id`
- `full_name`
- `email`
- `password_hash`
- `role`
- `google_sub`
- `created_at`
- `updated_at`

### `elections`

- `id`
- `title`
- `description`
- `start_at`
- `end_at`
- `status`
- `enable_parties`
- `enable_district_lists`
- `district_candidate_selection_count`
- `total_national_party_seats`
- `show_turnout_publicly`
- `allow_results_visibility_before_close`
- `created_by_admin_id`
- `created_at`
- `updated_at`

### `districts`

- `id`
- `election_id`
- `name`
- `code`
- `seats_count`
- `created_at`

### `quotas`

- `id`
- `election_id`
- `district_id`
- `name`
- `description`
- `created_at`

### `parties`

- `id`
- `election_id`
- `party_name`
- `party_code`
- `logo_url`
- `description`
- `created_at`
- `updated_at`

### `party_candidates`

- `id`
- `party_id`
- `full_name`
- `national_id`
- `candidate_order`
- `gender`
- `quota_id`
- `photo_url`
- `created_at`
- `updated_at`

### `district_lists`

- `id`
- `election_id`
- `district_id`
- `list_name`
- `list_code`
- `description`
- `created_at`
- `updated_at`

### `district_list_candidates`

- `id`
- `district_list_id`
- `full_name`
- `national_id`
- `candidate_order`
- `candidate_number`
- `gender`
- `quota_id`
- `photo_url`
- `created_at`
- `updated_at`

### `voters`

- `id`
- `election_id`
- `district_id`
- `full_name`
- `national_id`
- `phone_number`
- `email`
- `password_hash`
- `google_sub`
- `id_card_image_url`
- `face_template_hash`
- `has_voted`
- `verified_face`
- `status`
- `created_at`
- `updated_at`

## Tables generated automatically by backend

These tables must not be manually filled during normal operation:

### `face_verifications`

Stores each biometric verification attempt separately from votes.

### `voting_tokens`

Stores only `token_hash`, not the raw token.
Each token is:

- opaque
- one-time
- revoked after new verification
- marked used after successful vote

### `ballots`

Stores the anonymous ballot session:

- `id`
- `election_id`
- `ballot_reference`
- `submitted_at`
- `created_at`

No voter identity is stored here.

### `party_votes`

One anonymous national party selection per ballot.

### `district_list_votes`

One anonymous district list selection per ballot.

### `district_candidate_votes`

Stores candidate picks from the selected district list only.

### `audit_logs`

Stores sensitive actions:

- admin election creation
- imports
- token issuance
- token usage
- vote casting
- biometric failures

### `import_batches`

Stores one record for each uploaded import file:

- imported entity type
- original file name
- inserted row count
- skipped row count
- validation errors
- rollback status

### `import_batch_items`

Stores the exact rows inserted by each import batch.
This allows the admin panel to delete all database rows that came from one uploaded file only.

## Legacy compatibility tables

The project still keeps these existing tables because the codebase already had them:

- `candidates`
- `votes`
- `system_settings`
- `sanad_auth_requests`

The new Jordanian election flow now relies primarily on:

- `parties`
- `party_candidates`
- `district_lists`
- `district_list_candidates`
- `party_votes`
- `district_list_votes`
- `district_candidate_votes`

## Import files

Store templates in:

- `database/import-templates/`

Store sample files in:

- `database/sample-imports/`

Supported files:

1. `elections.csv` / `elections.xlsx`
2. `districts.csv` / `districts.xlsx`
3. `quotas.csv` / `quotas.xlsx`
4. `parties.csv` / `parties.xlsx`
5. `party_candidates.csv` / `party_candidates.xlsx`
6. `district_lists.csv` / `district_lists.xlsx`
7. `district_list_candidates.csv` / `district_list_candidates.xlsx`
8. `voters.csv` / `voters.xlsx`

The admin panel can:

- show the selected file before upload
- clear the selected file before importing
- list previous uploaded files
- delete database rows imported by a specific file

## Exact import order

Use this exact order:

1. `elections`
2. `districts`
3. `quotas`
4. `parties`
5. `party_candidates`
6. `district_lists`
7. `district_list_candidates`
8. `voters`

The backend resolves references using lookup keys, not raw IDs:

- `election_title`
- `district_code`
- `party_code`
- `list_code`
- `quota_name`

## Full reset behavior

The admin panel includes a dangerous reset action:

- `POST /api/admin/system/reset-data`

This action deletes all operational data from the database tables, including:

- elections
- districts
- quotas
- parties
- party_candidates
- district_lists
- district_list_candidates
- voters
- face_verifications
- voting_tokens
- ballots
- party_votes
- district_list_votes
- district_candidate_votes
- import_batches
- import_batch_items
- audit_logs

For safety, it preserves:

- `admins`

This means you can wipe election data without losing the admin login.

## Ballot model used by the system

The Jordanian voting flow is:

1. voter enters national ID
2. voter uploads ID image and live face image
3. backend verifies voter identity
4. backend records a `face_verifications` row
5. backend issues one opaque raw token
6. backend stores only `token_hash`
7. voter chooses:
   - one national party
   - one district list from the voter district
   - one or more candidates from that same district list only
8. backend opens a transaction
9. backend validates token, election, voter, party, list, and candidates
10. backend inserts anonymous `ballots`
11. backend inserts `party_votes`
12. backend inserts `district_list_votes`
13. backend inserts `district_candidate_votes`
14. backend marks token as used
15. backend marks voter as voted
16. backend writes `audit_logs`

## Anonymity model

The schema protects anonymity by design:

- `party_votes` does not contain `voter_id`
- `district_list_votes` does not contain `voter_id`
- `district_candidate_votes` does not contain `voter_id`
- `ballots` does not contain national ID
- `voting_tokens` stores hash only
- voter identity stays in `voters`, not in vote tables

Remaining risk is application misuse. For example:

- logging the raw token
- storing national ID in frontend local storage during voting
- joining token usage reports to ballot timing carelessly

The provided backend flow avoids this by consuming the token and writing only anonymous ballot rows during vote submission.

## Imported vs generated tables summary

Admin-imported tables:

- `admins`
- `elections`
- `districts`
- `quotas`
- `parties`
- `party_candidates`
- `district_lists`
- `district_list_candidates`
- `voters`

System-generated tables:

- `face_verifications`
- `voting_tokens`
- `ballots`
- `party_votes`
- `district_list_votes`
- `district_candidate_votes`
- `audit_logs`
- `import_batches`
- `import_batch_items`
