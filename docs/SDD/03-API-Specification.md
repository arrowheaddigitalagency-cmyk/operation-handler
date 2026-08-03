# API Specification

**Document ID:** CC-SDD-003  
**Base URL:** `{API_ORIGIN}/api/v1`  
**Local:** `http://localhost:4000/api/v1`  
**Web proxy:** browser calls same-origin `/api/v1/*` (Next.js rewrite → API)

**Content-Type:** `application/json` unless multipart  
**Auth:** httpOnly cookie `cc_token` **or** `Authorization: Bearer <jwt>`

---

## 1. Conventions

### Auth markers
| Marker | Meaning |
|--------|---------|
| Public | No JWT required (`@Public`) |
| Auth | Valid JWT required |
| RBAC | Role list enforced via `@Roles` |

### Error shape (Nest default)
```json
{
  "statusCode": 401,
  "message": "Authentication required"
}
```

### Common status codes
| Code | When |
|------|------|
| 200 | Success |
| 201 | Created (where applicable) |
| 400 | Validation / business rule |
| 401 | Missing/invalid token |
| 403 | Role insufficient |
| 404 | Not found |
| 500 | Unhandled server error |

---

## 2. Health

### `GET /health` — Public
**Response**
```json
{ "ok": true, "service": "cars-compound-api", "ts": "ISO-8601" }
```

---

## 3. Auth

### `POST /auth/login` — Public
```json
{ "email": "string", "password": "string(min 8)" }
```
**Response:** `{ token, user: { id, email, role } }` + Set-Cookie `cc_token`

### `POST /auth/login/tracking` — Public
```json
{ "trackingId": "CC-XXXXXX", "phoneLast4": "dddd" }
```
Resolves repair → customer user; verifies phone last 4.

### `POST /auth/register` — Public
```json
{
  "email": "string",
  "password": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string?"
}
```
Creates `CUSTOMER` + `CustomerProfile`.

### `POST /auth/logout` — Auth
Clears `cc_token` cookie.

### `GET /auth/me` — Auth
Returns profile fields + `customerProfile.id` if present.

---

## 4. Customers — Staff

| Method | Path | Roles |
|--------|------|-------|
| GET | `/customers?q=&page=` | OWNER, ADMIN, MANAGER, RECEPTION |
| GET | `/customers/:id` | + TECHNICIAN |
| POST | `/customers` | OWNER, ADMIN, MANAGER, RECEPTION |

**POST body**
```json
{
  "email": "string",
  "password": "string?",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "notes": "string?"
}
```

---

## 5. Vehicles

| Method | Path | Roles |
|--------|------|-------|
| GET | `/vehicles?customerId=` | Staff + CUSTOMER (scoped) |
| GET | `/vehicles/:id` | Staff + owning CUSTOMER |
| POST | `/vehicles` | Staff + CUSTOMER |
| PATCH | `/vehicles/:id` | OWNER, ADMIN, MANAGER, RECEPTION |

**POST body**
```json
{
  "customerId": "string",
  "make": "string",
  "model": "string",
  "year": 2020,
  "vin": "string?",
  "registrationNumber": "string?",
  "engineType": "string?",
  "color": "string?",
  "mileage": 0,
  "paintCode": "string?"
}
```

---

## 6. Appointments

### `POST /appointments/book` — Public
```json
{
  "scheduledAt": "ISO-8601",
  "contactName": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "notes": "string?",
  "damageAnalysisId": "string?",
  "make": "string?",
  "model": "string?",
  "year": 2020
}
```
Side effects: create user/profile if needed; optional vehicle; enqueue confirmation email.

### `GET /appointments?status=` — Staff (OWNER, ADMIN, MANAGER, RECEPTION)

---

## 7. Repairs

| Method | Path | Access |
|--------|------|--------|
| GET | `/repairs` | Auth; CUSTOMER scoped to self |
| GET | `/repairs/track/:trackingId` | **Public** (limited fields) |
| GET | `/repairs/:id` | Auth; ownership/RBAC |
| POST | `/repairs/intake` | OWNER, ADMIN, MANAGER, RECEPTION |
| POST | `/repairs/:id/stage` | OWNER, ADMIN, MANAGER, TECHNICIAN, RECEPTION |
| POST | `/repairs/:id/photos` | same (multipart `file`) |

