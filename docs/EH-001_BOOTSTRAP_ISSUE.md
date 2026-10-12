# EH-001 — Historical Bootstrap Specification

**Status: SUPERSEDED / DO NOT IMPLEMENT**

This document is preserved only for history. The original EH-001 bootstrap required a FastAPI/Python AI service and belonged to the pre-reboot product architecture.

The current Core V1 architecture is defined by:
- `docs/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- the current replacement bootstrap GitHub Issue

Core V1 now uses:
- Next.js web app
- NestJS modular-monolith API
- PostgreSQL 18 + Prisma 7
- shared pure-TypeScript EACCE package
- TypeScript experiment worker
- FHIR R4 adapter
- no FastAPI/Python runtime
- no ML model in Core V1

Do not use the original EH-001 requirements as implementation instructions.
