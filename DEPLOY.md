# Deploying CampusCommute

Frontend and backend on **Railway**

## Project layout on Railway

Create **one Railway project** with three items:

| Item | Purpose |
|------|---------|
| **PostgreSQL** | Database |
| **Backend service** | API — uses root `railway.toml` |
| **Frontend service** | Next.js — uses `frontend/railway.toml` |

Both web services deploy from the same GitHub repo.

---

## 1. Backend (Railway)

1. Create a project at [railway.app](https://railway.app) and connect this GitHub repo.
2. Add **PostgreSQL** (New → Database → PostgreSQL).
3. Create a **backend service** from the repo.
4. **Settings → Railway Config File:** `railway.toml` (repo root — default).
5. Link PostgreSQL **`DATABASE_URL`** to the backend service (Variables → Add Reference).
6. Set these environment variables on the **backend** service:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(reference from PostgreSQL)* |
| `JWT_SECRET` | strong random string |
| `JWT_REFRESH_SECRET` | strong random string |
| `ENCRYPTION_KEY` | 32-char hex string |
| `CORS_ORIGIN` | your Railway **frontend** URL |
| `ALLOWED_EMAIL_DOMAIN` | `gim.ac.in` |
| `RESEND_API_KEY` | your Resend API key (`re_...`) — **backend service only** |
| `EMAIL_FROM` | `CampusCommute <noreply@gim.ac.in>` after domain verification (not `onboarding@resend.dev`) |
| `ALLOW_DEV_OTP` | `false` for real email delivery |

Do **not** set `USE_PGLITE` in production.

7. **Settings → Networking → Generate Domain** and copy the backend URL.

On each deploy, the server runs migrations and seeds Goa locations automatically before accepting traffic.

### Resend email (required for real OTP)

`onboarding@resend.dev` **cannot** send to `@gim.ac.in` inboxes. To deliver OTP by email:

1. Verify **`gim.ac.in`** (or a subdomain like `mail.gim.ac.in`) at [resend.com/domains](https://resend.com/domains)
2. On the **backend service**, set:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=CampusCommute <noreply@gim.ac.in>`
   - `ALLOW_DEV_OTP=false`
3. Redeploy the backend
4. Check `GET https://YOUR-BACKEND-URL/health/email` — `canDeliverToGimInbox` should be `true`

Put `RESEND_API_KEY` on the **backend** service, not the frontend.

---

## 2. Frontend (Railway)

1. In the same project, click **+ New → GitHub Repo** and select **`campuscommute`** again.
2. **Settings → Railway Config File:** `frontend/railway.toml`  
   *(Required — otherwise the root config starts the backend on this service.)*
3. Set environment variables on the **frontend** service:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | your Railway **backend** URL (no trailing slash) |

Do **not** add backend variables (`DATABASE_URL`, `JWT_SECRET`, etc.) to the frontend service.

4. **Settings → Networking → Generate Domain** and copy the frontend URL.
5. Update backend **`CORS_ORIGIN`** to this frontend URL and redeploy the backend.

`NEXT_PUBLIC_API_URL` is baked in at build time — redeploy the frontend after changing it.

---

## 3. Connect them

```env
# Frontend service
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app

# Backend service
CORS_ORIGIN=https://your-frontend.up.railway.app
```

Redeploy both services after changing either URL.

---

## 4. Admin user

Connect to Railway PostgreSQL and run:

```sql
UPDATE users SET is_admin = true WHERE campus_email = 'your.name@gim.ac.in';
```

---

## 5. Health checks

| Service | Path |
|---------|------|
| Backend | `GET /health` and `GET /health/ready` |
| Frontend | `GET /login` |

---

## Local development

Copy `.env.example` to `.env` and run `npm run dev` from the repo root. Local dev uses embedded PGLite by default — no PostgreSQL required.
