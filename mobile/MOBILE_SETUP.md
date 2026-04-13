# VoteSecure Voter Mobile Setup

## Overview

This folder adds a dedicated Expo / React Native voter application without replacing the current PostgreSQL backend or the existing web admin panel.

The mobile app reuses the current backend JWT flow and the same election, voting, results, and voter data.

## Current Integration Strategy

- Backend: reuse the current Express + PostgreSQL API.
- Admin panel: no rewrite required.
- Mobile app: added under `/mobile`.
- Authentication: uses `/api/auth/login` and `/api/auth/me`.
- Voting: uses `/api/elections/:id/ballot`, `/api/voters/verify-face`, and `/api/votes`.
- Results: uses `/api/results/:electionId`.

## 1. Install Dependencies

From the project root:

```bash
cd mobile
npm install
```

## 2. Configure Environment Variables

Create a local `.env` file inside `/mobile`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.131.115:3215/api
```

Use your machine LAN IP when testing on a physical phone.

Examples:

- Android emulator with backend on host machine: `http://10.0.2.2:3215/api`
- iOS simulator: `http://localhost:3215/api`
- Physical device on same Wi-Fi: `http://192.168.131.115:3215/api`

## 3. Start the Existing Backend

From the project root:

```bash
npm run start:backend
```

Or during development:

```bash
npm run dev:backend
```

Make sure the backend is reachable from the device running Expo.

## 4. Run the Mobile App

From `/mobile`:

```bash
npm run start
```

Then choose:

- `a` for Android emulator
- `i` for iOS simulator
- Expo Go on a physical device by scanning the QR code

## 5. Authentication Notes

This mobile app follows the actual current backend direction:

- It does not force a Firebase-first mobile auth flow.
- It uses the backend login endpoint and stores the backend JWT securely.
- Firebase can stay in the project for legacy web usage, but mobile is built around the backend JWT that already exists.

## 6. RTL and Arabic

The mobile UI is Arabic-first:

- right-aligned text
- RTL-friendly layout decisions
- labels and flows written in Arabic

If you later want full runtime language switching, add a lightweight i18n layer on top of the current text structure.

## 7. Small Backend Compatibility Additions

The mobile app is designed to work best with two additive endpoints:

- `GET /api/voters/me`
- `GET /api/notifications`

If these are missing, profile currently falls back to the legacy `/api/voters/:nationalId` route when available.

Notifications read/unread state is stored locally on the device unless the backend later adds persistence for it.

## 8. Face Verification / Voting Token Note

The existing backend requires a voting token before posting the final vote.

Because of that, the mobile vote flow issues the token first through:

- `POST /api/voters/verify-face`

Then it submits the final ballot through:

- `POST /api/votes`

This preserves the current backend business rules instead of bypassing them.

## 9. Recommended Next Step

After verifying the app locally, the cleanest backend hardening step is:

1. keep `/api/voters/me` as the safe profile endpoint for mobile
2. keep `/api/notifications` as a lightweight voter notification feed
3. later replace dev-mode face verification with the real production verification provider
