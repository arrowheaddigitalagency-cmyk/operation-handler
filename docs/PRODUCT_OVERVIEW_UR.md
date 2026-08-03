# Cars Compound — Product Overview (Urdu/Hindi + English)

Yeh document batata hai ke system mein **kya bana hai**, **kaun kya kar sakta hai**, aur **automation** kaise kaam karti hai.

---

## 1. Yeh system kya hai?

**Cars Compound Smart Customer Experience & Vehicle Management System** ek digital platform hai jo traditional auto body shop ko technology-driven service center banata hai.

Isme teen bade loops hain:

1. **Acquisition** — Website → AI damage photos → inspection book  
2. **Fulfillment** — Shop intake → repair stages → pickup / invoice / warranty  
3. **Retention** — Vehicle history + maintenance reminders + follow-up messages  

**Apps:**
- Public website (landing, AI assess, book, track)
- Customer Portal
- Staff / Admin Dashboard
- Backend API + background worker (notifications, reminders, campaigns)

---

## 2. Overall features (kya-kya functionality)

| Area | Features |
|------|----------|
| Public website | Hero landing, AI damage assessment CTA, book inspection, public tracking ID |
| AI Damage Analyzer | Multiple photos upload → damage summary, complexity, duration range, cost range (advisory only) |
| Appointments | Customer inspection booking; staff appointment list |
| Intake / Repair Order | Staff customer + vehicle select karke repair case + unique Tracking ID banata hai |
| Live Repair Tracking | Fixed stages (Received → … → Ready for Pickup → Delivered) + progress % + notes |
| Customer Portal | Garage (vehicles), active/past repairs, timeline, photos, invoices, warranty |
| Staff Dashboard | Ops stats, repair list, stage update, appointments, intake |
| Estimates | Draft estimate → Manager/Admin finalize |
| Invoices | Issue invoice + printable PDF payload |
| Vehicle History | Har repair vehicle ke digital record mein rehta hai |
| Maintenance automation | Oil/brakes/etc. rules → due reminders |
| Follow-up automation | Delivery ke baad Day 0/3/7/30/6mo/12mo emails |
| Notifications | Email + SMS outbox (console/Resend/Twilio) — idempotent |
| Media | Repair/AI photos (Cloudinary ya local uploads) |
| Reports | Open repairs, ready for pickup, delivered this month, pending appointments |

---

## 3. Roles — Admin / Staff vs Common User

### A) Staff / Admin roles

| Role | Kaun hai | Kya kar sakta hai |
|------|----------|-------------------|
| **OWNER / ADMIN** | Shop owner / full admin | Sab kuch: users/ops, reports, estimates finalize, stages, intake, invoices |
| **MANAGER** | Shop manager | Estimates finalize, technicians assign, stage override, invoices, customers/vehicles |
| **TECHNICIAN** | Body/paint tech | Assigned repairs par stage update, photos, notes |
| **RECEPTION** | Front desk | Customers/vehicles create, appointments, intake, notifications trigger |

**Staff Dashboard (`/staff`) se typical flow:**
1. Login (`admin@carscompound.local` / `ChangeMe123!`)
2. Appointments dekho
3. `/staff/intake` se Repair Order + Tracking ID banao
4. Stage change karo (Painting → Assembly, etc.) — customer ko auto notify queue hoti hai
5. Estimate/Invoice create (API / future UI polish)
6. Reports dekho (open / ready / delivered)

**Important:** Final estimate sirf **MANAGER / ADMIN / OWNER** finalize kar sakte hain. AI cost final quote nahi hai.

### B) Common user (Customer)

| Capability | Details |
|------------|---------|
| AI assessment | Bina login photos upload → advisory report → book inspection |
| Book inspection | Name/email/phone + optional vehicle |
| Track repair | Tracking ID se public status (bina full login) |
| Portal login | Email+password **ya** Tracking ID + phone last 4 digits |
| Portal | Apni vehicles, repair progress, history, invoices, warranty, photos |
| Support / book again | Appointment booking se |

Customer **stage change / invoice create / estimate finalize** nahi kar sakta — sirf dekhna + book karna.

---

## 4. Automation systems (auto kya chal raha hai)

| Automation | Trigger | Result |
|------------|---------|--------|
| **Repair status notify** | Staff stage change | Email (+ SMS if enabled) customer ko |
| **Notification outbox** | Worker har minute | Pending messages send (retry on fail) |
| **Post-delivery follow-up** | Stage = Delivered | Campaign enroll → Day 0, 3, 7 (Google Review), 30, 180, 365 |
| **Maintenance reminders** | Cron / scheduled | Oil change, brakes, alignment, battery, etc. due emails |
| **Seasonal campaign** | Seeded campaign | Detailing / protection promos (framework ready) |
| **AI analysis async** | Photo upload | Background process → COMPLETED result poll |

Worker start: `pnpm worker` (API host par cron jobs).

---

## 5. Repair stages (customer ko kya dikhta hai)

```
Vehicle Received
→ Inspection Completed
→ Insurance Approval (optional — skip if no insurance)
→ Parts Ordered → Parts Received
→ Body Repair → Painting → Drying & Finishing
→ Assembly → Quality Inspection → Road Test
→ Ready for Pickup → Delivered
```

Har stage par: status label, progress %, ETA, technician notes, optional photos.

---

## 6. Demo accounts (local)

| User | Email | Password |
|------|-------|----------|
| Admin | admin@carscompound.local | ChangeMe123! |
| Manager | manager@carscompound.local | ChangeMe123! |
| Tech | tech@carscompound.local | ChangeMe123! |
| Customer | customer@example.com | ChangeMe123! |

Public demo tracking: **`CC-DEMO01`** — phone last 4: **`0999`**

---

## 7. Important business rules

- AI estimate = **advisory only**; physical inspection ke baad final quote  
- Single shop v1 (multi-branch architecture ready via Organization/Branch)  
- Currency default USD; timezone `America/New_York` (configurable)  
- Photos soft-delete + retention policy (configurable months)  
- Marketing opt-out honor; transactional repair updates usually stay on  

---

## 8. Tech snapshot (short)

- Frontend: Next.js (Customer + Staff UI)  
- Backend: NestJS API `/api/v1`  
- DB: Prisma (local SQLite; Hostinger production → MySQL)  
- AI: separate `@cc/ai` brain (mock / OpenAI Vision)  
- Hosting target: Hostinger Node + Cloudflare  

Details: `docs/STACK.md`, `docs/DEPLOY.md`, `docs/REQUIREMENTS.md`

---

## 9. Recommended try-out order

1. Open http://localhost:3000 — landing  
2. `/assess` — AI damage (mock)  
3. `/book` — inspection request  
4. `/track` — `CC-DEMO01`  
5. `/login` as customer → `/portal`  
6. `/login` as admin → `/staff` → stage update  

---

*Document version: v1 aligned with implemented monorepo.*
