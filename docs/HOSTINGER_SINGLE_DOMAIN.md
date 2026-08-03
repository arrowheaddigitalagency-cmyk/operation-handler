# Hostinger Shared — Single Domain (ONE Node.js Web App)

**Audience:** Client plan that can attach **Node.js only to one domain** (no Node subdomain slot).  
**Pattern:** Same idea as Arrowhead DigiTech (one public URL), but this repo keeps Nest + Next as separate apps under one launcher.

---

## How many Node.js Web Apps?

| Scenario | Apps required | Why |
|----------|---------------|-----|
| **Your Hostinger plan (no Node on subdomain)** | **One** | Only one domain can host a Node entry process |
| Two-domain Shared (apex + `api.*` both Node) | Two | Web and API are separate HTTP servers |
| As-designed VPS + PM2 | Three | Web + API + Worker |

### Why Web and API are separate *processes* by default

1. **Web (Next.js)** — SSR UI, staff dashboard, portal, marketing pages. Entry is Next standalone `server.js`.
2. **API (NestJS)** — REST, auth cookies, Prisma, AI, uploads, cron HTTP handlers. Entry is `apps/api/dist/main.js`.
3. **They are not one binary** — different frameworks, different bootstrap (`next` vs `NestFactory`). Hostinger’s “one website = one entry file” therefore cannot start both unless a **parent launcher** starts both children.

### Why they cannot be “one process” without a launcher

Nest does not render the Next App Router. Next does not contain the Nest modules. Merging them into a single Node process would mean rewriting API routes into Next Route Handlers (that is what Arrowhead DigiTech does — **one Next app with `app/api`**). That **redesigns** this project’s API layer.

### Single-app solution without redesigning business logic

**Yes:** `scripts/hostinger-single-start.cjs`

```
Hostinger Entry: scripts/hostinger-single-start.cjs
        │
        ├─ child: node apps/api/dist/main.js
        │         HOST=127.0.0.1  PORT=4000
        │
        └─ child: node apps/web/.next/standalone/apps/web/server.js
                  HOSTNAME=0.0.0.0  PORT=<Hostinger PORT>
                  rewrites /api/v1/* → http://127.0.0.1:4000/api/v1/*
```

- Public URL: `https://yourdomain.com` only  
- Cron hits `https://yourdomain.com/api/v1/...` (via Next rewrite → Nest)  
- Worker process: **not** deployed; Hostinger Cron replaces it  
- Later sale → move to VPS + PM2 (`ecosystem.config.cjs`) without rewriting domain logic  

This matches Arrowhead DigiTech’s **user experience** (one domain, admin + site) while keeping Nest business logic.

---

## Deployment diagram (single domain)

```text
                    Cloudflare (DNS / SSL / CDN)
                              │
                              ▼
                 ┌────────────────────────────┐
                 │ Hostinger Shared Node App  │
                 │ domain: yourdomain.com     │
                 │ entry: hostinger-single-   │
                 │        start.cjs           │
                 └─────────────┬──────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
     Nest API (loopback)                 Next Web (public)
     127.0.0.1:4000                      0.0.0.0:$PORT
     /api/v1/*                           pages + rewrite
              ▲                                 │
              └──────── /api/v1 rewrite ────────┘
              ▲
              │ Hostinger Cron (curl + x-cron-secret)
              │
     MySQL (Hostinger) · Cloudinary · Resend/Twilio
```

---

## Exact Hostinger settings (demo / single domain)

| Setting | Value |
|---------|--------|
| Websites → Node.js | **One** app on primary domain |
| Framework | **Other** |
| Node | 20 or 22 |
| Build command | `bash scripts/hostinger-single-build.sh` |
| Entry file | `scripts/hostinger-single-start.cjs` |

**Env (same app):**

```env
NODE_ENV=production
APP_URL=https://YOURDOMAIN.com
API_URL=http://127.0.0.1:4000
API_INTERNAL_PORT=4000
CORS_ORIGINS=https://YOURDOMAIN.com
COOKIE_SECURE=true
ENABLE_WORKER=false
JWT_SECRET=...
CRON_SECRET=...
DATABASE_URL=mysql://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STORAGE_LOCAL_FALLBACK=false
```

`PORT` is injected by Hostinger — do not fight it; the launcher uses it for Next only.

---

## Production build output (verified from this repo)

Build was run locally (Windows). Nest API completed. Next standalone **file copy partially failed on Windows** (`EPERM` creating symlinks). On **Hostinger Linux** the same `next build` normally completes and writes `server.js`.

