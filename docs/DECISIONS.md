# EgyHealth 360 — Accepted Decisions

AI agents must not silently reverse these decisions.

## ADR-001 — Continuity of care is the core product focus
**Status:** Accepted

The project is not positioned as a generic all-in-one healthcare application.

Core differentiators:
- health timeline,
- care plans,
- follow-ups,
- care gaps,
- health trends,
- responsible AI-assisted risk assessment.

## ADR-002 — One frontend application
**Status:** Accepted

Use one Next.js application for all roles.

Reason:
Reduce duplication and simplify AI-driven maintenance.

## ADR-003 — Modular monolith
**Status:** Accepted

Use NestJS as a modular monolith.

Microservices are rejected for the current scope.

## ADR-004 — PostgreSQL
**Status:** Accepted

Primary database: PostgreSQL.

Reason:
Strong relational domain, transactions, constraints, indexing, integrity.

## ADR-005 — Separate AI prediction service
**Status:** Accepted

Use FastAPI/Python.

Rules:
- browser never calls FastAPI directly,
- FastAPI never directly accesses the main database,
- NestJS prepares inputs and persists outputs.

## ADR-006 — AI is decision support
**Status:** Accepted

AI must not automatically diagnose or prescribe treatment.

## ADR-007 — REST + OpenAPI
**Status:** Accepted

GraphQL is not required.

## ADR-008 — Server-side sessions initially
**Status:** Accepted

Use database-backed sessions and secure HttpOnly cookies for the web/PWA MVP.

## ADR-009 — Free-first / self-hostable
**Status:** Accepted

The core must work without paid services.

Priority:
1. local,
2. open source,
3. self-hostable,
4. free tier only when deployment requires it.

## ADR-010 — Monorepo
**Status:** Accepted

One repository contains web, API, AI, shared packages, and docs.

## ADR-011 — GitHub is the operational source of truth
**Status:** Accepted

Task state belongs in Issues, branches, PRs, and automated checks.

Do not rely on AI-agent conversation memory.

## ADR-012 — Pull Requests are handoff points
**Status:** Accepted

Do not maintain a permanent HANDOFF.md.

If an agent stops, the branch and PR must clearly state completed work and remaining work.

## ADR-013 — Timeline is initially derived from source records
**Status:** Accepted

Do not duplicate clinical source-of-truth data into a separate timeline table without a demonstrated need.

## ADR-014 — Preserve clinical history
**Status:** Accepted

Published clinical data must not be silently overwritten or hard-deleted.

## ADR-015 — Care-gap detection begins rule-based
**Status:** Accepted

Initial types:
- missed follow-up,
- pending lab test,
- unreviewed result.

## ADR-016 — Minimal infrastructure first
**Status:** Accepted

Do not add by default:
- Kubernetes
- Kafka
- RabbitMQ
- Redis
- BullMQ
- paid auth
- paid notification services
- paid AI APIs.
