# Cars Compound — Smart Customer Experience System

Monorepo for the Cars Compound customer portal, staff operations dashboard, AI damage analyzer, repair tracking, maintenance automation, and follow-up campaigns.

## Stack (locked)

- **Host:** Hostinger Node.js + Cloudflare
- **Web:** Next.js 15 (`apps/web`)
- **API / Worker:** NestJS (`apps/api`)
- **DB:** MySQL 8 + Prisma (`packages/db`)
- **Storage:** Cloudinary (local fallback in dev)
- **AI:** `@cc/ai` orchestrator (mock / OpenAI Vision)
- **Notifications:** DB outbox + email/SMS adapters

See [docs/STACK.md](docs/STACK.md), [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md), and the full design pack: **[docs/SDD/README.md](docs/SDD/README.md)** (SDD, ERD, API, auth, deploy).

## Quick start

```bash
# 1) Install
pnpm install

# 2) Env
cp .env.example .env
# Edit DATABASE_URL if needed (SQLite local default lives in packages/db/.env)

# 3) Database (SQLite local — no Docker required)
pnpm db:generate
pnpm db:push
pnpm db:seed

# Optional MySQL via Docker when available:
# docker compose up -d
# (then switch Prisma provider to mysql + DATABASE_URL)

# 4) Run API + Web (separate terminals)
pnpm --filter @cc/api dev
pnpm --filter @cc/web dev

# 5) Optional worker (cron / outbox)
pnpm worker
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health

### Seed logins

| User | Email | Password |
|------|-------|----------|
| Admin | admin@carscompound.local | ChangeMe123! |
| Manager | manager@carscompound.local | ChangeMe123! |
| Customer | customer@example.com | ChangeMe123! |

## Workspace layout

```text
apps/web          Customer + staff UI
apps/api          NestJS API + worker
packages/domain   Stage machine & pure rules
packages/ai       Channel-agnostic AI brain
packages/notifications  Email/SMS ports + templates
packages/db       Prisma schema & seed
packages/config   Zod env validation
packages/ui       Shared UI primitives
```

## Hostinger deploy (summary)

1. Provision MySQL and set `DATABASE_URL`.
2. Build: `pnpm install && pnpm build`.
3. Run migrations: `pnpm db:push` (or migrate deploy).
4. Start API (`node apps/api/dist/main.js`) and worker (`node apps/api/dist/worker.js`).
5. Start Next standalone or `next start`.
6. Put Cloudflare in front; set secrets in Hostinger env panel.

Full checklist: [docs/DEPLOY.md](docs/DEPLOY.md) · **[docs/PRODUCTION_DEPLOYMENT_GUIDE.md](docs/PRODUCTION_DEPLOYMENT_GUIDE.md)**

## Production note

Local demo passwords exist **only for development seed**. Never expose them in the production UI. Rotate all seeded accounts before go-live.
