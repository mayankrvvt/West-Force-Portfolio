# WestForce Portfolio

A portfolio app for Canadian job seekers. One link holds a person's resume, intro video, certificates and work history. Documents sit behind a PIN that the person shares with employers. It also has resume tools (builder, ATS check, tailor), a Canadian job search and an applications board.

## Folder map

| Folder | What is in it |
|---|---|
| `frontend/` | React 19 app built with Vite and plain CSS. Hosted on Vercel. |
| `backend/` | Express 5 API with Mongoose and TypeScript, tested with Vitest. Hosted on Render. |
| `docs/` | Setup, deploy and mock API notes. |
| `.github/` | CI, deploy, the daily job collector and Dependabot. |

## Quick start

You need Node 22 (see `.nvmrc`).

1. Install both apps: `npm run install:all`
2. See the app without a backend (demo mode):
   ```sh
   cd frontend
   VITE_DEMO_LOGIN=true npx vite --port 5173
   ```
   This signs you in as a sample user and uses a fake API, so no `.env` is needed.
3. To run the real backend too, copy `backend/.env.example` to `backend/.env`, fill in MongoDB and Firebase, then run `npm run dev` from the root.

## Scripts

Run these from the repo root. Each one runs in both apps where it applies.

| Script | What it does |
|---|---|
| `npm run install:all` | Installs frontend and backend packages |
| `npm run dev` | Starts the frontend and backend together |
| `npm run lint` | Lints the backend and the frontend |
| `npm run typecheck` | Type checks the backend |
| `npm test` | Runs the backend tests (no database or `.env` needed) |
| `npm run build` | Builds the backend and the frontend |

## Deploys

Pushes to `main` run CI. When CI passes, the deploy workflow starts the Render backend deploy and checks both sites. Vercel deploys the frontend from Git by itself.

- How to deploy: [docs/DEPLOY.md](docs/DEPLOY.md)
- Production settings and secrets: [docs/PRODUCTION_SETUP.md](docs/PRODUCTION_SETUP.md)
- Mock APIs: [docs/MOCK_APIS.md](docs/MOCK_APIS.md)
