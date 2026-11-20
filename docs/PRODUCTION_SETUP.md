# Production setup

This guide takes WestForce from the `onrender.com` and `vercel.app` addresses to your own domain.
It was written on 2026-11-20 from the code in this repo and the providers' docs on that date.
Dashboards change, so if a menu name is different, look for the nearest match.
Anything marked **(check)** could not be confirmed from the code or the docs.

Placeholders used below:

| Placeholder | Meaning |
|---|---|
| `yourdomain.ca` | Your main site (Vercel) |
| `www.yourdomain.ca` | Redirects to `yourdomain.ca` |
| `api.yourdomain.ca` | The backend (Render) |

Never paste real keys into this file, an issue, a PR or a chat. Real values live only in the Vercel, Render and GitHub dashboards.

---

## How the pieces fit

| Part | Where it runs | Address after setup |
|---|---|---|
| Frontend (React) | Vercel project `west-force-portfolio`, deploys itself on push to `main` | `https://yourdomain.ca` |
| Backend (Express API) | Render web service | `https://api.yourdomain.ca` (old `west-force-portfolio.onrender.com` keeps working) |
| Database | MongoDB Atlas | connection string only |
| Sign in | Firebase Auth (email and password) | Firebase project `westforce-portfolio` |
| Payments | Stripe Checkout, CAD | Solo $999, Group of 5 $3,495 |
| Uploads | Cloudinary (images, documents), Supabase Storage (videos) | |
| AI | Gemini | |
| Job collector | GitHub Actions, Monday and Thursday at 11:00 UTC | |

### Should the browser call `api.yourdomain.ca` directly, or go through Vercel?

Today the browser calls `/api/...` on the frontend's own address, and `frontend/vercel.json` forwards it to Render:

```json
{ "source": "/api/:path*", "destination": "https://west-force-portfolio.onrender.com/api/:path*" }
```

**Recommendation for launch: keep the `/api` rewrite, and point it at `api.yourdomain.ca`.**

Why: several parts of the frontend call `/api/...` with a plain relative URL and ignore `VITE_API_URL`. They only work when `/api` exists on the same address as the site:

| File | Call |
|---|---|
| `frontend/src/components/portfolio/DocumentsSection.jsx` (lines ~155, ~258) | PIN unlock and document links |
| `frontend/src/components/portfolio/DynamicPortfolioTemplate.jsx` (~307) | resume file link |
| `frontend/src/components/chatbot/WestForceChatbot.jsx` (~356) | chatbot |
| `frontend/src/pages/onboarding/CreatePortfolio.jsx` (~707) | uploads |

If you removed the rewrite, those would break. Keeping it also has these upsides:

- The document access cookie (`httpOnly`, `sameSite: "lax"`, `secure` in production; set in `backend/src/modules/documents/controller.ts`) is first party on `yourdomain.ca`.
- CORS hardly matters, because the browser only ever talks to one address.
- `TRUST_PROXY_HOPS=2` (Vercel, then Render) stays correct for every request.

You still give Render the `api.yourdomain.ca` domain. Stripe webhooks, health checks and the rewrite use it, and it means you can later move hosts without touching Stripe.

