# Cars Compound — Design Documentation Index

This folder contains the complete design baseline for the Cars Compound Smart Customer Experience & Vehicle Management System.

**Status:** Design documentation only. No production code should be modified until these artifacts are reviewed and approved.

| Document | Description |
|----------|-------------|
| [01 — Software Design Document](./01-Software-Design-Document.md) | Goals, architecture, modules, NFRs, risks |
| [02 — Database ERD](./02-Database-ERD.md) | Entity relationship diagrams + entity catalog |
| [03 — API Specification](./03-API-Specification.md) | REST `/api/v1` contracts, auth, errors |
| [04 — Folder Structure](./04-Folder-Structure.md) | Monorepo layout and module boundaries |
| [05 — Authentication Flow](./05-Authentication-Flow.md) | Login modes, JWT cookie, RBAC |
| [06 — Deployment Architecture](./06-Deployment-Architecture.md) | Hostinger + Cloudflare + processes |

Related product docs (non-SDD):
- [PRODUCTION_READINESS_REPORT.md](../PRODUCTION_READINESS_REPORT.md)
- [PRODUCT_OVERVIEW_UR.md](../PRODUCT_OVERVIEW_UR.md)
- [REQUIREMENTS.md](../REQUIREMENTS.md)
- [STACK.md](../STACK.md)
- [DEPLOY.md](../DEPLOY.md)

**Source of truth for schema:** `packages/db/prisma/schema.prisma`  
**Source of truth for routes:** `apps/api/src/modules/**/**.controller.ts`
