# Hostinger Shared Node.js — Adapted Deployment

**Target:** Hostinger **Business Web Hosting** or **Cloud** (Node.js Web Apps in hPanel).  
**Not required:** VPS, PM2, continuous Worker process.

**Prerequisite (two-app mode):** plan allows **≥ 2** Node.js Web Apps (Web + API on two hostnames).

**Prerequisite (one-domain mode — your case):** only **1** Node app / no Node subdomain → use [`HOSTINGER_SINGLE_DOMAIN.md`](./HOSTINGER_SINGLE_DOMAIN.md) (`scripts/hostinger-single-start.cjs`). That is the supported Shared path when subdomains cannot run Node.

---

## Answer

**Yes — this project can run on Hostinger Shared Node.js Hosting** after replacing the continuous Worker + PM2 with Hostinger Cron → secured HTTP endpoints. Business logic stays the same; only process topology changes.

---

## Incompatibility map (smallest change each)

| # | Item | Why incompatible as-designed | Smallest Shared change |
|---|------|------------------------------|------------------------|
| 1 | Continuous Worker | `worker.js` has **no HTTP server**; Shared apps expect an HTTP entry | **Do not deploy Worker.** Call existing `POST /api/v1/notifications/process`, `/maintenance/run-reminders`, `/campaigns/run` with `x-cron-secret` via Hostinger Cron |
| 2 | PM2 | No root / no PM2 on Shared | Use hPanel **Restart** per website; two managed Node processes |
| 3 | Background jobs (outbox) | Worker ran outbox every 1 min in-process | Cron → `POST .../notifications/process` every minute |
| 4 | Cron (node-cron in Worker) | Same as Worker | Hostinger Cron (or Cloudflare Cron → same URLs) |
| 5 | API process | Needs long-lived HTTP — **compatible** | Deploy as Node website `api.yourdomain.com`, entry `apps/api/dist/main.js` |
| 6 | Next.js | Needs long-lived HTTP — **compatible** | Deploy as second Node website, Next standalone `server.js` |
| 7 | NestJS | Same as API — **compatible** | NestJS / Other framework preset |
| 8 | Cloudinary | External SaaS — **compatible** | Set `CLOUDINARY_*`; `STORAGE_LOCAL_FALLBACK=false` |
| 9 | MySQL | Shared MySQL is fine — **compatible** | Switch Prisma `provider` to `mysql`; set `DATABASE_URL` |
| 10 | Env vars | hPanel env UI — **compatible** | Set vars on **each** Node app (Web + API). Bake `API_URL` at **Web build time** for rewrites |

---

## Runtime topology (Shared)

```
┌─────────────────────┐     rewrite /api/v1/*      ┌─────────────────────┐
│  Web (Next)         │ ──────────────────────────▶│  API (Nest)          │
│  yourdomain.com     │                            │  api.yourdomain.com  │
│  ENABLE_WORKER=N/A  │                            │  ENABLE_WORKER=false │
└─────────────────────┘                            └──────────▲──────────┘
                                                              │
                    Hostinger Cron (curl) ────────────────────┘
                    every 1 min → 3 secured POSTs
                              │
                    ┌─────────┴─────────┐
                    │ Hostinger MySQL   │
                    │ Cloudinary        │
                    │ Cloudflare DNS/SSL│
                    └───────────────────┘
```

Worker binary is **not started**. Same Nest services run when Cron hits the API.

---

## Exact deployment steps

### 0. Plan & DNS

1. Confirm Hostinger plan is **Business** or **Cloud** with Node.js Web Apps and **≥ 2** app slots.
2. Domains (example):
   - `https://carscompound.com` → Web
   - `https://api.carscompound.com` → API
3. Point both to Hostinger (Cloudflare orange-cloud OK; SSL Full/Strict).

### 1. MySQL

1. hPanel → **Databases** → create MySQL DB + user.
2. Note host (often `localhost` or `mysql.hostinger.com`), user, password, DB name.
3. In repo, set Prisma to MySQL (one-time go-live change — see `docs/MYSQL_MIGRATION_PLAN.md`):

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

4. Generate migration locally, commit `packages/db/prisma/migrations/**`, push to GitHub.

### 2. Cloudinary

1. Create folder (e.g. `cars-compound`).
2. Copy Cloud name, API key, API secret for API env.

### 3. Deploy API website first

hPanel → **Websites** → **Add Website** → **Node.js web app** → GitHub (this monorepo).

