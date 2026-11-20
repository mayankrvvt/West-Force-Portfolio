# WestForce backend

Express 5 + TypeScript API, MongoDB (Mongoose), Firebase Auth, Gemini, Stripe,
Cloudinary and Supabase. Node 22 (CI); `engines` needs Node >= 20.19.

## Setup

```bash
cd backend
npm ci
cp .env.example .env   # then fill in real values; never commit .env
npm run dev            # http://localhost:5050
```

Every variable is listed with a comment in `.env.example`. The server checks
them at start-up in `src/lib/config.ts` and stops with a list of what is
missing (names only, never values). `MONGODB_URI` and Firebase Admin
credentials are required; the other services are optional and fail only when
their routes are used.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run `src/server.ts` with reload (tsx) |
| `npm run build` | Compile `src/` to `dist/` (`tsconfig.build.json`) |
| `npm start` | Run the compiled `dist/server.js` |
| `npm run typecheck` | `tsc --noEmit` over `src`, `test` and `scripts` |
| `npm test` | Vitest; uses in-memory MongoDB and fake keys, never real services |
| `npm run lint` | ESLint (type-checked rules for `.ts`) |
| `npm run migrate:resume-owner` | Fill `ownerId` on old resumes (see below) |

## Deploy (Render)

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Set the env vars from `.env.example` in the Render dashboard
  (`NODE_ENV=production`).

## Migration

Old resumes only have `userId` (the Firebase uid). This fills `ownerId`
(the Mongo User `_id`). Check first with a dry run, which writes nothing:

```bash
npm run migrate:resume-owner -- --dry-run
npm run migrate:resume-owner
```

## Layout

```
src/
  server.ts          start-up: config, MongoDB, listen
  app.ts             Express app: middleware, routes, error handler
  lib/               shared code: config, db, errors, logger, respond,
                     validate (zod), text, usageCounter (MongoDB daily limits),
                     clients/ (Gemini, Firebase, Stripe, Cloudinary, Supabase, Adzuna)
  middleware/        auth (Firebase token), requirePaid, rateLimit
  modules/<name>/    one folder per feature:
                     routes.ts -> controller.ts -> service.ts -> model.ts, schema.ts (zod)
  utils/             small helpers (trustProxy)
  types/             type declarations
scripts/             one-off scripts (migrations)
test/                Vitest tests; helpers/ holds the fake Firebase and in-memory MongoDB
```

Modules: applications, ats, chat, dashboard, documents, jobs, payments,
portfolios, resumes (`ai.service.ts` Gemini calls, `prompts.ts`, `normalize.ts`),
uploads, users.

Daily limits (ATS checks per user, guest chat caps) are stored in MongoDB, so
a restart does not reset them. The chat per-minute limit stays in memory.
