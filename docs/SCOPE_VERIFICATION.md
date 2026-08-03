# Scope Verification — Cars Compound

**Date:** 2026-08-02  
**Rule:** Additive only — no architecture rewrite

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Core journey (assess → lead → book → intake → track → deliver → follow-up) | **Done** | Production path wired |
| Cars Compound branding | **Done** | Arrowhead = portal credit only |
| AI report + shop price bands + Report ID + email/SMS | **Done** | Low-confidence gate added in this pass |
| Lead CRM statuses | **Done** | Notes/assign UI improved this pass |
| Marketing multi-page site | **Added this pass** | Services, process, FAQ, contact |
| Customer portal depth | **Expanded this pass** | Vehicle filter, estimates/docs/invoices, maintenance, support |
| Password reset | **Added this pass** | Token + email flow |
| Support requests | **Added this pass** | Customer create + staff list |
| Internal vs customer notes | **Added this pass** | `visibleToCustomer` on stage events |
| Invoice ownership check | **Fixed this pass** | CUSTOMER scoped |
| Staff estimates/invoices UI | Partial | API exists; staff UI still lightweight |
| WhatsApp delivery | Stub only | Channel interface; not wired |
| Multi-tenant enforcement | Schema ready | Single-shop assumption |
| GitHub CI | **Added this pass** | Lint/build workflow |
| Hostinger / MySQL / Cloudflare / Cloudinary | Documented | See `docs/DEPLOY.md` |

## Explicitly deferred (architecture-safe future)

- Online payments, insurance claims, loyalty, fleet SaaS tenancy middleware, AI chatbot/voice receptionist  
- Full HTML email designer / SMS template admin  
- Real PDF binary generation (printable HTML + invoice JSON payload remain)

## Implemented in this verification pass

- Marketing pages: `/services`, `/process`, `/faq`, `/contact`
- AI low-confidence → `NEEDS_MORE_IMAGES` (no unreliable priced report)
- Portal: vehicle filter, vehicle history page, estimates/docs/invoices download, appointments, support tickets, logout
- Password reset + register UI
- Internal vs customer-visible stage notes
- Invoice customer ownership checks
- Lead CRM notes editor
- GitHub CI workflow
- Schema: `PasswordResetToken`, `SupportRequest`, `visibleToCustomer` on stage events