| Item | Actual path |
|------|-------------|
| **API entry file** | `apps/api/dist/main.js` (**verified present**) |
| **Worker entry** (not used on Shared) | `apps/api/dist/worker.js` (**verified present**) |
| **Web entry file (standalone)** | `apps/web/.next/standalone/apps/web/server.js` (expected; created on successful Linux standalone) |
| **Standalone server location** | `apps/web/.next/standalone/` (root) with app under `apps/web/` |
| **Static assets (build)** | `apps/web/.next/static/` (**verified**: `chunks/`, `css/`, `media/`) |
| **Static assets (runtime copy)** | `apps/web/.next/standalone/apps/web/.next/static/` (via prepare script) |
| **Public assets** | `apps/web/public/` → copied to `.../standalone/apps/web/public/` |
| **Required for single deploy** | `apps/api/dist/**`, `apps/web/.next/standalone/**` (after prepare), `scripts/hostinger-single-start.cjs`, `node_modules` as produced by build, Prisma client, env vars |

**Script fix applied:** `ecosystem.config.cjs` previously used `script: "server.js"` at standalone root — incorrect for this monorepo. Correct: `apps/web/server.js` relative to `apps/web/.next/standalone`.

---

## Cron schedule (different frequencies — production)

Email + SMS share **one** DB outbox drained by `/notifications/process`.  
Cleanup / AI / logs / media / DB purge **have no HTTP endpoints yet** in this codebase — do not invent cron until implemented.

| Job | Endpoint / action | Best schedule | Why |
|-----|-------------------|---------------|-----|
| **Notifications** (outbox drain) | `POST /api/v1/notifications/process` | Every **1 min** | Near-realtime email/SMS |
| **Email queue** | Same as Notifications | *(same cron)* | Channel=EMAIL rows in same outbox |
| **SMS queue** | Same as Notifications | *(same cron)* | Channel=SMS rows in same outbox |
| **Maintenance** | `POST /api/v1/maintenance/run-reminders` | Every hour at **:15** | Matches worker; low urgency |
| **Campaigns** | `POST /api/v1/campaigns/run` | Every **30 min** | Matches worker; drip steps |
| **Cleanup Jobs** | — | **N/A** | No controller |
| **AI Cleanup** | — | **N/A** | No controller |
| **Logs Cleanup** | — | **N/A** | No controller |
| **Media Cleanup** | — | **N/A** (config `MEDIA_RETENTION_MONTHS` only) | No purge job yet |
| **Database Cleanup** | — | **N/A** | No controller |

### Exact Hostinger Cron commands

Replace `YOURDOMAIN` and `YOUR_CRON_SECRET`.

**1 — Notifications / Email / SMS outbox — every minute**

```bash
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/notifications/process"
```

**2 — Maintenance — daily every hour at minute 15** (Hostinger: `15 * * * *`)

```bash
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/maintenance/run-reminders"
```

**3 — Campaigns — every 30 minutes** (`*/30 * * * *`)

```bash
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://YOURDOMAIN.com/api/v1/campaigns/run"
```

Do **not** call all three every minute — wastes CPU on Shared and was never the worker design.

---

## Production verification checklist

Status below reflects **this workspace right now** (code/build readiness + local API artifact). Live Hostinger URL was **not** available to hit, so remote items are **FAIL** until you deploy and re-run.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Health endpoint | **FAIL** (not live) | Code exists: `GET /api/v1/health` → `{ ok: true }` |
| 2 | API | **PASS** (artifact) | `apps/api/dist/main.js` built |
| 3 | Database | **FAIL** (prod MySQL not configured here) | Local SQLite only; prod needs `provider=mysql` + migrate |
| 4 | Cloudinary | **FAIL** (creds not verified live) | Integration present; needs env |
| 5 | Authentication | **FAIL** (not live) | Login routes exist; needs HTTPS + `COOKIE_SECURE` |
| 6 | Customer Portal | **FAIL** (not live) | `/portal` routes built |
| 7 | Staff Dashboard | **FAIL** (not live) | `/staff` routes built |
| 8 | Notifications | **FAIL** (not live) | Outbox + cron endpoint exist |
| 9 | Cron | **FAIL** (not scheduled on Hostinger yet) | Commands documented above |
| 10 | Environment Variables | **FAIL** (prod panel not set) | `.env.example` lists required keys |
| 11 | Cookies | **FAIL** (not live HTTPS) | `COOKIE_SECURE` forced/warned in prod config |
| 12 | CORS | **PASS** (code) | Same-origin demo: set `CORS_ORIGINS=https://YOURDOMAIN.com` |
| 13 | SSL | **FAIL** (domain not attached here) | Use Hostinger/Cloudflare Full Strict |
| 14 | Cloudflare | **FAIL** (not configured in this check) | Point DNS; orange-cloud OK |

After go-live, re-test each row against the real URL and flip FAIL → PASS.

---

## Reliability (launcher)

Supervisor hardening (auto-restart, graceful SIGTERM, port conflict guard, health=200 before Next): see [`HOSTINGER_SINGLE_DOMAIN_RELIABILITY.md`](./HOSTINGER_SINGLE_DOMAIN_RELIABILITY.md).