| | Option A (recommended now): keep rewrite | Option B (later): browser calls `api.yourdomain.ca` directly |
|---|---|---|
| `frontend/vercel.json` | Change the `/api/:path*` destination to `https://api.yourdomain.ca/api/:path*`. Keep the `/(.*)` → `/index.html` rule. | Remove the `/api/:path*` rule. Keep the `/(.*)` rule. |
| Vercel `VITE_API_URL` | Leave empty | `https://api.yourdomain.ca` |
| Code changes | None | First change the files in the table above to build URLs with `VITE_API_URL` (like `frontend/src/utils/api.js` does) |
| Render `TRUST_PROXY_HOPS` | `2` | `1` (only Render's proxy) **(check with `LOG_CLIENT_IP=true`)** |
| Cookies | First party on `yourdomain.ca` | Set on `api.yourdomain.ca`. That is still the same site as `yourdomain.ca`, so `lax` cookies are sent. |
| Extra network hop | Yes, a small one | No |

With option A, `api.yourdomain.ca` and `onrender.com` can still be called directly, skipping Vercel. A caller there can fake their IP (the code says so in `backend/src/app.ts`). Rate limits per IP are a soft guard only. That is how it already works today.

---

## 1. Accounts checklist

Use one shared business email for all of these (for example `admin@yourdomain.ca`), turn on two-factor sign in everywhere, and keep the recovery codes in a password manager.

| Service | Needed for | Plan notes |
|---|---|---|
| Domain registrar | `yourdomain.ca` and its DNS | `.ca` needs Canadian presence rules (CIRA) |
| Vercel | Frontend | Hobby is for non-commercial use, so a paid business site should be on Pro **(check Vercel's current terms)** |
| Render | Backend | Free instances sleep (see section 13). Use a paid instance for launch. |
| MongoDB Atlas | Database | Free tier has no cloud backups. Use a paid cluster for real customer data. |
| Firebase (Google) | Sign in | Spark (free) is fine for email and password |
| Stripe | Payments | Business must be activated for live mode |
| Cloudinary | Images and documents | |
| Supabase | Video storage | |
| Google AI Studio or Google Cloud | Gemini key | Set a budget |
| Jooble (optional) | More job listings | |
| GitHub | Code, CI, job collector | |

---

## 2. Domain and DNS

Add the domains in Vercel and Render first (sections 3 and 4). Both dashboards then show the exact record to create. **Copy the values from the dashboards.** The values below are what to expect on 2026-11-20.

| Type | Name (host) | Value | Who uses it |
|---|---|---|---|
| A | `@` (apex, `yourdomain.ca`) | The IP Vercel shows in Project → Settings → Domains. It has long been `76.76.21.21`, but Vercel's docs now say to use the value shown in the dashboard. **(check)** | Vercel |
| CNAME | `www` | The value Vercel shows. It is now a per project target such as `xxxxxxxx.vercel-dns-017.com`. Older projects used `cname.vercel-dns.com`. | Vercel |
| CNAME | `api` | `west-force-portfolio.onrender.com` | Render |
| CAA (only if you already have CAA records) | `@` | Allow `letsencrypt.org` and `pki.goog` | Render and Vercel certificates **(check Vercel's issuer list)** |
| TXT | (as shown) | Only if Vercel or Render asks you to prove you own the domain | |

Notes:

- Delete old A, AAAA or CNAME records on `@`, `www` and `api` that point to parking pages, or SSL will not issue.
- Some registrars do not allow a CNAME on the apex. That is why the apex uses an A record.
- DNS can take from a few minutes to 48 hours. Check with `dig yourdomain.ca +short` and `dig api.yourdomain.ca +short`.
- **SSL:** both Vercel and Render issue and renew certificates for free, once DNS points at them. Render also redirects HTTP to HTTPS. Vercel does the same **(check, the docs page read did not say it in words)**.

---

## 3. Vercel

### 3.1 Domain

1. Vercel → project `west-force-portfolio` → Settings → Domains.
2. Add `yourdomain.ca` and `www.yourdomain.ca`.
3. On `www.yourdomain.ca`, choose "Redirect to `yourdomain.ca`" (permanent, 308). Vercel suggests www as the main one; either is fine, but pick one and keep it. This guide uses the bare domain.
4. Create the DNS records Vercel shows (section 2). Wait for both to show "Valid configuration".

### 3.2 `vercel.json`

Make the change from the option table above (option A: change the `/api` destination to `https://api.yourdomain.ca/api/:path*`). Do this only **after** `api.yourdomain.ca` shows a valid certificate in Render, or every API call will fail.

### 3.3 Environment variables

Set these in Settings → Environment Variables, for **Production**. Vite bakes them into the build, so **redeploy after any change**.

| Name | Production value | What it does |
|---|---|---|
| `VITE_API_URL` | empty (option A) or `https://api.yourdomain.ca` (option B) | Base URL for API calls in `frontend/src/utils/api.js`. Empty means "same address, through the rewrite". |
| `VITE_TUTORIAL_VIDEO_URL` | optional, e.g. a YouTube link | Tutorial video on the home page. Default `/how-to-use.mp4`. |
| `VITE_DEMO_LOGIN` | **do not set** | Only works on the local dev server. Harmless in builds, but keep it out. No env var can turn on a demo login in a production build, and `npm run build` (root) plus CI run `check:bundle`, which fails if demo code is in the bundle. |

There is no `frontend/.env.example`. The Firebase web config (`apiKey`, `authDomain`, project id) is written into `frontend/src/firebase/firebase.js`. Firebase web keys are public by design. Protect it by restricting the key to your domains (section 6).

---

## 4. Render

### 4.1 Service settings

Check these match (Service → Settings):

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci && npm run build` **(check what is set now)** |
| Start command | `npm start` (runs `node dist/server.js`) |
| Node version | 22 (CI uses 22). Set `NODE_VERSION=22` if Render picks another. **(check)** |
| Health check path | `/api/health/ready` (returns 503 until MongoDB is connected). `/api/health` always returns 200 while the process runs. |
| Auto-deploy | Off if `deploy.yml` calls the deploy hook, so each push is not deployed twice and only deploys after CI passes. `deploy.yml` runs only after CI succeeds on a push to `main`. |
| Instance type | Paid (Starter or higher). See section 13. |

### 4.2 Custom domain

1. Service → Settings → Custom Domains → Add `api.yourdomain.ca`.
2. Create the CNAME `api` → `west-force-portfolio.onrender.com` (section 2).
3. Wait for "Certificate issued". Then test: `curl https://api.yourdomain.ca/api/health`.

### 4.3 Environment variables

From `backend/.env.example` and the checks in `backend/src/lib/config.ts`. "Required" means the server will not start, or that feature fails, without it.

Generate random secrets on your Mac with `openssl rand -hex 32`. Use a different value for each secret.

**Server**

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `NODE_ENV` | Yes | Turns on production rules: secure cookies, Stripe live by default, `INSIGHTS_HASH_SECRET` check | Type it | `production` |
| `PORT` | No | Port to listen on. Render sets it for you. | Leave unset | `10000` |
| `CLIENT_URL` | Yes | Allowed browser origins for CORS (comma separated, no trailing slash). The first one is also the Stripe return address if `FRONTEND_URL` is empty. The server will not start in production without it. Localhost origins are only allowed outside production. Vercel preview URLs (`west-force-portfolio-*.vercel.app`) are always allowed by the code. | Type it | `https://yourdomain.ca,https://www.yourdomain.ca` |
| `FRONTEND_URL` | No | Where Stripe sends people after checkout. Falls back to the first `CLIENT_URL`. | Type it | `https://yourdomain.ca` |
| `TRUST_PROXY_HOPS` | No (default 2) | Proxies in front of the API, used to find the real client IP | `2` for option A, `1` for option B **(check)** | `2` |
| `LOG_CLIENT_IP` | No | `true` logs IPs per request to confirm the hop count. Turn it off again after checking (it logs personal data). | | `false` |
| `LOG_LEVEL` | No (default `info`) | Pino log level | | `info` |

**Database and sign in**

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `MONGODB_URI` | Yes | Atlas connection string | Atlas → Connect → Drivers (section 5) | `mongodb+srv://westforce-app:<password>@cluster0.xxxxx.mongodb.net/westforce?retryWrites=true&w=majority` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes, this **or** the three below | Whole service account JSON on one line | Section 6 | `{"type":"service_account","project_id":"..."}` |
| `FIREBASE_PROJECT_ID` | (or JSON above) | | Service account file | `westforce-portfolio` |
| `FIREBASE_CLIENT_EMAIL` | (or JSON above) | | Service account file | `firebase-adminsdk-xxxx@westforce-portfolio.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | (or JSON above) | Private key with `\n` for line breaks | Service account file | `-----BEGIN PRIVATE KEY-----\n...` |

**Secrets the app makes itself**

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `INSIGHTS_HASH_SECRET` | **Yes in production**. Server refuses to start without it. | Key for hashing visitors in daily view counts | `openssl rand -hex 32` | `3f9c...` (64 hex chars) |
| `DOCUMENT_ACCESS_SECRET` | **Yes**. The server will not start in production without it. | Hashes document PINs and signs the access cookie. **Changing it later breaks every saved PIN**, so set it once and keep a copy in your password manager. **(check: if a value is already set on Render, keep that one)** | `openssl rand -hex 32` | `a71b...` |

**Stripe** (section 7)

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `STRIPE_MODE` | No (defaults to `live` when `NODE_ENV=production`) | `live` needs an `sk_live_` key, `demo` needs `sk_test_`. In production the server will not start with `STRIPE_MODE=demo` or an `sk_test_` key. | Type it | `live` |
| `STRIPE_SECRET_KEY` | For payments | Live secret key | Stripe → Developers → API keys (live) | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | For payments | Signing secret of the live webhook. Without it the webhook returns 503. | Section 7 | `whsec_...` |

**Gemini**

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `GEMINI_API_KEY` | For AI features | Gemini key | Google AI Studio → API keys | `AIza...` |
| `GEMINI_CHAT_MODEL` | No | Default `gemini-3.6-flash` | | |
| `GEMINI_RESUME_MODEL` | No | Default `gemini-3.6-flash` | | |
| `RESUME_BUILD_DAILY_LIMIT` | No | AI resume builds per user per UTC day. Default 20, `0` turns it off. | | `20` |
| `RESUME_ENHANCE_DAILY_LIMIT` | No | AI enhancements per user per day. Default 30. | | `30` |
| `CHAT_ANON_DAILY_CAP` | No | Signed-out chat requests per day for everyone together. Default 500. | | `500` |
| `CHAT_ANON_DAILY_PER_IP` | No | Signed-out chat requests per IP per day. Default 50. | | `50` |

**Uploads**

| Name | Required? | What it is | How to get it | Example |
|---|---|---|---|---|
| `CLOUDINARY_URL` | For uploads, this **or** the three below | All in one | Cloudinary → Settings → API Keys | `cloudinary://<key>:<secret>@<cloud>` |
| `CLOUDINARY_CLOUD_NAME` | (or URL above) | | Same page | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | (or URL above) | | Same page | `123456789012345` |
| `CLOUDINARY_API_SECRET` | (or URL above) | | Same page | `abc...` |
| `SUPABASE_URL` | For video uploads | Project URL | Supabase → Project Settings → API | `https://xxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | For video uploads | Server-only secret key. Never put it in the frontend. | Same page (secret or service role key) | `sb_secret_...` |
| `SUPABASE_ANON_KEY` | No | Fallback only if the secret key is not set. Do not rely on it in production. | | |
| `SUPABASE_VIDEO_BUCKET` | No | Default `westforce-videos`. The bucket must exist. | Supabase → Storage | `westforce-videos` |

**Job collector**

| Name | Required? | What it is | Example |
|---|---|---|---|
| `JOOBLE_API_KEY` | No | Only the GitHub Action needs it (section 10). Not needed on Render. | |
| `JOBS_COLLECTOR_ONLY` | **Do not set on Render** | `true` skips the Firebase and `INSIGHTS_HASH_SECRET` checks. Only the job workflow sets it. | |

**Email (Resend)**

Until mail is live, verify and reset emails come from Firebase as before (the API tells the frontend to send them), and the welcome and weekly job emails are skipped. Mail is live only with all three of `MAIL_MODE=live`, `RESEND_API_KEY` and `MAIL_FROM`. Tests never send.

| Name | Required? | What it is | Example |
|---|---|---|---|
| `MAIL_MODE` | No | `live` sends through Resend. Anything else only logs the subject and recipient count. | `live` |
| `RESEND_API_KEY` | For live mail | Resend → API Keys | `re_...` |
| `MAIL_FROM` | For live mail | Sender on a domain verified in Resend | `WestForce <hello@yourdomain.ca>` |
| `MAIL_ALLOWLIST` | No | Testing only. Comma list. When set, only these addresses get any email from the site, including password reset. Leave it empty for real users. | `you@yourdomain.ca` |
| `SITE_URL` | Recommended | Public site address for email links and the logo. Defaults to the first `CLIENT_URL`. Its domain must be in Firebase → Authentication → Settings → Authorized domains. | `https://yourdomain.ca` |

**Admin**

| Name | Required? | What it is | Example |
|---|---|---|---|
| `ADMIN_EMAILS` | For /admin | The owners: comma list of login emails with full admin access. Only owners can add or remove other admins, and owners can't be removed in the portal. | `owner-one@yourdomain.ca,owner-two@yourdomain.ca` |

There is **no** `ADZUNA_*` variable any more. If one is still on Render, delete it.

### 4.4 Admin access

**Owners**

1. On Render, set `ADMIN_EMAILS` to the two owner emails, comma separated, for example `owner-one@yourdomain.ca,owner-two@yourdomain.ca`. Case and spaces don't matter. Keep the real emails on Render only, never in the repo.
2. Each owner verifies their email first. Firebase sends the link at sign up; an unverified email is never an admin.
3. Sign out of the site and sign in again, so your login picks up the change.
4. Open `/admin`. If you see "Admins only.", check the email and that it is verified.

**Adding admins in the portal**

- An owner opens the admins page in the portal and adds an email. That person gets in within a few seconds, once their email is verified. No redeploy is needed.
- Any admin can see the list. Only owners can add or remove admins. To remove an owner, take the email out of `ADMIN_EMAILS` on Render.
- Every admin change (jobs, admins, settings) is kept in the activity log for 365 days.

**Shutdown switch (maintenance)**

- Settings → maintenance on, with an optional message (up to 300 characters). Every API call then answers "down for maintenance" with that message.
- These keep working: health checks, the site status, the admin portal, the Stripe webhook (so no payment is lost) and any signed-in admin. Admins can check the site before turning it back on.
- The change reaches every server within about 15 seconds.

**Banner and feature switches**

- Banner: a short notice at the top of the site (up to 200 characters), tone "info" or "warning".
- Feature switches, each on by default:

  | Switch | When it's off |
  |---|---|
  | Sign ups | New accounts can't be created. People who already have one sign in as usual. |
  | Payments | New checkouts are stopped. The Stripe webhook still records payments already started. |
  | AI | The ATS check, tailor, AI resume builder and enhancer, and the chat assistant stop. Use it if Gemini costs jump or Gemini is down. |
  | Jobs | The Jobs pages stop. Manual and collected jobs stay stored. |

- The switches are enforced by the backend, not only hidden in the UI.

Jobs added in the portal show on the Jobs page with the collected ones. A manual job hides 60 days after it is added unless you change its date (a date with no time means the end of that day, Toronto time), and the daily collector never deletes it.

### 4.5 Keep the free backend awake

A free Render web service sleeps after 15 minutes with no traffic, and the next visit waits about a minute.

- **Best:** the $7 a month Starter plan. It never sleeps, so no ping is needed.
- **On the free plan:** set a free monitor, UptimeRobot or cron-job.org, to open `https://<backend>/api/health` every 5 minutes. This route is light and works during maintenance.
- Render free gives 750 instance hours a month for the whole account. One service awake all month uses about 730, so keep only one free service awake this way.
- Don't use a GitHub Action for the ping. A run every 5 minutes uses up the Actions minutes.

After saving, Render restarts the service. Open Logs and look for an "Invalid environment configuration" error. It lists missing names (never values).

---

## 5. MongoDB Atlas

1. **Database user:** Database Access → Add user, for example `westforce-app`, password auth with a generated password, role "Read and write to any database" (or only the `westforce` database). Do not reuse your own Atlas login.
2. **Network access** (Network Access → IP Access List):

   | Who connects | What to add |
   |---|---|
   | Render | Render's outbound IP ranges for your region: service page → Connect → Outbound. **(check that your plan lists them)** |
   | GitHub Actions job collector | GitHub runners have no fixed IP. Options: (a) `0.0.0.0/0` with a strong password, which Atlas does not recommend but which is common; (b) turn the workflow off and run `npm run jobs:collect` as a Render Cron Job, which uses Render's IPs; (c) a self-hosted runner with a fixed IP. |
   | You, for checks | Your own IP, as a temporary entry (Atlas allows entries that expire, up to 7 days) |

   If you end up with `0.0.0.0/0`, the password is the only lock, so make it long and rotate it if it is ever shared.
3. **Backups:** turn on Cloud Backup (paid clusters only) with daily snapshots. Do one test restore into a new cluster before launch. On the free tier, there are no backups. At least run `mongodump` on a schedule.
4. **Alerts:** Atlas → Alerts: turn on emails for connections, disk use and "host down".

---

## 6. Firebase

1. **Authorised domains:** Firebase console → Authentication → Settings → Authorized domains → add `yourdomain.ca` and `www.yourdomain.ca`. Keep `localhost` for development. You can leave the `vercel.app` domain for previews.
2. **authDomain:** the app signs in with email and password only (no Google popup or redirect), so `authDomain: "westforce-portfolio.firebaseapp.com"` in `frontend/src/firebase/firebase.js` can stay. You only need to change it if you add Google or other social sign in with redirects later.
3. **Restrict the web API key:** Google Cloud console → APIs and Services → Credentials → the browser key → Application restrictions → Websites: `https://yourdomain.ca/*`, `https://www.yourdomain.ca/*`, `http://localhost:5173/*`, and your Vercel preview pattern **(check)**.
4. **Service account key** (for the backend):
   - Project settings → Service accounts → Generate new private key. It downloads a JSON file.
   - Paste the JSON as one line into Render's `FIREBASE_SERVICE_ACCOUNT_JSON`, or split it into the three `FIREBASE_*` variables.
   - Then **delete the downloaded file** from Downloads and empty the bin. Never put it in the repo (`serviceAccountKey.json` is git-ignored, but don't rely on that).
   - In Google Cloud → IAM → Service accounts → keys, delete any older keys you no longer use.
5. **Emails** (see section 9).

---

## 7. Stripe

The backend builds the price at checkout time (`backend/src/modules/payments/service.ts`: Solo 99900 cents, Group of 5 349500 cents, currency `cad`). **You do not need to create Products or Prices in Stripe.** To change a price, change the code.

1. **Activate the account** for live payments (business details, bank account). Set the statement descriptor and support email under Settings → Business.
2. **Live keys:** switch the dashboard to live mode → Developers → API keys → copy the **secret** key (`sk_live_...`) into Render `STRIPE_SECRET_KEY`. Set `STRIPE_MODE=live`. The publishable key is not used.
3. **Webhook:**
   - Workbench → Webhooks → Create an event destination (in live mode). Choose "Your account", payload "Snapshot", destination type "Webhook endpoint".
   - URL: `https://api.yourdomain.ca/api/payments/webhook`
   - Events (the only two the code handles, from `backend/src/modules/payments/controller.ts`):
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
   - Open the new destination → Signing secret → Reveal → copy `whsec_...` into Render `STRIPE_WEBHOOK_SECRET`.
   - Test and live webhooks have different secrets. Use the live one in production.
   - Delete or disable any old test-mode endpoint that pointed at `onrender.com`, if you no longer need it.
4. **Payment methods:** Settings → Payment methods: cards on. Any extra methods (for example delayed bank payments) are why the async event is listened to.
5. **Real test:**
   1. Sign in on `https://yourdomain.ca` with a real, verified email.
   2. Buy Solo with your own card.
   3. Check: you land on the success page, the purchase shows in the app, and Stripe → Webhooks → the event shows a `200` reply.
   4. Refund it in Stripe → Payments → the payment → Refund. (Refunds do not change access in the app; the code ignores refund events. **(check if access should be removed on refund)**)

---

## 8. Cloudinary, Supabase, Gemini

| Service | Steps |
|---|---|
| Cloudinary | Settings → API Keys: make a production key pair (not one shared before). Note the free plan's monthly credits. Turn on usage email alerts. |
| Supabase | Storage → make sure bucket `westforce-videos` exists **(check whether it is public or private now and keep it that way)**. Copy the project URL and secret key into Render. Free projects pause after a week with no activity **(check current policy)**, so use a paid plan or make sure there is regular traffic. Turn on spend alerts. |
| Gemini | Create a key in Google AI Studio for a billing-enabled project. In Google Cloud → Billing → Budgets and alerts, set a monthly budget with alerts at 50%, 90% and 100%. Restrict the key to the Generative Language API. The app limits use per user (see the `RESUME_*` and `CHAT_ANON_*` variables). |
| Jooble (optional) | Request a key at jooble.org/api/about. Store it only as a GitHub secret. |

---

## 9. Email

What the code does today (checked 2026-11-20):

- **The backend sends no email.** There is no mail provider (no SMTP, Resend, SendGrid or similar) in `backend/`, so there is no pretend mode or allow-list to switch off.
- **Firebase sends** the email verification (`sendEmailVerification`, used before payment in `PaymentModal.jsx`) and password reset (`sendPasswordResetEmail`, `ForgotPassword.jsx`) emails. By default they come from `noreply@westforce-portfolio.firebaseapp.com`.

Before launch:

1. Firebase → Authentication → Templates: set the sender name (WestForce) and check the wording of each template.
2. Optional but recommended: use your own domain as sender. In Templates → "Customize domain", add `yourdomain.ca`, then create the TXT and CNAME records Firebase shows (these set up SPF and DKIM for you) **(check exact steps in the console)**.
3. Add a DMARC record, starting soft:

   | Type | Name | Value |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.ca` |

   After a few weeks with clean reports, change `p=none` to `p=quarantine`.
4. If you also want to send mail from people (for example `hello@yourdomain.ca`), set up Google Workspace or similar. Its own SPF/DKIM records go in DNS too. Only one SPF TXT record is allowed per name, so merge them.

If a mail provider is added to the backend later, it must have a test mode that never mails real people, and production must switch real sending on deliberately.

---

## 10. GitHub

### 10.1 Secrets and variables

Settings → Secrets and variables → Actions.

| Kind | Name | Used by | Value |
|---|---|---|---|
| Secret | `RENDER_DEPLOY_HOOK_URL` | `deploy.yml` | Render → Service → Settings → Deploy Hook (a secret URL; anyone with it can trigger deploys) |
| Secret | `MONGODB_URI` | `collect-jobs.yml` | Same Atlas string as Render, or a separate user with write access to the jobs collection only |
| Secret | `JOOBLE_API_KEY` | `collect-jobs.yml` | Optional |
| Secret | `MONGODB_URI` | `job-digest.yml` | Same as above (reads users and jobs) |
| Secret | `RESEND_API_KEY` | `job-digest.yml` | Without it the weekly job email only logs and sends nothing |
| Secret | `MAIL_FROM` | `job-digest.yml` | `WestForce <jobs@yourdomain.ca>` on a domain verified in Resend |
| Secret | `SITE_URL` | `job-digest.yml` | Optional; the `SITE_URL` variable below is used when it is not set |
| Variable | `API_BASE_URL` | `deploy.yml` smoke test | `https://api.yourdomain.ca` (no `/api` at the end; the workflow adds `/api/health`). If unset it uses the `onrender.com` address. |
| Variable | `SITE_URL` | `deploy.yml` smoke test | `https://yourdomain.ca`. If unset it uses the `vercel.app` address. |

If `RENDER_DEPLOY_HOOK_URL` is missing, `deploy.yml` skips the Render deploy with a notice instead of failing.

Do not add `ADZUNA_*` secrets. Delete them if they exist.

### 10.2 Protect `main`

Settings → Rules → Rulesets → New branch ruleset (or Branches → Add rule):

- Target: `main`.
- Require a pull request before merging (1 approval if there is a second person).
- Require status checks to pass: `backend` and `frontend` from the CI workflow. Require branches to be up to date.
- Block force pushes and deletion.

### 10.3 Dependabot

Settings → Code security: turn on Dependabot alerts and security updates. For version update PRs, add `.github/dependabot.yml` with `npm` entries for `/backend` and `/frontend` and a `github-actions` entry, weekly. Also turn on secret scanning and push protection.

---

## 11. Security

1. **Rotate any key that was ever shared** in chat, email, a screenshot, a ticket or a commit. Make a new one, update Render or GitHub, check the site works, then delete the old one. This applies to MongoDB passwords, Firebase service account keys, Stripe keys, Cloudinary, Supabase, Gemini and Jooble.
2. **Adzuna:** the app no longer uses it. Delete the key in the Adzuna developer dashboard and remove it from Render, GitHub and any `.env` copies.
3. **Never commit `.env`** or `serviceAccountKey.json`. Both are in `backend/.gitignore`. Before pushing, `git status` should not show them. If a secret was ever committed, rotate it; removing it from history is not enough.
4. Keep `DOCUMENT_ACCESS_SECRET` and `INSIGHTS_HASH_SECRET` in a password manager. Losing the first breaks every saved PIN.
5. Give dashboard access only to people who need it, each with their own login.

---

## 12. Go-live checklist

Before switching DNS:

- [ ] Render paid instance, health check path `/api/health/ready`
- [ ] All required Render variables set; `NODE_ENV=production`; logs show no "Invalid environment configuration"
- [ ] `CLIENT_URL` = `https://yourdomain.ca,https://www.yourdomain.ca`
- [ ] `INSIGHTS_HASH_SECRET` and `DOCUMENT_ACCESS_SECRET` set and saved in a password manager
- [ ] Stripe live key, `STRIPE_MODE=live`, live webhook with the two events and its `whsec_` secret
- [ ] Atlas user, network access and backups done
- [ ] Firebase authorised domains and email templates done
- [ ] Gemini, Cloudinary, Supabase budgets or alerts set
- [ ] Vercel: `VITE_DEMO_LOGIN` not set
- [ ] GitHub secrets, variables and branch protection set
- [ ] Adzuna key deleted; shared keys rotated

Switching:

- [ ] DNS records added; Vercel shows both domains valid; Render shows certificate issued for `api.yourdomain.ca`
- [ ] `vercel.json` `/api` destination changed (option A) and merged; Vercel deployed it

Smoke test (after switching):

1. `curl https://api.yourdomain.ca/api/health/ready` → `"status":"OK"`.
2. `curl https://yourdomain.ca/api/health` → same reply (this proves the Vercel rewrite works).
3. `http://www.yourdomain.ca` → ends on `https://yourdomain.ca` with a padlock.
4. Open a deep link like `https://yourdomain.ca/dashboard` and refresh: the page loads (not a 404).
5. Sign up with a new email; get the verification email; check it is not in spam.
6. Reset the password from "Forgot password"; the email arrives and the link works.
7. Create a portfolio; upload a photo, a certificate and a video.
8. Set a document PIN. In a private window, open the public portfolio, unlock with the PIN, open a document.
9. Ask the chatbot a question, signed out and signed in.
10. Build a resume with AI.
11. Buy Solo with a real card, check access, then refund (section 7).
12. GitHub → Actions → Collect jobs → Run workflow; it finishes green and the Jobs page shows new jobs.

---

## 13. After launch

| Topic | What to do |
|---|---|
| Render plan | Free web services spin down after 15 minutes with no traffic, and the first visit then waits about a minute. Free services also only roll back to the last 2 deploys. Use at least a Starter (paid) instance. If you stay on free for now, see section 4.5. |
| Uptime checks | Use a free monitor (UptimeRobot, Better Stack or similar) on `https://api.yourdomain.ca/api/health/ready` and `https://yourdomain.ca`, every 5 minutes, alerting by email. |
| Logs | Render → Logs (JSON lines from pino; each request has an `X-Request-Id`). Vercel → Logs for the frontend and rewrite. Raise `LOG_LEVEL` to `debug` only for a short time. |
| Stripe | Workbench → Webhooks: check for failed deliveries weekly. Stripe retries failed ones for a few days. |
| Costs | Check Gemini, Cloudinary, Supabase, Atlas and Render bills in the first weeks. |
| Backups | Check Atlas snapshots run; do a test restore every few months. |
| Rollback | See `docs/DEPLOY.md`. |
