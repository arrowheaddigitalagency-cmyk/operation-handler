# Production Readiness Report

**Project:** Arrowhead Repair Operations Portal (Cars Compound deployment tenant)  
**Document ID:** CC-PRR-001  
**Version:** 1.0  
**Date:** 2026-08-02  
**Scope:** Review existing SDD/ERD/API design for production SaaS readiness — **no architecture rewrite**

---

## 1. Overall Architecture Score

| Dimension | Score ( /10) | Notes |
|-----------|--------------|-------|
| Modularity | 8.5 | Feature packages + Nest modules are sound |
| Hosting fitness | 8.0 | Hostinger-first matches workload |
| Data model | 7.5 | Tenancy stubs present; enforcement incomplete |
| Scalability path | 7.0 | Worker/outbox OK; needs queue under load |
| Security | 6.0 | Core JWT/RBAC present; rate limits/CSRF hardening missing |
| Ops readiness | 6.5 | Health exists; CI/CD, backups, monitoring incomplete |
| Multi-tenant SaaS | 6.0 | Org/Branch schema ready; middleware not enforced |
| **Overall** | **7.1 / 10** | Production-capable with listed action items |

**Verdict:** Architecture is **directionally production-ready**. Do not redesign. Close gaps below before public launch.

---

## 2. Hosting Recommendation

### Comparison

| Criterion | Hostinger Node.js | Vercel Hobby (Free) |
|-----------|-------------------|---------------------|
| Deployment | Git/FTP + Node process(es); PM2-like | `vercel deploy` git integration |
| Build | `pnpm build` on CI or server | Vercel build pipeline |
| Runtime | Persistent Node | Serverless functions |
| Background jobs | Native worker / system cron | External (Inngest/QStash) — often paid |
| AI multi-image | Long-running OK with async jobs | ~10s Hobby timeout — high risk |
| Image uploads | Proxy to Cloudinary/R2 | Must be external; no durable FS |
| File storage | Must NOT use local disk in prod | Blob/S3/Cloudinary only |
| DB connections | Persistent pool OK | Serverless → need pooled Neon/PlanetScale style |
| Cron | `node-cron` worker or OS cron | Limited Hobby cron |
| Memory | Plan-bound vertical | Per-invocation limits |
| Cold starts | Low (warm process) | Common on Hobby |
| Request limits | Host plan | Platform quotas |
| Scalability | Vertical first; split worker | Horizontal web; workers external |
| Performance | Good with CDN in front | Excellent edge for static; weak for AI/jobs |
| Cost | Predictable hosting + API usage | $0 host + many paid add-ons |

### Recommendation: **Hostinger Node.js (+ Cloudflare) — ONE architecture**

**Why:**
1. Repair tracking, campaigns, and outbox need **reliable scheduled work** without mandatory paid job platforms.  
2. AI damage analysis of multiple images needs **async processing budget** incompatible with Vercel Hobby timeouts as primary compute.  
3. Staff dashboards are chatty authenticated writes — classic API server fits better than fragmented serverless.  
4. Single-shop → multi-garage SaaS still fits vertical Node + worker split before horizontal rewrite.

**Vercel role (optional later):** marketing/static only — **not** primary API/worker.

---

## 3. Scalability Review

### Expected load
Hundreds concurrent users; thousands of customers/vehicles/repairs; large image corpus; multi-staff; future mobile/WhatsApp/voice.

### Bottlenecks (current design)
| Bottleneck | Impact | Improvement (keep architecture) |
|------------|--------|----------------------------------|
| In-process AI after upload | Memory spikes on API | Move Vision to worker job table (same outbox pattern) |
| SQLite in prod (if left) | Locking, no concurrency | **MySQL from production day one** |
| Unbounded list endpoints | Slow staff UI | Enforce `take`/`cursor` everywhere (partially present) |
| Local disk uploads | Lost on redeploy | Cloudinary/R2 only in prod |
| Single Node process | Cron blocks API under load | Dedicated worker process |
| No Redis | Limited caching/queues | Add Redis when >1 API instance |
| Org/Branch not filtered | Cross-tenant leak risk | Tenant middleware on all queries |

### Future channels (mobile / voice / WhatsApp)
**No rewrite needed** if clients stay on `/api/v1` and AI stays in `@cc/ai`. Add adapters only.

---

## 4. Database Review

### Strengths
- Clear aggregates (Customer → Vehicle → RepairCase)
- Indexes on `trackingId`, stages, outbox `(status, scheduledFor)`, reminders
- Soft deletes on Vehicle/RepairCase/media
- Org/Branch keys present

