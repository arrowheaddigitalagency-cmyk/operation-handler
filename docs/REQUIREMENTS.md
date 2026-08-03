# Confirmed Business Requirements (v1 Defaults)

These defaults lock ambiguous proposal items so development can proceed. Change via env/config — not by rewriting domain code.

## Market & Locale
| Item | Decision |
|------|----------|
| Country | United States (single shop) |
| Currency | USD |
| Language | English only (i18n keys reserved for later) |
| Timezone | `America/New_York` (override via `APP_TIMEZONE`) |

## Roles & Permissions
| Role | Capabilities |
|------|----------------|
| `OWNER` / `ADMIN` | Full access, reports, user management |
| `MANAGER` | Finalize estimates, assign techs, override stages, invoices |
| `TECHNICIAN` | Update assigned repair stages, upload photos, notes |
| `RECEPTION` | Create customers/vehicles/appointments, intake, send notifications |
| `CUSTOMER` | Portal read, book appointments, upload damage photos, support requests |

**Estimate finalization:** `MANAGER` or `ADMIN` only.

## Insurance Workflow
- Stage `INSURANCE_APPROVAL` is **optional**.
- If `repairCase.insuranceApplicable === false`, stage machine skips it.
- No full claims module in v1 (future expansion).

## Tracking ID Login
- Format: `CC-XXXXXX` ( entropic alphanumeric).
- Login: Tracking ID **+ last 4 of phone** (PIN-style), rate-limited.
- Also: email + password for full portal access.

## Website
- This app **replaces** the digital customer journey surfaces (landing CTA, AI, portal, staff).
- Existing marketing site can deep-link to `/assess` and `/book`.

## Media & Privacy
- Photos retained **24 months** after case closure (configurable `MEDIA_RETENTION_MONTHS`).
- Soft-delete first; hard purge via scheduled job.
- EXIF stripped on ingest; private storage + signed URLs.
- AI images may be sent to Vision provider — disclosed in UI disclaimer.

## Volume Assumptions (sizing)
- ~200 AI analyses / month
- ~2,000 SMS / month
- Single branch, <50 concurrent staff sessions

## Warranty Rules (v1)
| Service type | Default warranty |
|--------------|------------------|
| Body / paint | 12 months |
| Parts (OEM) | Manufacturer or 12 months |
| Ceramic coating | As sold (e.g. 5 years) — stored on warranty record |
| Mechanical add-ons | 6 months |

## Reputation
- Google Review URL via `GOOGLE_REVIEW_URL` env.
- Day-7 follow-up campaign includes review CTA.

## Notifications
- Channels v1: Email (required), SMS (optional if Twilio configured).
- WhatsApp: port reserved, disabled until Meta approval.
- Customer opt-out honored for marketing; transactional repair updates remain on unless hard opt-out.

## SMS Provider
- Twilio (US). Swap via notifications adapter port.
