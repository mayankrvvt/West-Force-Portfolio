# WestForce Portfolio

A portfolio app for Canadian job seekers. One link holds a person's resume, intro video, certificates and work history. Documents sit behind a PIN that the person shares with employers.

## Audience
- Canadian job seekers only. Don't write copy aimed at newcomers or immigrants, and don't add other countries' documents (WES, IELTS, passport and the like).
- Anyone can use the resume tools (builder, ATS, tailor), so the builder's country list stays global. Jobs (search, collector, "jobs for you") are Canada only.
- Languages: English now, French later. No other languages.
- Write in plain words and sentence case. Don't put hyphens inside sentences.

## Stack
- `frontend/`: React 19, Vite and plain CSS. Routes are in `src/app/routes.jsx`.
- `backend/`: Express 5, Mongoose and TypeScript, with Vitest tests. It also uses:
  - Stripe for payments: Solo $999 CAD, Group of 5 $3,495 CAD
  - Cloudinary and Supabase for uploads
  - Gemini for AI
  - Its own daily job collector for Canadian jobs (Greenhouse, Lever and optional Jooble; `npm run jobs:collect`). Adzuna was dropped.
  - Jobs also include manual ones added by the admin at `/admin/jobs` (source "manual", `ADMIN_EMAILS`). The collector never deletes them.
  - "Jobs for you" (`GET /api/jobs/for-me`, scoring in `backend/src/modules/jobs/match.ts`): a fixed score with no AI, built from title, skills, place and how new the job is. It uses the job preferences in Settings, the latest resume (tailored copies are skipped) and the portfolio skills. Jobs in other provinces still show, just lower.
  - Job Bank (Government of Canada) is not a source. It needs the partner programme (a CBN and a public no-login jobs page), so don't scrape it.
  - Admin portal (`/api/admin`, `backend/src/modules/admin` and `site`): `ADMIN_EMAILS` are owners, other admins live in the `AdminUser` collection, site settings (maintenance, banner, feature switches) are enforced server side by `middleware/siteGuards.ts`, and every admin write goes to the activity log.

## Commands
| What | Where | Command |
|---|---|---|
| Install both apps | root | `npm run install:all` |
| Lint, typecheck, test or build both apps | root | `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` |
| Frontend and backend together | root | `npm run dev` |
| Frontend dev server | frontend | `npm run dev:frontend` |
| Demo mode (no backend) | frontend | `VITE_DEMO_LOGIN=true npx vite --port 5173` |
| Frontend lint | frontend | `npm run lint` |
| Frontend build | frontend | `npm run build` |
| Backend tests | backend | `npm test` |
| Backend typecheck | backend | `npm run typecheck` |
| Backend lint | backend | `npm run lint` |

Setup, deploy and mock API notes live in `docs/`.

Backend tests run without a database or `.env`. The backend dev server won't start locally until `backend/.env` has `MONGODB_URI` and the Firebase keys, so use demo mode to look at the UI.

Before you say a change is done, frontend lint and build must pass. If you touch the backend, its typecheck and tests must pass too.

## Demo mode
- `VITE_DEMO_LOGIN=true` logs in as the sample user "Emma Tremblay", a personal support worker in Brampton, ON.
- The fake API is in `frontend/src/demo/demoApi.js`. Demo data is kept in localStorage, so clear it to see new sample data.

## Design system (keep it)
- **Tokens:** they live in `frontend/src/styles/variables.css`.
  - Colours: navy `#0D2B45`, lake `#2F6F9F`, frost, and maple `#EB2D37` (`--wf-maple`, the official Canada flag red, Pantone 032). Maple is about 4:1 on white, so use it only for the leaf, icons and large shapes. Small red text uses `--wf-maple-ink` `#C41E2A` (about 5.9:1).
  - Maple leaf: always `components/brand/MapleLeaf.jsx` (the official 11 point flag leaf), filled with `--wf-maple`. No PNGs or other leaf drawings.
  - Spacing: `--space-1` to `--space-9`.
- **Type:** Manrope only, weight 700 at most, no italics.
- **Radius:** 4px on controls, 10px on cards and other objects.
- **Motion:** `cubic-bezier(0.22,1,0.36,1)`. Always respect `prefers-reduced-motion`.
- **Icons:** `lucide-react`.
- **Style files:**
  - `index.css` holds the base styles, sidebar and header.
  - `dashboard-product.css` holds the dashboard pages.
  - `public.css` holds the home page.
  - `auth.css` holds sign in and sign up.
  - `portfolio.css` and `portfolio-viewer.css` hold the portfolio.
  - `onboarding.css` holds onboarding.
- **Reuse before writing new code:**
  - `components/dashboard/Skeleton.jsx` for loading states
  - `components/dashboard/StatusBadge.jsx` for status badges
  - `utils/formatDate.js` for dates, shown as "17 Nov 2026"
  - Merge CSS rules instead of copying them.
- No `alert()` calls. Show errors inline, and use skeletons rather than spinners while loading.
- **Reference look:** the Applications board (`/dashboard/applications`) sets the standard for dashboard pages: compact cards, a status dot with a count in column headers, and dashed "Nothing here yet" empty states.
- **Every className needs a CSS rule.** Lint and build don't catch a missing style. A rewritten page with no CSS shows up as loose text with huge headings. After you add or rename classes, grep them against `src/styles/`.
- Pages that edit data must block Save until the load has worked. Never let an empty form be saved over real data.

## Logo
- The official company logo is the blue WF image at `frontend/public/favicon.png`.
- Use it in the nav, footer, auth pages, sidebar, onboarding and portfolio.
- Never replace it with the maple leaf. The leaf is only for decoration and the "PIN protected" seal.

## Backend rules
- Partial updates must merge. Set only the fields that were sent (dotted `$set` paths); never `doc.set("profile", value)` on a whole subdocument. `profile` is fixed and tested in `backend/test/portfolios.test.js`. `hero`, `about` and `socialLinks` are still replaced whole, so check them before relying on partial saves.

## Rules for agents
- Never open, print or edit `.env` files.
- Never commit, push or create branches without asking first.
- Tests must never send real email.
- Edit files with the Edit tool. Never write Python like `open(p,'w').write(open(p).read()...)`: it empties the file before reading it. This wiped `auth.css` and `portfolio.css` on 2026-11-20.
- After you edit CSS, check that no file in `frontend/src/styles/` is empty (`wc -c`).
- Only one agent should edit the shared style files at a time.