| Setting | Value |
|---------|--------|
| Domain | `api.carscompound.com` |
| Framework | NestJS or **Other** |
| Node.js | **20** or **22** |
| Branch | `main` (or your release branch) |
| Build command | see below |
| Entry file | `apps/api/dist/main.js` |

**Build command (API):**

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @cc/domain build && pnpm --filter @cc/config build && pnpm --filter @cc/db build && pnpm --filter @cc/notifications build && pnpm --filter @cc/ai build && pnpm --filter @cc/api build
```

Or: `bash scripts/hostinger-shared-build-api.sh`

**Environment variables (API app):**

```env
NODE_ENV=production
PORT=4000
APP_URL=https://carscompound.com
API_URL=https://api.carscompound.com
CORS_ORIGINS=https://carscompound.com
COOKIE_SECURE=true
JWT_SECRET=<long-random-32+>
JWT_EXPIRES_IN=7d
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DBNAME?connection_limit=5
CRON_SECRET=<long-random-16+>
ENABLE_WORKER=false
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=cars-compound
STORAGE_LOCAL_FALLBACK=false
AI_PROVIDER=openai
OPENAI_API_KEY=...
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=noreply@carscompound.com
SMS_PROVIDER=console
APP_TIMEZONE=America/New_York
CURRENCY=USD
```

> Hostinger may inject its own `PORT`. Prefer leaving `PORT` unset if the panel documents auto-injection; Nest must listen on the panel-assigned port (`process.env.PORT`).

**After first successful build**, run migrations once (SSH if available, or a one-off deploy hook / temporary script):

```bash
pnpm db:migrate:deploy
```

Verify: `GET https://api.carscompound.com/api/v1/health` → `{ ok: true, ... }`.

### 4. Deploy Web website

Second Node.js Web App → same repo.

| Setting | Value |
|---------|--------|
| Domain | `carscompound.com` (or `www`) |
| Framework | **Next.js** |
| Node.js | **20** or **22** |
| Build command | see below |
| Entry file | `apps/web/.next/standalone/apps/web/server.js` |

**Build command (Web)** — `API_URL` **must** be the public API URL (rewrites are fixed at build):

```bash
corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @cc/domain build && pnpm --filter @cc/ui build && API_URL=https://api.carscompound.com pnpm --filter @cc/web build && bash scripts/hostinger-shared-prepare-standalone.sh
```

Or: `API_URL=https://api.carscompound.com bash scripts/hostinger-shared-build-web.sh`

**Environment variables (Web app):**

```env
NODE_ENV=production
APP_URL=https://carscompound.com
API_URL=https://api.carscompound.com
```

(Next standalone also needs `HOSTNAME=0.0.0.0` if the panel requires it — set if health checks fail.)

### 5. Replace Worker with Hostinger Cron

hPanel → **Advanced** → **Cron Jobs** (or website Cron).

Create **one** job every minute (or every 5 minutes if the panel minimum is coarser):

```bash
curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://api.carscompound.com/api/v1/notifications/process" ; curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://api.carscompound.com/api/v1/maintenance/run-reminders" ; curl -fsS -X POST -H "x-cron-secret: YOUR_CRON_SECRET" "https://api.carscompound.com/api/v1/campaigns/run"
```

Same secret as `CRON_SECRET` on the API.

| Original worker schedule | Shared behavior |
|--------------------------|-----------------|
| Outbox `* * * * *` | Cron POST `/notifications/process` |
| Maintenance `15 * * * *` | Same POST every cron tick (idempotent if nothing due) |
| Campaigns `*/30 * * * *` | Same |

**Fallback:** Cloudflare Workers Cron Trigger calling the same three URLs if Hostinger cron interval or count is too limited.

### 6. Do **not** use

- `pm2 start ecosystem.config.cjs`
- `node apps/api/dist/worker.js` as a website entry
- `localhost` between Web and API
- SQLite in production
- `ENABLE_WORKER=true` (no worker process on Shared)

### 7. Smoke checklist

- [ ] `https://api.../api/v1/health` OK  
- [ ] Web home loads  
- [ ] Login (staff + customer)  
- [ ] Image upload → Cloudinary URL  
- [ ] Manual cron curl returns 200 / processed payload  
- [ ] Create lead / booking / tracking still works  

---

## What stays unchanged

- Nest modules, Prisma models, AI flow, CRM, notifications outbox **logic**
- Next app routes and UX
- Cloudinary + MySQL providers

Only the **third process** is replaced by HTTP-triggered runs of the same services.