### Gaps
| Issue | Recommendation |
|-------|----------------|
| SQLite for local only | Keep for laptop DX; **never for production** |
| MySQL from day one in shared/staging/prod | Avoid last-minute provider switch pain |
| Cascade rules uneven | Explicit `onDelete` policy per relation (Restrict vs Cascade) |
| Ownership checks incomplete on some reads | Enforce customer scope on invoices/documents |
| Pagination inconsistent | Cursor pagination for repairs/customers/notifications |
| No composite tenant indexes | Add `(organizationId, createdAt)`, `(branchId, currentStage)` |
| JSON money on SQLite | Use Decimal + MySQL `@db.Decimal` in prod schema |

### SQLite vs MySQL
- **SQLite:** fine for solo local demo; file locking fails under concurrent staff + worker.  
- **MySQL day one (staging/prod):** matches Hostinger, concurrent writes, backups, SaaS tenancy.  
**Action:** Keep SQLite local; provision MySQL for staging immediately; document provider switch checklist (already in SDD).

---

## 5. Storage Review

| Option | Cost | CDN | Security | Scale | Hostinger ease |
|--------|------|-----|----------|-------|----------------|
| Local disk | Free | No | Weak | Poor | Easy but **unsafe in prod** |
| Cloudinary | Medium | Yes | Signed URLs, transforms | Excellent | Very easy |
| Cloudflare R2 | Low | With CF | Signed URLs DIY | Excellent | Good if already on CF |
| S3-compatible | Low–Med | CloudFront/CF | Mature | Excellent | More IAM setup |

### Recommendation: **Cloudinary (ONE solution for v1)**

**Why:** Already in architecture; image transforms/thumbnails; signed uploads; EXIF strip options; minimal Hostinger ops.  
**Later cost optimize:** migrate cold archive to **R2** via storage port (no redesign — swap adapter).

**Production rule:** `STORAGE_LOCAL_FALLBACK=false`.

---

## 6. Background Jobs Review

| Workload | Current | Best production shape |
|----------|---------|------------------------|
| Notifications | DB outbox + worker cron | **Keep DB outbox**; worker drain every minute |
| Maintenance | Hourly cron | Keep; add JobLock rows to prevent overlap |
| Campaigns | */30 cron | Keep; idempotency keys already |
| AI processing | Fire-and-forget in API | **Move to job row + worker** under load |

**Pattern recommendation:**  
**Worker process + DB-backed queue/outbox** (not Redis required at v1).  
If Hostinger allows only one process → **OS cron → secured HTTP** endpoints (`x-cron-secret`) as fallback (already designed).

**Avoid** embedding all cron inside the HTTP request path.

---

## 7. Performance Review

| Area | Status | Improvement |
|------|--------|-------------|
| SSR (Next) | Used | Cache public landing at Cloudflare; no-store for portal/staff |
| CDN | Planned | Cloudflare for `_next/static` + Cloudinary for media |
| DB | Indexed core paths | Add tenant composites; explain slow queries |
| Images | Cloudinary | Deliver thumbnails; lazy-load portal galleries |
| API | Sync lists | Always paginate; select only needed fields |
| Compression | Helmet only | Enable gzip/brotli at Cloudflare/origin |
| Streaming | Not needed v1 | Consider for large PDF later |
| Lazy loading | Partial UI | Standardize on portal history |

---

## 8. Security Review

| Control | Present | Gap |
|---------|---------|-----|
| JWT + httpOnly cookie | Yes | Also sessionStorage Bearer fallback for DX — prefer cookie-only in prod hardening |
| RBAC | Yes | Audit every new endpoint |
| Password hashing | bcrypt | OK; consider argon2 later |
| Zod validation | Yes | Ensure all bodies use parse helpers (500s from Zod fixed) |
| CSRF | SameSite=lax | Add CSRF token if cookie cross-site ever |
| XSS | React escape | Keep tokens out of localStorage long-term |
| SQLi | Prisma | OK |
| Rate limiting | Missing | **Add** on login, tracking login, AI upload |
| Uploads | MIME/size checks | Virus scan optional; block SVG |
| Secrets | Env | Rotate seed admin password; vault later |
| Audit logs | Partial | Cover stage changes already; expand auth failures |
| Cron secret | Header | Require TLS + IP allowlist if exposed |

---

## 9. Multi-Tenant Readiness

### Present
- `Organization`, `Branch` models  
- Users/repairs can carry `organizationId` / `branchId`

### Missing for SaaS (Garage A/B/C/D)
1. **Tenant context middleware** — resolve tenant from subdomain/JWT claim  
2. **Mandatory filters** on every Prisma query (`organizationId = ctx.orgId`)  
3. **Unique constraints per tenant** (e.g. tracking ID global OK; email may be global or per-org)  
4. **Seed per tenant** branding/config table (`TenantSettings`)  
5. **No cross-tenant Cloudinary folder isolation** — use `folder=org/{id}`  
6. **Admin superuser** vs tenant admin split  

