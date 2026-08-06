# CampusCommute — Phase Status

| Phase | Status |
|-------|--------|
| Phase 0 — Foundation | ✅ Done |
| Phase 1A — GIM Login & OTP Auth | ✅ Done |
| Phase 1B — Carpool Core | ✅ Done |
| Phase 1C — Join Request Workflow | ✅ Done |
| Phase 1D — Trip Discussion & Contact | ✅ Done |
| Phase 1E — Lifecycle & Notifications | ✅ Done |
| Phase 1F — MVP Hardening (PWA, privacy) | ✅ Done |
| Phase 2A — Carpool Merge Engine | ✅ Done |
| Phase 2B — Admin Panel & Analytics | ✅ Done |
| Phase 2C — Cost-Split Calculator | ✅ Done |
| Phase 3A — Multi-Campus Support | ✅ Done |
| Phase 3B — Recurring Trips & Transport | ✅ Done |
| Phase 3C — Institutional Dashboard | ✅ Done |

## Admin Setup

To enable admin features, set a user as admin in PostgreSQL:

```sql
UPDATE users SET is_admin = true WHERE campus_email = 'your.name@gim.ac.in';
```

## Dev OTP

When `RESEND_API_KEY` is not set, OTP is **not emailed**. Instead:
1. The code appears on the login screen (yellow dev banner) after you click Continue
2. It is also printed in the backend terminal: `[DEV] OTP for you@gim.ac.in: 123456`

## Local database (no Docker required)

See [DEPLOY.md](./DEPLOY.md) for **Vercel + Render** production deployment.

By default in development, the backend uses an **embedded PGLite database** — no PostgreSQL or Docker needed.

To use real PostgreSQL instead (e.g. with `docker compose up -d`):
```env
USE_PGLITE=false
DATABASE_URL=postgresql://campuscommute:campuscommute@localhost:5432/campuscommute
```

## Real email (optional)

1. Sign up at [resend.com](https://resend.com) (free tier)
2. Add your API key to `.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   ```
3. For `@gim.ac.in` delivery, verify the `gim.ac.in` domain in Resend (or use Resend's test address for development)
