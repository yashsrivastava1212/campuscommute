# Deploying CampusCommute

Frontend on **Vercel** · Backend on **Railway**

## 1. Backend (Railway)

1. Create a project at [railway.app](https://railway.app) and connect this GitHub repo.
2. Add **PostgreSQL** to the project (New → Database → PostgreSQL).
3. Create a **service** from the repo. Railway reads `railway.toml` at the repo root.
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
| `ALLOWED_EMAIL_DOMAIN` | `gim.ac.in` |
| `RESEND_API_KEY` | your Resend API key |
| `EMAIL_FROM` | `CampusCommute <onboarding@resend.dev>` or verified domain |
| `ALLOW_DEV_OTP` | `false` |

Do **not** set `USE_PGLITE` in production.

6. Deploy and copy the public backend URL (e.g. `https://campuscommute-api.up.railway.app`).

On each deploy, the server runs migrations and seeds Goa locations automatically before accepting traffic.

## 2. Frontend (Vercel)

1. Import the repo at [vercel.com](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variable:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | your Railway backend URL (no trailing slash) |

4. Deploy. Vercel uses `frontend/vercel.json` to install dependencies from the monorepo root.

## 3. Connect them

After the first Vercel deploy, update Railway `CORS_ORIGIN` to match your exact Vercel URL (include `https://`). For preview deployments, use a comma-separated list:

```env
CORS_ORIGIN=https://campuscommute.vercel.app,https://campuscommute-git-main-yourteam.vercel.app
```

Redeploy the backend after changing `CORS_ORIGIN`.

## 4. Admin user

Connect to Railway PostgreSQL and run:

```sql
UPDATE users SET is_admin = true WHERE campus_email = 'your.name@gim.ac.in';
```

## 5. Health checks

- `GET /health` — liveness (used by Railway)
- `GET /health/ready` — includes database connectivity

## Local development

Copy `.env.example` to `.env` and run `npm run dev` from the repo root. Local dev uses embedded PGLite by default — no PostgreSQL required.
