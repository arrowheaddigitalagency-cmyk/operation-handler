# Hostinger Deployment Validation — Cars Compound

**Date:** 2026-08-03  
**Based on:** actual process model in `ecosystem.config.cjs`, `apps/api` (Nest HTTP + Worker), `apps/web` (Next standalone), and Hostinger’s published Node.js Web App rules.

---

## Clear answer first

### Can this project be deployed exactly as it is (3 processes + PM2) on Shared?

**No** — Shared cannot run the continuous Worker or PM2.

### Can this project be adapted to Shared without redesigning business logic?

**Yes.** Deploy Web + API as two Node.js Web Apps; replace the Worker with Hostinger Cron hitting the existing secured HTTP endpoints. Full steps: [`HOSTINGER_SHARED_DEPLOYMENT.md`](./HOSTINGER_SHARED_DEPLOYMENT.md).

VPS remains optional (simpler ops / PM2), not mandatory.

---

## This project’s real runtime requirements

| Process | Entry point | Listens on HTTP? | Must stay running? | Why |
|---------|-------------|------------------|--------------------|-----|
| **Web** | Next.js standalone `server.js` | Yes (port 3000 / assigned) | Yes | SSR UI, rewrites `/api/v1` |
| **API** | `apps/api/dist/main.js` | Yes (`PORT`, e.g. 4000) | Yes | REST, auth, AI, CRM, uploads |
| **Worker** | `apps/api/dist/worker.js` | **No** | Yes | `node-cron`: outbox every 1m, maintenance hourly, campaigns every 30m |

Also required:

- **MySQL 8** (production; local SQLite is not for go-live)
- **Cloudinary** (media in production)
- **pnpm monorepo build** (`@cc/domain`, `@cc/db`, Nest, Next)
- Optional providers: Resend, Twilio, OpenAI

Designed process count: **3 Node.js processes** (+ MySQL as a separate service).

---

## Option 1 — Hostinger Shared Node.js Hosting (Business / Cloud)

Hostinger’s official Node.js Web Apps product (Business + Cloud plans):

- Supports **Next.js** and **NestJS** as managed websites
- Node versions **18 / 20 / 22 / 24**
- Deploy via GitHub or zip; **npm build runs in hPanel** (not free SSH/PM2)
- One **entry file** per website that starts a **server process**
- Restart from dashboard; **no PM2**
- Multiple websites per plan (plan-dependent), but each is a separate app lifecycle

### Capability matrix (Shared)

| Question | Answer |
|----------|--------|
| Can Next.js Web run? | **Yes**, as one Node.js website (Next.js type). |
| Can NestJS API run? | **Yes**, as a **second** Node.js website (NestJS / Other), on another domain/subdomain. |
| Can the Worker run continuously? | **No (as designed).** Worker does **not** bind an HTTP port. Shared Node apps expect a long-lived **HTTP server**. A bare `worker.js` cron loop is not a valid Shared “website” entry. |
| Can PM2 be used? | **No.** Managed process only; no root/PM2 on Shared. |
| How many Node processes required? | Architecture needs **3**. Shared can host **2** HTTP apps (Web + API) at best; worker must be **replaced** by cron HTTP calls. |
| Can all services run on the same Shared plan? | Web + API possible as **two websites**. Continuous worker **cannot**. MySQL can be Hostinger MySQL on the same account. |
| Limitations | No PM2; no multi-process control; monorepo/pnpm awkward; no localhost between apps (must use public URLs); worker must become external/system cron; RAM/CPU shared and capped; crash recovery is manual Restart in hPanel. |
| Changes required | Split deploy (2 apps), custom build for monorepo, set `API_URL` to public API URL, disable continuous worker, schedule cron against `/notifications/process`, `/maintenance/run-reminders`, `/campaigns/run` with `x-cron-secret`. |

### Verdict on Shared

**Insufficient for production “as designed.”**  
Acceptable only as a **degraded** setup after redesigning ops (not architecture of modules)—and still fragile.

---

## Option 2 — Hostinger VPS (Linux)

Full root SSH, install Node/pnpm/PM2/Nginx yourself.

### Capability matrix (VPS)

| Question | Answer |
|----------|--------|
| Can Next.js Web run? | **Yes** (standalone + Nginx reverse proxy). |
| Can NestJS API run? | **Yes** (`dist/main.js`). |
| Can the Worker run continuously? | **Yes** (`dist/worker.js` under PM2, no HTTP port needed). |
| Can PM2 be used? | **Yes** (`ecosystem.config.cjs` already in repo). |
| How many Node processes? | **3** (web, api, worker). |
| Can all services run on same server? | **Yes** — Web + API + Worker + Nginx; MySQL on same VPS **or** Hostinger managed MySQL. |
| Limitations | You operate the server (updates, firewall, backups). Not “one-click” like Shared. |
| Changes required | Switch Prisma to MySQL + migrate; set production env; build; PM2 + Nginx + SSL. **No application redesign.** |

