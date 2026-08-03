# Locked Technology Stack (v1)

## Hosting
- **App host:** Hostinger Node.js Hosting (API + worker + Next.js standalone or separate Node process)
- **Edge:** Cloudflare (DNS, TLS, CDN, WAF)
- **Do not use Vercel Hobby as primary compute** (AI timeouts + cron constraints)

## Database
- **Production (Hostinger):** MySQL 8 — set Prisma `provider = "mysql"` and Hostinger `DATABASE_URL`
- **Local default (no Docker):** SQLite file at `packages/db/dev.db` so the stack runs without MySQL installed
- Switch back to MySQL by restoring `@db.Text` / `@db.Decimal` annotations if desired and pointing `DATABASE_URL` at MySQL

## Environment Variables
See `.env.example` at repo root. Validated by `@cc/config`.

## Deploy Shape
1. `apps/api` — NestJS listens on `PORT` (Hostinger)
2. `apps/api` worker mode — `node dist/worker.js` for cron/outbox (same host or second process)
3. `apps/web` — Next.js `output: 'standalone'` behind same host or reverse proxy
4. Cloudflare proxies `carscompound.example.com` → origin
