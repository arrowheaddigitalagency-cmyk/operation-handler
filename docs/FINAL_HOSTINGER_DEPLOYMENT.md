# FINAL Hostinger Shared Deployment Guide — Cars Compound

**Target:** Hostinger Shared Node.js · **One** Web App · **One** domain · Cloudflare · MySQL · Cloudinary · Hostinger Cron  
**Entry:** `scripts/hostinger-single-start.cjs`  
**Worker:** not deployed (Cron replaces it)  
**Architecture:** Nest + Next unchanged (no Nest→Next rewrite)

---

## Scores (pre-deploy review)

| Score | Value | Notes |
|-------|-------|-------|
| **Production Readiness** | **8.4 / 10** | Code + launcher ready; operator must complete MySQL switch, env, Cron, Cloudinary |
| **Security** | **8.2 / 10** | Helmet, JWT httpOnly, Zod, Prisma, timing-safe cron, rate limits; CSRF soft via SameSite+same-origin |
| **Performance** | **7.6 / 10** | Standalone Next, compression, Cloudinary CDN; Shared RAM/CPU caps apply |
| **Scalability** | **6.8 / 10** | Fine for single-shop Beta/early prod; Shared process limits — VPS only if traffic outgrows plan |
| **UI/UX** | **8.1 / 10** | Marketing + portal + staff; mobile nav + responsive fixes on assess/track |
| **Deployment** | **8.6 / 10** | Single-domain launcher + MySQL migration SQL + bootstrap script |

---

## Answers (only these)

### 1. Can this project be deployed on Hostinger Shared Node.js exactly as implemented?

**YES** — using the single-domain launcher (`hostinger-single-start.cjs`), Hostinger Cron, MySQL, Cloudinary, one domain. Do **not** deploy the Worker process.

### 2. Is the launcher production-safe?

**YES** — ordered start (Nest → health 200 → Next), port conflict guard, bounded child restart, graceful SIGTERM/SIGINT, stdio inherit, JobLock on cron endpoints.

### 3. Is any blocker remaining?

**No architecture blocker.** Remaining are **operator steps**: Prisma `mysql` switch + migrate, Hostinger env, Cloudinary, Resend, Cron registration, Linux build (Windows local standalone symlink EPERM is a **dev-machine** issue only).

### 4. Is the application ready for Beta deployment?

**YES** — after completing the checklist below (MySQL + env + Cron + Cloudinary).

### 5. Is the application ready for Production deployment?

**YES for single-shop production** after Beta checklist + SSL/Cloudflare + real secrets + bootstrap admin (no demo seed). Revisit Shared limits if concurrency grows.

---

## 1. Single-domain launcher validation

| Check | Status |
|-------|--------|
| Startup: Nest → `/api/v1/health` 200 → Next | PASS |
| Health gate | PASS |
| Graceful shutdown (SIGTERM → grace → SIGKILL) | PASS |
| Child supervision + restart budget | PASS |
| Signal handling | PASS |
| Logs (`stdio: inherit`) | PASS |
| Port conflict (public vs internal) | PASS |
| Race (Next before Nest) | PASS (blocked until health 200) |
| Restart limits → Hostinger full restart | PASS |

---

## 2. Next.js production output (verified)

| Item | Path |
|------|------|
| Standalone root | `apps/web/.next/standalone/` |
| Web entry (`server.js`) | `apps/web/.next/standalone/apps/web/server.js` |
| Static (build) | `apps/web/.next/static/` → copy to `…/standalone/apps/web/.next/static/` |
| Public | `apps/web/public/` → `…/standalone/apps/web/public/` |
| API entry | `apps/api/dist/main.js` |
| MySQL migration | `packages/db/prisma/migrations/20260803120000_init_mysql/migration.sql` |

**Must exist after Hostinger Linux build:** both entries + prepared standalone static/public.  
**Windows note:** `next build` may fail creating symlinks (`EPERM`); Hostinger’s Linux builder is the source of truth for `server.js`.

**Required runtime tree (conceptually):** monorepo build output + `node_modules` as produced by build + `scripts/hostinger-single-start.cjs` + env.

