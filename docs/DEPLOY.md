# Deploy

How a change reaches production, how to undo it, and how to run the job collector by hand.
For first time setup see `docs/PRODUCTION_SETUP.md`. Written 2026-11-20.

## How a change reaches production

1. Make a branch and open a pull request into `main`.
2. **CI** (`.github/workflows/ci.yml`) runs on every push and PR:
   - backend: `npm ci`, lint, typecheck, tests, build
   - frontend: `npm ci`, lint, build
3. Vercel makes a **preview** deployment for the PR (a `west-force-portfolio-*.vercel.app` link). The backend allows these origins for CORS.
4. When CI is green, merge into `main` (branch protection should require this).
5. On `main`:
   - **Frontend:** Vercel builds and deploys to `yourdomain.ca` by itself (Git auto deploy).
   - **Backend:** when CI on that push succeeds, `.github/workflows/deploy.yml` starts. It POSTs to the Render deploy hook (secret `RENDER_DEPLOY_HOOK_URL`; skipped with a notice if the secret is missing). Render builds and restarts the service.
   - **Smoke test:** the same workflow polls `API_BASE_URL/api/health` (up to 60 tries, 10 seconds apart) until its `version` equals the commit CI just tested, then checks that `SITE_URL/` returns 200. Both are repo variables; without them it uses the `onrender.com` and `vercel.app` addresses.
   - Version check: `/api/health` returns `version` from `RENDER_GIT_COMMIT` (Render sets it), else `GIT_COMMIT`, else `"unknown"`. A green smoke test means the new build is live. If the API says `"unknown"`, the workflow only checks for a 200 and shows a warning.
   - Production refuses to start without `CLIENT_URL` or `DOCUMENT_ACCESS_SECRET`, or with Stripe in demo mode (`STRIPE_MODE=demo` or an `sk_test_` key). Check Render logs if the deploy never goes live.
6. Check the result: GitHub → Actions → the deploy run is green, Render → Events shows "Deploy live", and `curl https://api.yourdomain.ca/api/health/ready` returns `"status":"OK"`.

Render auto deploy should be **off**, so the backend only deploys through the hook after CI passes. Otherwise each push to `main` deploys twice, and the first one starts before CI finishes. (Render → Settings → Auto-Deploy: Off. **(check the current setting)**)

Note: the frontend and backend deploy separately. If a change needs both, make the backend change work with the old frontend first (for example, add new fields before the frontend uses them).

## Roll back

### Frontend (Vercel)

1. Vercel → project `west-force-portfolio` → Deployments.
2. Find the last good production deployment → `⋮` → **Instant Rollback** (or use the button on the Production Deployment tile).
3. The domain switches in seconds. No rebuild.
4. After a rollback Vercel stops moving the domain to new deployments. When the fix is merged, go back and use **Promote** on the new deployment (or `vercel promote <deployment-url>`), or Vercel will keep serving the old one.

On the Hobby plan you can only roll back to the previous deployment. Pro can choose any earlier production deployment.

### Backend (Render)

1. Render → the service → Events (Deploys).
2. On the last good deploy → **Rollback** → "Rollback to this deploy".
3. A rollback from the dashboard turns auto deploy off. If you use auto deploy, turn it back on in Settings afterwards.
4. Free instances can only roll back to the last 2 deploys.

A rollback only changes code. It does not undo database changes or environment variable changes. Change those back by hand if needed.

### Real fix

Rolling back buys time. Then revert the bad commit with a PR (`git revert <sha>`), let CI pass and merge as normal.

## Run the job collector by hand

It runs twice a week (Monday and Thursday, 11:00 UTC) from `.github/workflows/collect-jobs.yml` (Greenhouse, Lever and, if `JOOBLE_API_KEY` is set, Jooble).

From GitHub:

1. GitHub → Actions → **Collect jobs** → Run workflow → branch `main` → Run.
2. Open the run to see the log. It needs the `MONGODB_URI` secret and Atlas must allow GitHub's IPs.

Or with the CLI: `gh workflow run collect-jobs.yml --ref main`, then `gh run watch`.

From your Mac (writes to whatever database `backend/.env` points at, so be careful):

```bash
cd backend
npm ci
npm run jobs:collect
```
