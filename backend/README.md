# VoteSecure Backend

Express + TypeScript API layer for the voting system.

## Run

```bash
npm run dev:backend
```

By default the API runs on:

```txt
http://localhost:3000
```

If port `3000` is busy, run with another port:

```powershell
$env:PORT="3100"; npm run dev:backend
```

## Environment

Copy `.env.example` to `.env.local` or `.env`, then configure:

```txt
PORT=3000
CORS_ORIGIN="http://localhost:5173"
GOOGLE_APPLICATION_CREDENTIALS="C:/path/to/firebase-service-account.json"
```

You can also use `FIREBASE_SERVICE_ACCOUNT_JSON` instead of `GOOGLE_APPLICATION_CREDENTIALS`.

## API Routes

```txt
GET    /api/health
POST   /api/sms/send

GET    /api/elections
GET    /api/elections/:id
POST   /api/elections
PATCH  /api/elections/:id
DELETE /api/elections/:id

GET    /api/voters
GET    /api/voters/:nationalId
POST   /api/voters
PATCH  /api/voters/:id

POST   /api/votes
GET    /api/results/:electionId
GET    /api/audit
```

Admin routes require a Firebase ID token in:

```txt
Authorization: Bearer <firebase-id-token>
```