**Score:** Schema-ready (~60%), enforcement-not-ready.  
**Do not rewrite** — add middleware + query scoping incrementally.

---

## 10. Deployment Readiness

| Item | Ready? |
|------|--------|
| Env schema (`@cc/config`) | Yes |
| Health endpoint | Yes |
| Worker entrypoint | Yes |
| Cloudflare guidance | Documented |
| CI/CD pipeline | **Missing** |
| Automated migrations | Manual — need `migrate deploy` in release |
| Staging environment | **Missing** |
| Backup/restore runbook | Partial in DEPLOY.md |
| Error tracking (Sentry) | Optional env only |
| Rate limiting | **Missing** |

---

## 11. Cost Optimization

| Lever | Guidance |
|-------|----------|
| Hosting | Hostinger Node/VPS sized to CPU; avoid overpaying for unused serverless glue |
| AI | Mock in staging; cache identical hashes; cap images/month per tenant |
| SMS | Transactional only; email for campaigns |
| Media | Cloudinary auto-quality; lifecycle delete after retention |
| DB | Single MySQL primary until read replica justified |
| Cloudflare | Free/Pro WAF enough initially |

---

## 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Local disk in prod | High | Disable fallback |
| SQLite left in prod | High | MySQL gate in deploy checklist |
| No rate limits | High | Edge + app limiters |
| Tenant data leak | High | Org middleware before multi-garage launch |
| AI liability | Medium | Disclaimer + human finalize (exists) |
| Single process Hostinger plan | Medium | Cron HTTP fallback |
| Seed passwords unchanged | Medium | Force rotate on deploy |

---

## 13. Missing Components (before production)

1. CI/CD (lint, test, build, migrate)  
2. Staging MySQL environment  
3. Rate limiting (login/AI/track)  
4. AI job queue (worker-side)  
5. Tenant query middleware  
6. Backup automation + restore drill  
7. Sentry (or equivalent) wired  
8. Uptime monitoring  
9. Log aggregation  
10. Load test of intake + stage updates  
11. Cookie-only auth hardening (drop sessionStorage in prod if possible)  
12. OpenAPI published for mobile team  

---

## 14. Final Recommendations

1. **Ship on Hostinger Node + Cloudflare + MySQL + Cloudinary + Worker** — do not pivot to Vercel Hobby for core.  
2. **Do not redesign** modules/packages; close security/ops/tenant gaps.  
3. **Keep SQLite for local only**; MySQL for staging/production from day one of go-live prep.  
4. **Cloudinary as sole prod storage** (R2 later via adapter).  
5. **DB outbox + worker** remains the correct job architecture for v1.  
6. **Multi-tenant:** enforce Org/Branch in middleware before onboarding Garage B.  

---

## 15. Action Items Before Production

### P0 — Blockers
- [ ] Provision Hostinger Node + MySQL; set production `DATABASE_URL`  
- [ ] Set Prisma provider to `mysql` for prod/staging schema  
- [ ] Configure Cloudinary; `STORAGE_LOCAL_FALLBACK=false`  
- [ ] Rotate `JWT_SECRET`, `CRON_SECRET`, admin passwords  
- [ ] `COOKIE_SECURE=true`, HTTPS via Cloudflare Full Strict  
- [ ] Run worker process **or** OS cron to secured endpoints  
- [ ] Add rate limits on `/auth/login`, `/auth/login/tracking`, `/ai/damage-analysis`  
- [ ] Verify login + cookie/Bearer path on production domain  

### P1 — Launch quality
- [ ] Staging environment mirroring prod  
- [ ] CI: install → generate → build → migrate deploy  
- [ ] Sentry + uptime checks on `/api/v1/health`  
- [ ] Daily MySQL backups + quarterly restore test  
- [ ] Pagination audit on all list APIs  
- [ ] Move AI processing fully onto worker jobs  

### P2 — SaaS expansion
- [ ] Tenant middleware + forced `organizationId` filters  
- [ ] Per-tenant Cloudinary folders  
- [ ] Branding/settings table for Garage B/C/D  
- [ ] Mobile client against `/api/v1`  
- [ ] WhatsApp/Voice adapters calling `@cc/ai` only  

---

## Production Deployment Checklist (summary)

**Environment:** all keys from `.env.example` filled for prod  
**Database:** MySQL migrated + seeded admin rotated  
**Storage:** Cloudinary verified upload/read  
**Cloudflare:** DNS, SSL, WAF, cache bypass for app routes  
**Processes:** Web + API + Worker (or cron fallback)  
**Backups:** automated + restore documented  
**Logging/Monitoring:** Pino retention + Sentry + uptime  
**Security:** rate limits, secrets, HTTPS, audit spot-check  
**DR:** backup restore procedure; prior release artifact kept  

---

*End of Production Readiness Report. Architecture retained; production gaps itemized.*
