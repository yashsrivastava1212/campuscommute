# Deploying CampusCommute

Frontend on **Vercel** · Backend on **Render**

## 1. Backend (Render)

### Option A — Blueprint (recommended)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**.
2. Connect this GitHub repo — Render reads `render.yaml`.
3. When prompted, set secret environment variables:
   - `JWT_SECRET` — strong random string
   - `JWT_REFRESH_SECRET` — strong random string
   - `ENCRYPTION_KEY` — 32-char hex string
   - `CORS_ORIGIN` — your Vercel URL, e.g. `https://campuscommute.vercel.app`
   - `RESEND_API_KEY` — your Resend API key
   - `EMAIL_FROM` — verified sender, e.g. `CampusCommute <noreply@gim.ac.in>`
4. Apply the blueprint. Render creates the web service and PostgreSQL database.
5. Copy the public backend URL (e.g. `https://campuscommute-api.onrender.com`).

### Option B — Manual web service

1. Create a **PostgreSQL** database on Render.
2. Create a **Web Service** from this repo:
   - **Build Command:** `npm install && npm run build -w backend`
   - **Start Command:** `npm run deploy -w backend`
   - **Health Check Path:** `/health`
3. Set environment variables:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(Internal Database URL from PostgreSQL)* |
| `JWT_SECRET` | strong random string |
| `JWT_REFRESH_SECRET` | strong random string |
| `ENCRYPTION_KEY` | 32-char hex string |
| `CORS_ORIGIN` | your Vercel URL |
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | verified sender |
| `ALLOW_DEV_OTP` | `false` |
| `ALLOWED_EMAIL_DOMAIN` | `gim.ac.in` |

Do **not** set `USE_PGLITE` in production.

Each deploy runs migrations and seeds locations (`npm run deploy -w backend`).

Health check: `GET /health`

## 2. Frontend (Vercel)

1. Import the repo at [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variable:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | your Render backend URL |

5. Deploy.

The `frontend/vercel.json` install command installs dependencies from the monorepo root.

## 3. Connect frontend ↔ backend

After both are live:

1. Set Render `CORS_ORIGIN` to your exact Vercel URL (comma-separate multiple URLs for preview deploys).
2. Redeploy the backend if you change CORS.
3. Confirm login at your Vercel URL.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend: http://localhost:3000 · Backend: http://localhost:3001
