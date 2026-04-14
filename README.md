# VoteSecure Graduation Project

نظام تصويت إلكتروني لمشروع تخرج، مبني بشكل ممتد لا استبدالي:

- PostgreSQL + Express backend
- Web admin panel الحالي كما هو
- Expo / React Native voter app داخل `mobile/`

## Current Architecture

```text
root
├─ backend/           # backend API + PostgreSQL integration
├─ database/          # schema and seed files
├─ src/               # existing React/Vite web admin panel
└─ mobile/            # new Expo voter-only mobile app