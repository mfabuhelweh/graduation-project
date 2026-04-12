# JordanVote: National Parliamentary & Party Election Platform
## Systems Analysis & Design (SAD) Documentation

### Phase 1 — Problem Definition
**Traditional Paper Elections Problem (Jordanian Context):**
- High cost of logistics across 18 local districts and the national party list.
- Difficulty in managing two separate ballots (District + Party) simultaneously.
- Long wait times for results across the Kingdom.
- Challenges in verifying voter eligibility across different districts.

**Objectives of the JordanVote system:**
- To provide a secure, cost-effective digital alternative for the Jordanian House of Representatives.
- To support the dual-ballot system (Local District Candidates + National Party Lists).
- To ensure anonymity and prevent any tracing of votes to individual citizens.
- To automate counting for real-time national results tracking.

---

### Phase 2 — Requirements Gathering

**Functional Requirements:**
1. Admin (IEC) can manage local districts and national party lists.
2. System supports two-stage voting (District Vote + Party List Vote).
3. System generates unique tokens linked to the voter's National ID (but stored anonymously).
4. System sends SMS via Jordanian gateways (Zain, Orange, Umniah).
5. Real-time results dashboard showing district-level and party-level standings.

**Non-Functional Requirements:**
- **Security:** AES-256 encryption for vote storage.
- **Jordanian Compliance:** Adherence to the Jordanian Election Law of 2022.
- **Availability:** High availability during the 24-hour voting window.

---

### Phase 3 — System Modeling

**Use Case Diagram:**
- **IEC Admin:** Manage Districts, Manage Parties, Monitor Turnout, Certify Results.
- **Citizen:** Receive SMS, Authenticate, Vote for District Candidate, Vote for Party List.

**Entity Relationship Diagram (ERD):**
- `Districts` (id, name, seats_count)
- `Parties` (id, name, logo_url)
- `Candidates` (id, district_id, name, party_id)
- `Voters` (id, district_id, phone, token, has_voted)
- `Votes` (id, district_id, candidate_id, party_id, timestamp)

---

### Phase 4 — System Architecture
**3-Tier Architecture:**
1. **Presentation Layer:** React (Vite) for the frontend.
2. **Application Layer:** Node.js (Express) for the backend API.
3. **Data Layer:** Firestore (Live Implementation) / PostgreSQL (Design).

---

### Phase 5 — Database Design (SQL Schema)

```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'draft'
);

CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    name VARCHAR(255) NOT NULL,
    party VARCHAR(255),
    photo_url TEXT
);

CREATE TABLE voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    phone_number VARCHAR(20) NOT NULL,
    token UUID UNIQUE NOT NULL,
    has_voted BOOLEAN DEFAULT FALSE,
    UNIQUE(election_id, phone_number)
);

CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(id),
    candidate_id UUID REFERENCES candidates(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Phase 6 — API Design

| Method | URL | Request Body | Response |
|---|---|---|---|
| POST | `/api/elections` | `{ title, start, end }` | `{ id, status: 'created' }` |
| POST | `/api/voters/upload` | `FormData (CSV)` | `{ count: 500 }` |
| POST | `/api/sms/send` | `{ electionId }` | `{ status: 'queued' }` |
| GET | `/api/vote/validate/:token` | `None` | `{ valid: true, election: {...} }` |
| POST | `/api/vote/cast` | `{ token, candidateId }` | `{ success: true }` |

---

### Phase 7 — Security Design
1. **Tokenization:** Each voter gets a UUID v4 token.
2. **One-Time Enforcement:** The `voters` table tracks `has_voted`. Once true, the token is invalidated.
3. **Anonymity:** The `votes` table has NO foreign key to the `voters` table.
4. **Encryption:** All data in transit is encrypted via HTTPS.

---

### Phase 8 — UI Pages
1. **Admin Dashboard:** Overview of all elections.
2. **Create Election:** Form for title, dates, and candidates.
3. **Voter Registry:** CSV upload and status tracking.
4. **SMS Gateway:** Simulation of Zain/Orange/Umniah sending.
5. **Voting Page:** Secure interface for voters to select candidates.
6. **Results Page:** Real-time bar charts and statistics.

---

### Phase 9 — Voting Workflow
1. Admin creates election.
2. Admin uploads voters.
3. System generates tokens.
4. System sends SMS (Simulated).
5. Voter clicks link (e.g., `vote.jo/v?t=uuid`).
6. System checks `voters` table for `token` and `has_voted == false`.
7. Voter selects candidate and submits.
8. System:
   - Sets `voters.has_voted = true`.
   - Inserts into `votes` table (anonymous).
9. Results update via real-time listener.

---

### Phase 10 — Technology Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Firestore (Real-time)
- **Icons:** Lucide React
- **Animations:** Motion
- **Charts:** Recharts
