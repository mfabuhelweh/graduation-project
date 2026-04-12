# Auth Roles

Users are separated by the `role` field in Firestore.

## Firestore Path

```txt
users/{firebaseAuthUid}
```

## Voter User

New users are created as voters by default after Google login:

```json
{
  "uid": "firebase-auth-uid",
  "displayName": "User Name",
  "email": "user@example.com",
  "photoURL": "https://...",
  "role": "voter",
  "hasVoted": false,
  "createdAt": "2026-04-10T00:00:00.000Z"
}
```

## Admin User

To make a user an admin, edit that user's document in Firebase Console:

```json
{
  "role": "admin"
}
```

After changing the role, the user should sign out and sign in again.

## App Behavior

- `role: "admin"` sees the admin dashboard, elections, voters, results, and audit logs.
- `role: "voter"` sees the voting experience and results.