### Verdict on VPS

**This is the correct Hostinger target** for Cars Compound.

---

## Recommendation

**Choose Hostinger VPS (Linux).**

Do **not** use Shared Node.js Hosting as the primary production host for this monorepo in its current form.

### Minimum VPS specification

For a **single-shop** production launch (moderate traffic):

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 vCPU | 2–4 vCPU |
| **RAM** | **4 GB** | **8 GB** if AI + concurrent staff/customers |
| **Storage** | **50 GB NVMe** | 80–100 GB |
| **OS** | Ubuntu 22.04 or 24.04 LTS | Same |
| **Swap** | 2 GB | 2–4 GB |

**Why 4 GB minimum:** Next standalone (~300–600 MB) + Nest API (~200–400 MB) + Worker (Nest context ~150–300 MB) + MySQL if local (~300–800 MB) + OS/Nginx easily exceeds 2 GB under load. Hostinger’s smaller 1–2 GB VPS tiers will OOM or thrash.

If MySQL is **external** (Hostinger MySQL on another product), **4 GB RAM** is still the safe minimum for the three Node processes.

---

## Comparison summary

| Criterion | Shared Node.js | VPS Linux |
|-----------|----------------|-----------|
| Matches `ecosystem.config.cjs` | No | Yes |
| Continuous worker | No | Yes |
| PM2 | No | Yes |
| Monorepo build control | Poor | Full |
| Production readiness for this app | Not as-is | Yes |
| Ops complexity | Lower (but wrong shape) | Medium (correct shape) |

---

# Complete deployment guide — Hostinger VPS (chosen)

Follow this for go-live. Architecture unchanged.

---

## 1. GitHub repository setup

```bash
cd "d:/Projects/Operation Handler"
git init
git add .
git status   # confirm .env is NOT listed
git commit -m "chore: production Cars Compound for Hostinger VPS"
git branch -M main
git remote add origin https://github.com/<ORG>/cars-compound.git
git push -u origin main
```

Protect `main`; enable `.github/workflows/ci.yml`.

---

## 2. Server preparation

```bash
# SSH as root
apt update && apt upgrade -y
apt install -y curl git build-essential nginx ufw fail2ban
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Create deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

---

## 3. Node.js installation / version

Project `engines`: **Node >= 20**. Use **20 LTS or 22 LTS**.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x
npm i -g pnpm@9 pm2
```

---

## 4. MySQL database creation

**Option A — MySQL on the same VPS**

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE cars_compound CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'cc_app'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';"
sudo mysql -e "GRANT ALL ON cars_compound.* TO 'cc_app'@'localhost'; FLUSH PRIVILEGES;"
```

`DATABASE_URL`:

```text
mysql://cc_app:STRONG_PASSWORD@127.0.0.1:3306/cars_compound?connection_limit=5
```

**Option B — Hostinger managed MySQL**  
Create DB in hPanel; use host/user/password Hostinger provides (often remote host, not `localhost`).

Then in `packages/db/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

See also `docs/MYSQL_MIGRATION_PLAN.md`.

---

## 5. Environment variables

On the VPS, create `/home/deploy/cars-compound/.env` (never commit):

```bash
NODE_ENV=production
APP_NAME=Cars Compound
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
COOKIE_SECURE=true
JWT_SECRET=<32+_random_chars>
JWT_EXPIRES_IN=7d
CRON_SECRET=<16+_random_chars>
DATABASE_URL=mysql://...
PORT=4000

STORAGE_LOCAL_FALLBACK=false
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=cars-compound

AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_VISION_MODEL=gpt-4o-mini

EMAIL_PROVIDER=resend
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com

SMS_PROVIDER=console
# or twilio: SMS_PROVIDER=twilio + SID/TOKEN/FROM

ENABLE_WORKER=true
SENTRY_DSN=
```

---

## 6. Prisma migration commands

```bash
cd ~/cars-compound
git clone https://github.com/<ORG>/cars-compound.git .
# ensure provider=mysql in schema.prisma
pnpm install --frozen-lockfile
pnpm db:generate

# First time (dev machine or once against empty MySQL):
# pnpm --filter @cc/db exec prisma migrate dev --name init_mysql
# commit migrations/

# On server:
pnpm db:migrate:deploy
```

**Do not** `db:seed` on production (seed refuses `NODE_ENV=production`). Create the first admin manually or via a secure one-off script.

---

## 7. Build commands

```bash
cd ~/cars-compound
bash scripts/hostinger-build.sh
# or:
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
# copy Next static into standalone (script does this)
```

Verify:

- `apps/api/dist/main.js`
- `apps/api/dist/worker.js`
- `apps/web/.next/standalone/.../server.js`

---

## 8. PM2 configuration

