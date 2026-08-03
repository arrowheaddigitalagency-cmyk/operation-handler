# Workflow Improvements — Pre-Implementation Spec

**Status:** Implemented (additive within existing SDD/API shape)  
**Rule:** No architecture rewrite — additive tables + modules only

---

## Gaps being filled

1. Cars Compound shop branding (Arrowhead only as “portal by …” credit)
2. AI assess → contact capture → priced report → downloadable report
3. Configurable repair price bands (AI detects damage; shop sets $ ranges)
4. Lead CRM for AI-generated leads
5. Secure report IDs + existing repair Tracking IDs hardened
6. Email after AI report + existing SMS/email after repair create
7. Staff: Lead → inspection booking → intake → stages → delivery
8. Lifecycle continuity (lead conversion fields)

---

## New / extended data

### 1. `ShopSettings` (1 row per Organization)
| Field | Purpose |
|-------|---------|
| organizationId | Tenant |
| shopName | e.g. Cars Compound |
| portalCredit | e.g. Portal by Arrowhead |
| supportEmail / supportPhone | Comms |
| reportFooter | Legal line on AI report |

### 2. `RepairPriceBand` (admin-configurable)
| Field | Purpose |
|-------|---------|
| partKey | Normalized part key (front_bumper, headlight, …) |
| severity | minor \| moderate \| severe |
| costMin / costMax | Shop price range |
| durationDaysMin / Max | Shop duration range |
| complexity | low \| medium \| high (optional default) |
| active | Soft enable |

**Pricing rule:** AI returns findings only → server maps each finding to a band → aggregates min/max cost & duration. AI never invents dollar amounts in production path.

### 3. `Lead` (CRM)
| Field | Purpose |
|-------|---------|
| status | NEW → CONTACTED → INSPECTION_SCHEDULED → CONVERTED → LOST |
| source | AI_ASSESS \| WEB_BOOK \| MANUAL |
| damageAnalysisId | Link to AI run |
| contactName/Email/Phone | Required for CRM |
| appointmentId / repairCaseId | Conversion links |
| assignedStaffId | Optional |
| notes | Staff notes |

### 4. `DamageAnalysis` extensions
| Field | Purpose |
|-------|---------|
| reportId | Public secure id `CC-RPT-XXXXXX` |
| pricedJson | Aggregated shop pricing result |
| contactName | Lead capture |

---

## Workflow states (Lead)

```
NEW → CONTACTED → INSPECTION_SCHEDULED → CONVERTED
                 ↘ LOST
```

Repair stages unchanged (existing stage machine).

---

## API additions (same `/api/v1` prefix)

- `GET/PATCH /settings/shop` (staff)
- `CRUD /settings/price-bands` (staff admin/manager)
- `POST /ai/damage-analysis` — require contact + apply pricing
- `GET /ai/damage-analysis/:id/report` — HTML printable report (Public with reportId)
- `GET /leads`, `PATCH /leads/:id` (staff CRM)
- Book/intake already exist; wire `damageAnalysisId` / `appointmentId` in staff UI

---

## Implemented customer journey

```
Visit site → AI assess (+ contact) → shop-priced report (CC-RPT-*) + email/SMS
  → Lead NEW in CRM → Book inspection → Lead INSPECTION_SCHEDULED
  → Staff intake → Tracking ID CC-* + notify → stage updates → DELIVERED
  → Post-delivery campaign (repeat lifecycle)
```

Staff tools: `/staff/leads`, `/staff/intake`, `/staff/settings` (price bands + branding).
