# Production Setup

This project now has a working frontend, backend API, and data layer abstraction.

During local development, the backend can use an in-memory store:

```txt
ENABLE_MEMORY_STORE=true
ENABLE_DEV_AUTH=true
```

For real deployment, disable both and use Firebase Admin credentials.

## 1. Firebase Web App Config

Replace placeholder values in:

```txt
firebase-applet-config.json
```

with the real Firebase web app config from:

```txt
Firebase Console > Project settings > General > Your apps > Web app
```

## 2. Enable Google Login

In Firebase Console:

```txt
Authentication > Sign-in method > Google > Enable
Authentication > Settings > Authorized domains > add localhost and your production domain
```

## 3. Backend Firebase Admin

Create a service account:

```txt
Firebase Console > Project settings > Service accounts > Generate new private key
```

Set one of these:

```txt
GOOGLE_APPLICATION_CREDENTIALS="C:/path/to/service-account.json"
```

or:

```txt
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

For production:

```txt
ENABLE_MEMORY_STORE=false
ENABLE_DEV_AUTH=false
```

## 4. Roles

Users are stored at:

```txt
users/{uid}
```

Set admins by changing:

```json
{
  "role": "admin"
}
```

Normal voters use:

```json
{
  "role": "voter"
}
```

## 5. Real Voting Flow

The voting page sends this payload to:

```txt
POST /api/votes
```

```json
{
  "voterNationalId": "1234567890",
  "localListId": "l1",
  "localCandidateIds": ["c1-1", "c1-2"],
  "partyListId": "p1",
  "biometricToken": "token"
}
```

The backend:

- verifies an active election exists
- verifies the voter exists, except in local memory mode where a demo voter is created
- blocks duplicate voting
- stores the vote
- updates election vote count
- writes an audit log

## 6. Results

Results are available from:

```txt
GET /api/results/:electionId
```

The response includes:

```json
{
  "totalVotes": 1,
  "localLists": [{"id": "l1", "votes": 1}],
  "localCandidates": [{"id": "c1-1", "votes": 1}],
  "parties": [{"id": "p1", "votes": 1}]
}
```