Repo already has `ecosystem.config.cjs`.

```bash
mkdir -p ~/cars-compound/logs
cd ~/cars-compound
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# run the command PM2 prints
```

---

## 9. Reverse proxy (Nginx) — required

Web on 3000, API on 4000; public HTTPS on 443.

`/etc/nginx/sites-available/cars-compound`:

```nginx
server {
  listen 80;
  server_name yourdomain.com www.yourdomain.com;

  location /api/v1/ {
    proxy_pass http://127.0.0.1:4000/api/v1/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cars-compound /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Set `APP_URL` / `API_URL` / `CORS_ORIGINS` to `https://yourdomain.com` so Next rewrites and cookies work behind the proxy.

---

## 10. SSL setup

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Renewal is automatic via certbot timer.

If Cloudflare proxies orange-cloud, set Cloudflare SSL to **Full (strict)**.

---

## 11. Cloudflare DNS configuration

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | VPS public IP | Proxied |
| A or CNAME | `www` | `@` or IP | Proxied |

SSL/TLS: **Full (strict)**  
WAF: managed rules on  
Cache: cache `/_next/static/*`; **bypass** `/api/*`, `/portal`, `/staff`, `/login`, `/assess`, `/book`

---

## 12. Cloudinary configuration

1. Create Cloudinary account + folder `cars-compound`
2. Set `CLOUDINARY_*` in `.env`
3. `STORAGE_LOCAL_FALLBACK=false`
4. Upload a repair photo from staff; confirm HTTPS Cloudinary URL

---

## 13. Email provider configuration

1. Create Resend (or keep `console` only for staging)
2. Verify sending domain DNS (SPF/DKIM)
3. `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`
4. Trigger AI report or appointment book; confirm outbox → Resend via worker

---

## 14. AI provider configuration

1. OpenAI API key with Vision access
2. `AI_PROVIDER=openai`, `OPENAI_API_KEY`, model e.g. `gpt-4o-mini`
3. Test `/assess` with ≥2 images (low confidence path with 1 image in mock)

---

## 15. Start commands

```bash
cd ~/cars-compound
pm2 start ecosystem.config.cjs
```

Manual (debug only):

```bash
pnpm start:api
pnpm start:worker
# web via standalone:
HOSTNAME=0.0.0.0 PORT=3000 node apps/web/.next/standalone/apps/web/server.js
# (exact standalone path depends on Next monorepo output — verify after build)
```

---

## 16. Restart commands

```bash
pm2 reload ecosystem.config.cjs
# or
pm2 restart cc-api cc-worker cc-web
```

After git pull + rebuild:

```bash
git pull
bash scripts/hostinger-build.sh
pnpm db:migrate:deploy
pm2 reload ecosystem.config.cjs
```

---

## 17. Log monitoring

```bash
pm2 logs
pm2 logs cc-api
pm2 logs cc-worker
pm2 logs cc-web
ls -la ~/cars-compound/logs
sudo journalctl -u nginx -f
```

Health:

```bash
curl -s https://yourdomain.com/api/v1/health
```

---

## 18. Backup strategy

- **Daily** `mysqldump` of `cars_compound` to offsite storage
- Weekly restore drill on a staging DB
- Git tags for each production release
- Cloudinary is **not** a database backup

Example cron (deploy user):

```bash
0 3 * * * mysqldump -u cc_app -p'…' cars_compound | gzip > ~/backups/cc-$(date +\%F).sql.gz
```

---

## 19. Rollback strategy

1. `git checkout <previous-tag>`
2. `bash scripts/hostinger-build.sh`
3. If DB migrated forward incompatibly: restore MySQL dump from before migrate
4. `pm2 reload ecosystem.config.cjs`
5. Cloudflare purge if static assets wrong

---

## 20. Production verification checklist

| Check | Pass? |
|-------|-------|
| `GET /api/v1/health` returns ok | |
| HTTPS valid (padlock) | |
| Login staff + customer | |
| Password reset email queued/sent | |
| AI assess → lead in `/staff/leads` | |
| Book inspection | |
| Intake → Tracking ID + notify | |
| Public `/track` | |
| Portal repairs / support | |
| Stage change → notification | |
| Worker logs show outbox ticks | |
| Cloudinary URL on photo | |
| Price bands / shop settings | |
| PM2 shows 3 online processes | |

---

## Final statement

**Can this project be deployed exactly as it is on Hostinger Shared Node.js Hosting, or is a VPS required?**

**A VPS is required** for deployment that matches this project as designed.

Shared Node.js Hosting **cannot** run the continuous Worker process as implemented (no HTTP listen + no PM2), and cannot host the three-process monorepo cleanly “as is.” Use **Hostinger VPS Linux, minimum 2 vCPU / 4 GB RAM / 50 GB NVMe**, with Nginx + PM2 + MySQL, following the guide above.
