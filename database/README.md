# Database Architecture Summary

This PostgreSQL schema is designed for a production-quality graduation project for online elections. It supports admins, elections, districts, quotas, candidates, voters, face verification records, one-time voting tokens, anonymous ballots, votes, audit logs, and system settings.

The core privacy rule is enforced structurally: `votes` never stores `voter_id`, `national_id`, raw token values, or any direct personal identifier. Voter identity is used only before ballot creation, through `voters`, `face_verifications`, and `voting_tokens`.

# Tables and Relationships

`admins` stores system administrators. Admins create elections and perform sensitive management actions.

`elections` stores election definitions and lifecycle status: `draft`, `scheduled`, `active`, `closed`, `archived`. Each election references the admin who created it.

`districts` stores election districts. Each district belongs to one election and can define seat counts.

`quotas` stores quota categories such as General, Women quota, Christian, or Circassian/Chechen. A quota can be election-wide or district-specific.

`candidates` stores both individual candidates and party-list choices using `candidate_kind`. Local candidates usually have a `district_id`; national party-list rows may have `district_id` as null.

`voters` stores registered voters for an election. The chosen constraint is `UNIQUE (election_id, national_id)`, which allows the same national ID to participate in different elections over years, while preventing duplicate registration inside the same election.

`face_verifications` stores verification attempts separately from votes. Multiple attempts per voter are supported.

`voting_tokens` stores hashed one-time opaque voting tokens. The raw token is only shown to the voter/session once and is never stored.

`ballots` stores anonymous submitted ballot sessions. It has no voter identity.

`votes` stores vote selections linked only to a ballot, election, and candidate. It does not store voter identity.

`audit_logs` stores sensitive actions such as election creation, face verification, token issuance, token use, vote casting, and token revocation.

`system_settings` stores configurable values such as token TTL and face verification threshold.

# PostgreSQL ENUM Types

The schema defines:

- `admin_role`: `super_admin`, `election_admin`, `auditor`
- `election_status`: `draft`, `scheduled`, `active`, `closed`, `archived`
- `voter_status`: `eligible`, `pending_verification`, `verified`, `voted`, `blocked`
- `face_verification_result`: `passed`, `failed`, `manual_review`
- `voting_token_status`: `active`, `used`, `expired`, `revoked`
- `audit_actor_type`: `admin`, `voter`, `system`
- `candidate_kind`: `person`, `party_list`

# Full CREATE TABLE SQL

See:

```txt
database/schema.sql
```

# Indexes SQL

Indexes are included in:

```txt
database/schema.sql
```

Important indexing choices:

- `idx_voters_national_id`: quick lookup during voter verification.
- `idx_voters_election_id`: list/search voters per election.
- `idx_voters_district_id`: filter voters by district.
- `idx_voting_tokens_hash_status`: validate hashed token quickly.
- `idx_voting_tokens_active_partial`: fast lookup of active unexpired tokens.
- `idx_votes_election_candidate`: vote counting by election and candidate.
- `idx_ballots_election_submitted_at`: ballot reporting by election.
- `idx_audit_logs_action_created_at`: audit history by action.
- `idx_audit_logs_actor`: audit history by actor.
- `idx_audit_logs_details_json`: GIN index for JSON details search.

# Sample Seed Data

See:

```txt
database/seed.sql
```

The seed creates one admin, one election, two districts, two quotas, four candidates, three voters, and system settings.

# Transaction Flow for Vote Casting

Use a single database transaction:

1. Hash the raw token from the request.
2. Select the token row using `token_hash` and `status = 'active'` with `FOR UPDATE`.
3. Ensure `token_expires_at > now()`.
4. Select the voter row by `voter_id` from the token with `FOR UPDATE`.
5. Ensure `voters.has_voted = false` and status is `verified`.
6. Create a row in `ballots` with a random `ballot_reference`.
7. Insert vote rows into `votes` for selected candidates.
8. Set token `status = 'used'`, `used_at = now()`.
9. Set voter `has_voted = true`, `status = 'voted'`.
10. Insert an audit log for `vote_cast` and `token_used`.
11. Commit.

If any step fails, roll back the full transaction.

# Privacy and Security Notes

The `votes` table is anonymous by design. It only links a vote to a `ballot_id`, `election_id`, and `candidate_id`.

The link between voter and vote is intentionally not stored. `voting_tokens` references voters, but tokens are marked used and do not reference ballots. `ballots` reference elections only.

Remaining risks if application code is implemented incorrectly:

- Logging raw tokens could allow token replay or correlation.
- Storing `ballot_id` in `voting_tokens` would create a voter-to-vote link.
- Writing `national_id` into audit details for `vote_cast` could leak identity.
- Storing images in public buckets would expose sensitive biometric data.
- Using deterministic ballot references could allow correlation.

# Recommended Next Backend Steps

1. Add PostgreSQL connection with `pg` or Prisma.
2. Implement repositories for admins, elections, candidates, voters, tokens, ballots, votes, and audits.
3. Replace memory store with PostgreSQL transactions.
4. Implement secure token generation:
   - generate random 256-bit token
   - show raw token once
   - store SHA-256 or Argon2id hash only
5. Implement face verification service and store only secure URLs plus hashes/templates.
6. Add admin APIs for importing voters and candidates.
7. Add RLS or service-role separation if exposing database access beyond the backend.
8. Add backups, migration tooling, and seed scripts for development.
