# WestForce Portfolio

A portfolio-builder app. React + Vite frontend, Express + MongoDB API.

## Structure

```
West-Force-Portfolio/
├── frontend/               # React + Vite application, docs, and web assets
│   ├── public/             # static assets served at /
│   ├── src/
│   │   ├── app/            # App shell, router, providers
│   │   ├── components/     # common / landing / layout / portfolio
│   │   ├── constants/      # static site data
│   │   ├── features/       # per-domain logic (auth, portfolio, jobs, …)
│   │   ├── firebase/       # Firebase web SDK init
│   │   ├── hooks/          # reusable React hooks
│   │   ├── pages/          # route-level screens
│   │   ├── services/       # API + third-party clients
│   │   ├── styles/         # global CSS
│   │   └── utils/          # helpers
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                # Express API
│   ├── config/             # db, firebaseAdmin, cloudinary
│   ├── middleware/         # auth
│   ├── models/             # Mongoose schemas
│   ├── routes/             # users, portfolios, uploads
│   ├── server.js           # entry point
│   └── package.json
```

Each side owns its own `package.json`. Frontend scripts orchestrate both apps.

## Setup

```bash
cd frontend
npm run install:all
```

Then create the env files:

```bash
cp .env.example .env
cp ../backend/.env.example ../backend/.env
```

Fill in `backend/.env` with your MongoDB URI and any AI or Cloudinary keys you
use. Configure `STRIPE_SECRET_KEY` on the backend and add Stripe's webhook
signing secret as `STRIPE_WEBHOOK_SECRET`. In Stripe, send
`checkout.session.completed` and `checkout.session.async_payment_succeeded`
events to `https://<your-backend-host>/api/payments/webhook`. Keep Stripe keys
and webhook secrets in the same mode (test or live). Group 5 checkout charges
CAD $3,495 total and grants access to the purchaser plus the four additional
email addresses entered during checkout. Group members must verify their
email address before claiming a seat.

Place your Firebase Admin service account JSON at
`backend/serviceAccountKey.json`; this local credential file is ignored by Git
and must never be committed. If a service account key was previously committed,
revoke it and create a replacement.

For Render, do not commit the service-account file. Add a secret environment
variable named `FIREBASE_SERVICE_ACCOUNT_JSON` containing the complete JSON
contents of a Firebase Admin service account key. Alternatively, set
`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
as separate environment variables; preserve the private key's newline escapes.

## Running

Run commands from the `frontend/` directory:

```bash
npm run dev           # frontend + backend together
npm run dev:frontend  # frontend only → http://localhost:5173
npm run dev:backend   # backend only  → http://localhost:5050
```

Vite proxies `/api/*` to `http://localhost:5050`, so the frontend can call
`/api/...` directly in development with no CORS setup.

## Build

Run from `frontend/`:

```bash
npm run build  # outputs frontend/dist
npm start      # runs the backend in production mode
```
