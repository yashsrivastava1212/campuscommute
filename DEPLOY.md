# Deploying CampusCommute

Frontend on **Vercel** · Backend on **Railway**

## 1. Backend (Railway)

1. Create a project at [railway.app](https://railway.app) and connect this GitHub repo.
2. Add a **PostgreSQL** database to the project.
3. Create a **service** from the repo (uses `railway.toml` at the repo root).
4. Link the PostgreSQL `DATABASE_URL` variable to the backend service.
5. Set these environment variables on the backend service:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(from PostgreSQL plugin)* |
| `JWT_SECRET` | strong random string |
| `JWT_REFRESH_SECRET` | strong random string |
| `ENCRYPTION_KEY` | 32-char hex string |
| `CORS_ORIGIN` | your Vercel URL, e.g. `https://campuscommute.vercel.app` |
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | verified sender, e.g. `CampusCommute <noreply@gim.ac.in>` |
| `ALLOW_DEV_OTP` | `false` |
| `ALLOWED_EMAIL_DOMAIN` | `gim.ac.in` |

Do **not** set `USE_PGLITE` in production.

6. Deploy. Railway runs migrations and seeds locations on each deploy (`npm run deploy -w backend`).
7. Copy the public backend URL (e.g. `https://campuscommute-production.up.railway.app`).

Health check: `GET /health`

## 2. Frontend (Vercel)

1. Import the repo at [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Next.js** (auto-detected).
4. Add environment variable:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | your Railway backend URL |

5. Deploy.

The `frontend/vercel.json` install command installs dependencies from the monorepo root.

## 3. Connect frontend ↔ backend

After both are live:

1. Set Railway `CORS_ORIGIN` to your exact Vercel URL (comma-separate multiple URLs for preview deploys).
2. Redeploy the backend if you change CORS.
3. Confirm login at your Vercel URL.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend: http://localhost:3000 · Backend: http://localhost:3001
