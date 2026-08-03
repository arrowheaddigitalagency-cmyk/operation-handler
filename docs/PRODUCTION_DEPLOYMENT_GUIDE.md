# Production Deployment Guide — Cars Compound

**Target:** Hostinger Node.js + MySQL + Cloudflare + Cloudinary  
**Architecture:** unchanged (pnpm monorepo, Nest API + worker, Next.js web)

---

## 1. GitHub repository setup

```bash
git init
git add .
git commit -m "chore: production-ready Cars Compound monorepo"
git branch -M main
git remote add origin https://github.com/<ORG>/cars-compound.git
git push -u origin main
```

Verify before push:
- `.env` is **not** staged (covered by `.gitignore`)
- No `*.db`, `uploads/`, `logs/`, `.next/`, `dist/`
- CI at `.github/workflows/ci.yml` is green

---

## 2. Required environment variables

Copy `.env.example` → Hostinger environment panel / server `.env`.

| Variable | Production value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://yourdomain.com` |
| `API_URL` | `https://yourdomain.com` or API subdomain |
| `CORS_ORIGINS` | `https://yourdomain.com` |
| `COOKIE_SECURE` | `true` |
| `JWT_SECRET` | 32+ random chars |
| `CRON_SECRET` | 16+ random chars |
| `DATABASE_URL` | MySQL connection string |
| `STORAGE_LOCAL_FALLBACK` | `false` |
| `CLOUDINARY_*` | Live credentials |
| `EMAIL_PROVIDER` | `resend` (+ `RESEND_API_KEY`) |
| `SMS_PROVIDER` | `twilio` or `console` |
| `AI_PROVIDER` | `openai` (+ key) or `mock` |
| `SENTRY_DSN` | optional |

---

## 3. MySQL setup (Hostinger)

1. Create MySQL 8 database + user in hPanel.
2. Allow remote or localhost access as Hostinger requires.
3. Connection string example:

```text
mysql://USER:PASSWORD@HOST:3306/DB_NAME?connection_limit=5
```

4. In `packages/db/prisma/schema.prisma` set provider to `mysql` (see [`MYSQL_MIGRATION_PLAN.md`](./MYSQL_MIGRATION_PLAN.md)).

5. Generate initial migration on a clean MySQL instance:

```bash
pnpm db:generate
pnpm --filter @cc/db exec prisma migrate dev --name init_mysql
```

Commit the `packages/db/prisma/migrations` folder.

Build helper on server/VPS:

```bash
bash scripts/hostinger-build.sh
pnpm db:migrate:deploy
pm2 start ecosystem.config.cjs
```

---

## 4. Prisma commands (production)

```bash
pnpm db:generate
pnpm db:migrate:deploy   # applies committed migrations
pnpm db:seed             # optional — never on live with demo passwords without rotation
```

**Do not use `db:push` in production** once migrations exist.

Connection pooling: keep `connection_limit=5` (or Hostinger plan limit) in `DATABASE_URL`.

---

## 5. Cloudinary

1. Create folder `cars-compound`.
2. Set `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`, `CLOUDINARY_FOLDER`.
3. Set `STORAGE_LOCAL_FALLBACK=false`.
4. Confirm repair photo uploads return `https://res.cloudinary.com/...` URLs.

---

## 6. Cloudflare

1. Add domain → nameservers to Cloudflare.
2. Proxied A/CNAME → Hostinger.
3. SSL/TLS: **Full (strict)**.
4. Cache rules: cache static `/_next/static/*`; **bypass** `/api/*`, `/portal`, `/staff`, `/login`, `/assess`.
5. WAF managed rules on.
6. Optional: rate limiting at edge for `/api/v1/auth/login` and `/api/v1/ai/*`.

---

## 7. Hostinger Node.js configuration

- Node.js **20.x or 22.x** (see `engines` in root `package.json`)
- App root = monorepo root (or documented deploy artifact folder)
- Enable multiple Node processes **or** use VPS + PM2 (recommended for API + worker + web)

If Hostinger only allows one Node entrypoint, run API+worker on VPS / second Node app, and web on Hostinger — proxy `/api/v1` via Cloudflare Transform Rules / origin rules.

---

