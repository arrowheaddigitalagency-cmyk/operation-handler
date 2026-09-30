# Damage Estimate — Updated Build Plan (free stack)

## Keep forever
- Do not break `/assess`, `/book`, or existing features
- Additive DB only (new tables)
- Secrets only in env; every key documented in `.env.example`
- After each step: typecheck/build + confirm `/assess` and `/book` still work
- When something is needed from you: **STOP** with a simple checklist (link + clicks + env name)

## Already done
- Package `@cc/damage-estimate` (NHTSA VIN, provider interfaces, mocks, pricing math, CIECA stub parser)
- Prisma models drafted + additive migration SQL reviewed
- Migration **applied** on local DB (this step)

## Build steps (in order)

### A. Database + Nest API core
1. Apply additive migration / `db push` (local)
2. Nest module `damage-estimate`: sessions, VIN decode, photo upload via existing `StorageService`, analyze hook, price, book→Appointment, version snapshots (AI / staff / priced)
3. Env keys in `@cc/config` + `.env.example`
4. Typecheck API + confirm `/assess` `/book` untouched

### B. Customer wizard UI
1. Route `/damage-estimate` + step components
2. Client image compress + size/type limits
3. Overlays, editable lines, OEM/AM/mixed, range+confidence, Sample data badge, booking, PDF
4. Nav links only

### C. Free pricing tables (staff-editable, CSV import)
1. Tables: PartsPrices, LaborTimes, PaintRules, ShopRates (or extend RateSettings)
2. Seed **labeled sample** rows; missing → show “data needed” (never invent silently)
3. Staff admin pages + CSV import

### D. ML training kit (you run Colab; I write scripts)
1. `ml/damage-model/` download/merge scripts (CarDD, Ultralytics carparts-seg, Roboflow, Kaggle)
2. Unified class lists → YOLO format
3. Google Colab notebook: train YOLO11 seg (parts + damage), export ONNX, print mAP in plain English
4. Severity from mask area % → light/medium/heavy + repair/replace thresholds (config)

### E. Python ML service
1. `apps/ml-service` FastAPI + ONNX Runtime inference
2. Nest `DamageProvider` calls ML service when `DAMAGE_PROVIDER=onnx`
3. Optional `DAMAGE_PROVIDER=gemini` free-tier vision fallback (needs your Gemini key)
4. Default remains `mock` until models exist so demo always works

### F. Benchmark (AI vs staff vs CCC)
1. Upload CCC PDF/EMS/BMS + photos
2. Run our estimate; line/total % diff; flag repair-vs-replace mismatches
3. One-click import CCC hours/prices into our tables

### G. Deploy guide for non-technical
1. `docs/DEPLOY_GUIDE.md` — Vercel web, Railway API + ML, free Postgres (Neon/Railway), ONNX upload, CORS, test checklist, later costs vs free

## Honest note on Railway
If your Railway **free trial already ended**, a second “free trial” account is against Railway rules and risky. Legitimate options: Railway Hobby (paid), or **Neon free Postgres** + Hostinger/Vercel for apps. The deploy guide will show **legal** paths only.
