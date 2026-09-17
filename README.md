# WestForce Portfolio

A portfolio-builder app. React + Vite frontend, Express + MongoDB API.

## Structure

```
West-Force-Portfolio/
├── client/                 # React + Vite frontend
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
├── server/                 # Express API
│   ├── config/             # db, firebaseAdmin, cloudinary
│   ├── middleware/         # auth
│   ├── models/             # Mongoose schemas
│   ├── routes/             # users, portfolios, uploads
│   ├── server.js           # entry point
│   └── package.json
│
├── docs/                   # project notes
├── package.json            # workspace scripts only
└── .gitignore
```

Each side owns its own `package.json`. The root one only orchestrates.

## Setup

```bash
npm run install:all
```

Then create the env files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Fill in `server/.env` with your MongoDB URI and Cloudinary keys. Place your
Firebase service account JSON at `server/serviceAccountKey.json` — it is
gitignored and must never be committed.

## Running

```bash
npm run dev          # client + server together
npm run dev:client   # client only  → http://localhost:5173
npm run dev:server   # server only  → http://localhost:5050
```

Vite proxies `/api/*` to `http://localhost:5050`, so the frontend can call
`/api/...` directly in development with no CORS setup.

## Build

```bash
npm run build        # outputs client/dist
npm start            # runs the API in production mode
```
