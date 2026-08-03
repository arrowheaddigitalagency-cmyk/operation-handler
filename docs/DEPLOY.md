# Hostinger + Cloudflare Deployment

Canonical full guide: **[PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)**  
**Hosting validation (Shared vs VPS):** **[HOSTINGER_DEPLOYMENT_VALIDATION.md](./HOSTINGER_DEPLOYMENT_VALIDATION.md)** — **VPS required**; Shared Node.js is not sufficient as-is.

## Prerequisites
- Hostinger Node.js hosting (or VPS with PM2)
- MySQL 8 database
- Cloudflare DNS on the domain
- Cloudinary account (production media)
- Optional: Resend, Twilio, OpenAI, Sentry

## Build

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
```

## Process model (PM2)

See root `ecosystem.config.cjs`:

| Process | Script | Purpose |
|---------|--------|---------|
| `cc-api` | `apps/api/dist/main.js` | HTTP `/api/v1` |
| `cc-worker` | `apps/api/dist/worker.js` | Outbox, maintenance, campaigns |
| `cc-web` | Next standalone `server.js` | Customer/staff UI |

```bash
mkdir -p logs
pm2 start ecosystem.config.cjs
```

## Environment
Copy `.env.example` → Hostinger env. Required production changes:
- `NODE_ENV=production`
- `COOKIE_SECURE=true`
- `STORAGE_LOCAL_FALLBACK=false`
- Strong `JWT_SECRET` and `CRON_SECRET`
- MySQL `DATABASE_URL` + Prisma `provider = "mysql"`
- Real Cloudinary + email/SMS keys

## Prisma (production)

```bash
pnpm db:migrate:deploy
```

Do not use `db:push` once migrations are committed.

## Cloudflare
- Proxied A/CNAME to Hostinger
- SSL Full (strict)
- Cache static assets only; bypass `/api/*`, `/portal`, `/staff`, `/login`
- Enable WAF managed rules

## Health checks
- `GET /api/v1/health`
- UptimeRobot on web origin + API health

## Backups
- Daily MySQL dumps
- Cloudinary is not a DB backup
- Test restore quarterly