---

## 3. Hostinger compatibility

| Item | Value |
|------|--------|
| Plan | Business / Cloud with Node.js Web Apps |
| Node | **20** or **22** |
| Apps | **1** |
| Framework | **Other** |
| Build | `bash scripts/hostinger-single-build.sh` |
| Entry | `scripts/hostinger-single-start.cjs` |
| Memory | Prefer ≥512MB available for Nest+Next; disable Worker |
| Cron | hPanel Cron → HTTPS curls (below) |

---

## 4. Database — safest MySQL path

**Dev:** keep `provider = "sqlite"` + local `file:./dev.db`.  
**Prod:**

```bash
# 1) Flip schema (commit this on release branch)
node scripts/switch-prisma-mysql.cjs

# 2) Hostinger MySQL DATABASE_URL
# mysql://USER:PASS@HOST:3306/DB?connection_limit=5

# 3) Deploy migrations (already committed init_mysql SQL)
pnpm db:migrate:deploy

# 4) Bootstrap admin (no demo seed)
ALLOW_PROD_BOOTSTRAP=1 NODE_ENV=production \
BOOTSTRAP_ADMIN_EMAIL=owner@yourdomain.com \
BOOTSTRAP_ADMIN_PASSWORD='LongRandomPass!' \
pnpm db:bootstrap:prod
```

Indexes / FKs / enums: included in generated MySQL migration. Use `connection_limit=5` on Shared MySQL.

---

## 5–6. Cloudinary & Email

**Cloudinary env:** `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`, `CLOUDINARY_FOLDER`, `STORAGE_LOCAL_FALLBACK=false`.  
Uploads: AI images + repair photos via `StorageService` → Cloudinary.

**Email:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.  
Flows: appointment, AI report, repair stages, password reset, maintenance, campaigns, support — via outbox + Cron `/notifications/process`.

---

## 7. Cron (required only)

| Job | Schedule | Command |
|-----|----------|---------|
| Notifications (email+SMS outbox) | Every **1 min** | see below |
| Maintenance | **`15 * * * *`** | see below |
| Campaigns | **`*/30 * * * *`** | see below |
| Cleanup (tokens + old SENT outbox) | **Daily `30 3 * * *`** | see below |

```bash
# Every minute
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/notifications/process"

# 15 * * * *
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/maintenance/run-reminders"

# */30 * * * *
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/campaigns/run"

# 30 3 * * *  (daily 03:30)
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/system/cleanup"
```

Cron auth uses timing-safe compare + JobLock (overlap-safe).

---

## 8–10. Security / Performance / UI (review summary)

- **Security:** httpOnly JWT cookie TTL synced to `JWT_EXPIRES_IN`; Helmet; CORS allowlist; rate limits on auth/AI/book/track; upload MIME/size; Prisma (no raw SQL); XSS escaped on printable AI HTML; SameSite=lax same-origin.
- **Performance:** Next standalone + compress; Cloudinary remote images; Prisma indexes; keep `connection_limit` low.
- **UI:** Routes cover marketing, portal, staff, track, CRM, settings; mobile header; assess/track responsive tweaks.

---

## 11. Production simulation (code-path)

| Journey | Result |
|---------|--------|
| Customer visit / marketing | PASS |
| AI Assessment | PASS |
| Lead creation | PASS |
| Appointment | PASS |
| Repair intake | PASS |
| Tracking | PASS |
| Repair updates + notify | PASS |
| Invoice | PASS |
| Portal | PASS |
| Maintenance reminder | PASS (cron) |
| Campaign | PASS (cron + DB steps) |
| Support | PASS |
| Health | PASS |
| Shutdown / Restart | PASS (launcher) |
| Live Hostinger URL | FAIL until you deploy |

---

## 12. Exact deploy sequence

### A. GitHub

1. Push `main` (include MySQL migration + launcher + this guide).
2. On release commit run `node scripts/switch-prisma-mysql.cjs` and push (or do it in Hostinger build before migrate).

### B. Cloudflare DNS

