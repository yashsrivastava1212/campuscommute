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
| `SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → JWT (not the Secret API key) |
| `ALLOW_DEV_OTP` | `false` (legacy backend OTP only; Supabase sends login emails) |

Do **not** set `USE_PGLITE` in production.

7. **Settings → Networking → Generate Domain** and copy the backend URL.

On each deploy, the server runs migrations and seeds Goa locations automatically before accepting traffic.

### Free OTP email via Gmail SMTP (recommended — no IT, no paid domain)

Use this instead of Resend if you cannot verify `gim.ac.in` with college IT.

**Only `@gim.ac.in` can log in** (enforced by the app). Emails are **sent to** GIM inboxes **from** your Gmail address.

1. Use a **Gmail account** (create one if needed).
2. Turn on **2-Step Verification**: [Google Account → Security](https://myaccount.google.com/security)
3. Create an **App Password**: Google Account → Security → App passwords → Mail → copy the 16-character password.
4. On the **backend service** in Railway, set:

| Variable | Value |
|----------|--------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address, e.g. `campuscommute.app@gmail.com` |
| `SMTP_PASS` | the 16-character Google App Password (no spaces) |
| `EMAIL_FROM` | `CampusCommute <campuscommute.app@gmail.com>` |
| `ALLOW_DEV_OTP` | `false` |

5. **Remove** `RESEND_API_KEY` from Railway (or leave empty) so Gmail SMTP is used.
6. Redeploy the backend.
7. Check `GET https://YOUR-BACKEND-URL/health/email` — `smtpConfigured: true`, `canDeliverToGimInbox: true`

Gmail free limit: about **500 emails/day** — enough for a student project.

### Resend (optional — needs a domain you control)

`onboarding@resend.dev` **cannot** send to `@gim.ac.in` inboxes. Resend only works for all GIM users if you verify **your own domain** (paid) or `gim.ac.in` (needs IT).

1. Verify your domain at [resend.com/domains](https://resend.com/domains)
2. Set `RESEND_API_KEY`, `EMAIL_FROM=CampusCommute <noreply@yourdomain.com>`
3. Check `/health/email`

Put email variables on the **backend** service only, not the frontend.

---

## 2. Frontend (Railway)

1. In the same project, click **+ New → GitHub Repo** and select **`campuscommute`** again.
2. **Settings → Railway Config File:** `frontend/railway.toml`  
   *(Required — otherwise the root config starts the backend on this service.)*
3. Set environment variables on the **frontend** service:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | your Railway **backend** URL (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **Publishable** key (Settings → API) |

Do **not** add backend variables (`DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, etc.) to the frontend service.

4. **Settings → Networking → Generate Domain** and copy the frontend URL.
5. Update backend **`CORS_ORIGIN`** to this frontend URL and redeploy the backend.

`NEXT_PUBLIC_API_URL` is baked in at build time — redeploy the frontend after changing it.

---

## 3. Supabase Auth (OTP login)

Login uses **Supabase Auth** for passwordless OTP. The Railway backend verifies Supabase access tokens and maps users to your existing `users` table.

### Supabase dashboard

1. **Authentication → Providers → Email** — enable Email.
2. **Authentication → Emails → SMTP** — add Gmail SMTP (see Gmail section above).
3. **Authentication → Email Templates → Magic Link** — use `{{ .Token }}` only (6-digit OTP, no magic link URL).
4. **Authentication → URL Configuration** — Site URL = your Railway frontend URL; add `http://localhost:3000/**` for local dev.

### Railway variables (already set if you completed setup)

| Service | Variable |
|---------|----------|
| Frontend | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL` |
| Backend | `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `CORS_ORIGIN`, `ALLOWED_EMAIL_DOMAIN=gim.ac.in` |

Only `@gim.ac.in` addresses can sign in (enforced in Supabase flow + backend).

---

## 4. Connect them

```env
# Frontend service
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key

# Backend service
CORS_ORIGIN=https://your-frontend.up.railway.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
```

Redeploy **both** services after changing URLs or Supabase keys (`NEXT_PUBLIC_*` vars are baked in at build time).

---

## 5. Admin user

Connect to Railway PostgreSQL and run:

```sql
UPDATE users SET is_admin = true WHERE campus_email = 'your.name@gim.ac.in';
```

---

## 6. Health checks

| Service | Path |
|---------|------|
| Backend | `GET /health` and `GET /health/ready` |
| Frontend | `GET /login` |

---

## Local development

Copy `.env.example` to `.env` and run `npm run dev` from the repo root. Local dev uses embedded PGLite by default — no PostgreSQL required.