## 8. Build commands

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
```

Next standalone: after `pnpm --filter @cc/web build`, copy static assets into standalone:

```bash
# Typical monorepo standalone layout (verify after build)
cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
```

---

## 9. Start commands

```bash
pnpm start:api      # node apps/api/dist/main.js
pnpm start:worker   # node apps/api/dist/worker.js
pnpm start:web      # next start -p 3000
```

---

## 10. Worker commands

Worker drains notification outbox, maintenance reminders, and campaigns:

```bash
pnpm start:worker
# or
node apps/api/dist/worker.js
```

Alternatively trigger via cron HTTP (with `x-cron-secret`):
- `POST /api/v1/notifications/process`
- `POST /api/v1/maintenance/run-reminders`
- `POST /api/v1/campaigns/run`

---

## 11. PM2 (recommended)

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Reload after deploy: `pnpm pm2:reload` or `pm2 reload ecosystem.config.cjs`.

---

## 12–14. Domain, SSL, DNS

1. Cloudflare DNS: `A`/`CNAME` → Hostinger (proxied).
2. SSL via Cloudflare Full (strict) + Hostinger certificate or Cloudflare origin cert.
3. Optional `api.` subdomain pointing to API process.

---

## 15. Deployment checklist

- [ ] Prisma provider = `mysql`, migrations committed
- [ ] `COOKIE_SECURE=true`, strong secrets
- [ ] Cloudinary live; local uploads disabled
- [ ] Email/SMS providers live (or console only for soft launch)
- [ ] Demo login copy removed from UI (prod)
- [ ] Seed passwords rotated / seed not run on prod
- [ ] Health `GET /api/v1/health` OK
- [ ] Login, AI assess, book, track, portal, staff intake smoke-tested
- [ ] Worker running; test notification outbox
- [ ] Cloudflare cache bypass for app routes
- [ ] Backups scheduled

---

## 16. Rollback strategy

1. Keep previous PM2 release folder / git tag.
2. `git checkout <previous-tag>` → rebuild → `pm2 reload`.
3. Database: restore latest MySQL dump before migrate; never “down” destructive migrations without backup.
4. Cloudflare: quick purge if bad static assets.

---

## 17. Backup strategy

- Daily automated MySQL dumps (Hostinger + offsite copy)
- Weekly restore drill
- Cloudinary is media only — not a DB backup

---

## 18. Monitoring

- Uptime on `/` and `/api/v1/health`
- PM2 process status / memory
- Disk for logs

---

## 19. Error tracking

Set `SENTRY_DSN` when ready (hook reserved in config). Until then: PM2 logs under `./logs/`.

---

## 20. Production verification checklist

| Flow | Pass? |
|------|-------|
| Customer register / login / password reset | |
| AI assess → lead → report email | |
| Book inspection → CRM status | |
| Staff intake → Tracking ID notify | |
| Stage change → customer email/SMS | |
| Portal repairs / invoices / support | |
| Delivery → campaign enroll | |
| Maintenance reminder cron | |
| Settings / price bands | |

---

## Scores (post-audit hardening — Aug 2026)

| Dimension | Score | Notes |
|-----------|------:|-------|
| **Production readiness** | **8.3 / 10** | Journey + CRM + portal + worker + PM2 + CI + Hostinger build script; MySQL switch still operator-executed |
| **Security** | **8.4 / 10** | Rate limits (auth/AI/book/track), sanitized AI, cookie secure prod default, ownership checks, helmet, seed blocked in production, security headers on Next |
| **Performance** | **7.8 / 10** | Standalone + compress + remote image allowlist + Cloudflare guidance; more list pagination still incremental |
| **Scalability** | **7.2 / 10** | Modular monorepo + separate worker; single-tenant schema-ready orgs |
| **UI/UX** | **8.0 / 10** | Marketing pages, 404/error/loading skeletons, mobile nav overflow fix; staff UI remains operational |
| **Deployment** | **8.5 / 10** | `ecosystem.config.cjs`, `scripts/hostinger-build.sh`, `docs/MYSQL_MIGRATION_PLAN.md`, full guide |

### Ready for production?

**Conditional GO** for a **single-shop Cars Compound** launch after completing the **remaining blockers** below.

### Remaining blockers (must complete on the live environment)

1. **MySQL:** change Prisma `provider` to `mysql`, generate + commit migrations, run `pnpm db:migrate:deploy` — see [`MYSQL_MIGRATION_PLAN.md`](./MYSQL_MIGRATION_PLAN.md)  
2. **Secrets:** set production `JWT_SECRET`, `CRON_SECRET`, `COOKIE_SECURE=true`, Cloudinary, Resend/Twilio as needed  
3. **Processes:** run **API + Worker + Web** (PM2 recommended via `ecosystem.config.cjs`)  
4. **Do not seed production** with demo passwords (seed now refuses `NODE_ENV=production`)  
5. **Smoke-test** the verification checklist in section 20  

Related docs: [`DEPLOY.md`](./DEPLOY.md) · [`MYSQL_MIGRATION_PLAN.md`](./MYSQL_MIGRATION_PLAN.md) · root `ecosystem.config.cjs` · `scripts/hostinger-build.sh`