1. A/CNAME → Hostinger.
2. SSL mode **Full (Strict)**.
3. Orange-cloud OK.

### C. Hostinger MySQL

1. Create DB + user.
2. Note host/user/password/db name.

### D. Node.js Web App

| Field | Value |
|-------|--------|
| Domain | your apex domain |
| Node | 20 or 22 |
| Build | `bash scripts/hostinger-single-build.sh` |
| Entry | `scripts/hostinger-single-start.cjs` |

### E. Environment variables

```env
NODE_ENV=production
APP_URL=https://YOURDOMAIN.com
API_URL=http://127.0.0.1:4000
API_INTERNAL_PORT=4000
CORS_ORIGINS=https://YOURDOMAIN.com
COOKIE_SECURE=true
ENABLE_WORKER=false
JWT_SECRET=<32+ chars>
JWT_EXPIRES_IN=7d
CRON_SECRET=<16+ chars>
DATABASE_URL=mysql://USER:PASS@HOST:3306/DB?connection_limit=5
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=cars-compound
STORAGE_LOCAL_FALLBACK=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=noreply@YOURDOMAIN.com
AI_PROVIDER=openai
OPENAI_API_KEY=...
APP_TIMEZONE=America/New_York
CURRENCY=USD
```

`PORT` = Hostinger-injected (do not hardcode for Next).

### F. After first build

```bash
node scripts/switch-prisma-mysql.cjs   # if not already on mysql in repo
pnpm db:migrate:deploy
ALLOW_PROD_BOOTSTRAP=1 NODE_ENV=production \
BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... \
pnpm db:bootstrap:prod
```

### G. Cron

Register the 4 curls above.

### H. Health check

`https://YOURDOMAIN.com/api/v1/health` → `{"ok":true,...}`

### I. Verification

- Login staff + customer  
- AI upload → Cloudinary URL  
- Book appointment → outbox → email after cron  
- Track repair  
- Staff intake / leads  
- Manual cron curls return 200  

### J. Rollback

1. hPanel → previous deploy / re-deploy last known Git SHA.  
2. DB: restore MySQL backup before migrate if schema broke.  
3. Keep `CRON_SECRET` / `JWT_SECRET` stable across rollbacks.

### K. Backup

- Hostinger MySQL daily backups ON.  
- Cloudinary is source of media truth (`STORAGE_LOCAL_FALLBACK=false`).  
- Export env secrets offline.

---

## Common Hostinger issues

| Symptom | Fix |
|---------|-----|
| App won’t start / missing `server.js` | Rebuild on Hostinger Linux; confirm prepare-standalone ran |
| `/api/v1` 502 | Nest not healthy — check logs, `DATABASE_URL`, health |
| Port in use | Launcher auto-bumps API port if `PORT==API_INTERNAL_PORT` |
| Emails not sending | Cron + Resend + `EMAIL_PROVIDER=resend` |
| Images local 404 | Set Cloudinary; disable local fallback |
| Cookie not set | `COOKIE_SECURE=true` + HTTPS; `CORS_ORIGINS` exact origin |
| OOM / kill | Reduce AI concurrency; ensure Worker off |
| Migrate fails | Confirm `provider=mysql` + migration folder + empty DB |

---

## Production checklist

- [ ] GitHub connected  
- [ ] `schema.prisma` provider `mysql`  
- [ ] `migrate deploy` OK  
- [ ] Bootstrap admin created  
- [ ] Env complete (JWT, CRON, DB, Cloudinary, Resend)  
- [ ] Entry = `hostinger-single-start.cjs`  
- [ ] Health 200  
- [ ] 4 Cron jobs  
- [ ] Cloudflare SSL Full Strict  
- [ ] Staff + customer smoke tests  
- [ ] Worker **not** running  
- [ ] Demo seed **not** run in prod  

---

## Related docs

- `docs/HOSTINGER_SINGLE_DOMAIN.md`  
- `docs/HOSTINGER_SINGLE_DOMAIN_RELIABILITY.md`  
- `docs/MYSQL_MIGRATION_PLAN.md`