### Intake body
```json
{
  "customerId": "string",
  "vehicleId": "string",
  "appointmentId": "string?",
  "insuranceApplicable": false,
  "insuranceCompany": "string?",
  "damageType": "string?",
  "expectedCompletionAt": "ISO-8601?",
  "technicianId": "string?"
}
```
**Effects:** generate `trackingId` (`CC-XXXXXX`), stage RECEIVED event, enqueue notify, audit log.

### Stage body
```json
{
  "toStage": "PAINTING",
  "notes": "string?",
  "expectedCompletionAt": "ISO-8601?"
}
```
**Effects:** progress %, stage event, notifications; if `DELIVERED` → campaign enroll.

### Public track response (subset)
```json
{
  "trackingId": "CC-DEMO01",
  "currentStage": "BODY_REPAIR",
  "stageLabel": "Body Repair",
  "progressPercent": 46,
  "expectedCompletionAt": "ISO-8601?",
  "vehicle": { "make": "Honda", "model": "Civic", "year": 2021 },
  "stageEvents": []
}
```

---

## 8. Estimates

| Method | Path | Roles |
|--------|------|-------|
| POST | `/estimates` | OWNER, ADMIN, MANAGER, RECEPTION |
| POST | `/estimates/:id/finalize` | OWNER, ADMIN, MANAGER |

**Create body**
```json
{
  "repairCaseId": "string",
  "laborTotal": 0,
  "partsTotal": 0,
  "taxTotal": 0,
  "notes": "string?",
  "lineItems": []
}
```

---

## 9. Invoices

| Method | Path | Roles |
|--------|------|-------|
| POST | `/invoices` | OWNER, ADMIN, MANAGER |
| GET | `/invoices/:id` | Staff + CUSTOMER |
| GET | `/invoices/:id/pdf` | Staff + CUSTOMER (printable JSON payload) |

**Create body**
```json
{
  "repairCaseId": "string",
  "subtotal": 0,
  "taxTotal": 0,
  "lineItems": []
}
```

---

## 10. AI

| Method | Path | Access |
|--------|------|--------|
| GET | `/ai/disclaimer` | Public |
| POST | `/ai/damage-analysis` | Public multipart `images` (+ optional meta fields) |
| GET | `/ai/damage-analysis/:id` | Public poll |

**POST multipart fields:** `images` (files), optional `guestEmail`, `guestPhone`, `make`, `model`, `year`  
**Immediate response:** `{ id, status: "PROCESSING", disclaimer, pollUrl }`  
**Poll:** status `PROCESSING | COMPLETED | FAILED` + `resultJson` when done  

**Constraints:** max images/size from env (`AI_MAX_IMAGES`, `AI_MAX_IMAGE_MB`); MIME jpeg/png/webp.

---

## 11. Media

### `GET /media/local/:filename` — Public (dev fallback)
Serves files from local `uploads/` when Cloudinary not configured. Rejects path traversal.

---

## 12. Notifications / Maintenance / Campaigns (cron)

All require header: `x-cron-secret: {CRON_SECRET}` unless noted.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/notifications/process` | Drain outbox |
| POST | `/maintenance/schedule` | Auth+RBAC create reminder |
| POST | `/maintenance/run-reminders` | Cron due maintenance emails |
| POST | `/campaigns/run` | Cron campaign steps |

**Schedule body**
```json
{
  "vehicleId": "string",
  "ruleCode": "OIL_CHANGE",
  "lastServiceAt": "ISO-8601?",
  "currentMileage": 0
}
```

---

## 13. Reports

### `GET /reports/ops` — OWNER, ADMIN, MANAGER
```json
{
  "openRepairs": 0,
  "readyForPickup": 0,
  "deliveredThisMonth": 0,
  "pendingAppointments": 0,
  "pendingNotifications": 0,
  "byStage": []
}
```

---

## 14. Web routes (UI — not REST)

| Path | Audience |
|------|----------|
| `/` | Public landing |
| `/assess` | AI upload |
| `/book` | Inspection booking |
| `/track` | Public tracking |
| `/login` | Auth |
| `/portal`, `/portal/repairs/:id` | Customer |
| `/staff`, `/staff/intake` | Staff |

---

## 15. OpenAPI note

This document is the v1 contract. An OpenAPI 3.1 file may be generated later from Nest decorators; until then, this SDD section is authoritative for client work.
