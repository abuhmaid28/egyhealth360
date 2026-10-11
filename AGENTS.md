# EgyHealth 360 — AI Agent Instructions

These instructions apply to every AI coding agent working on this repository.

## Before writing code

1. Read this file completely.
2. Read `docs/PRODUCT.md`.
3. Read `docs/ARCHITECTURE.md`.
4. Read the documentation relevant to the current task.
5. Read the current GitHub Issue completely.
6. Inspect the existing branch, code, tests, and Pull Request if one exists.
7. Do not restart work that is already implemented.

Before changing code, summarize:

- the current task,
- what already exists,
- what remains,
- risks or dependencies,
- your implementation plan.

## Source of truth

Use this priority order:

1. Accepted product and architecture decisions in this repository.
2. Current GitHub Issue requirements.
3. Existing tests and API contracts.
4. Existing implementation.
5. Agent assumptions only when the above do not define the behavior.

Do not silently redesign the project.

## Architecture rules

- Frontend: Next.js + TypeScript.
- Main backend: NestJS + TypeScript.
- Database: PostgreSQL.
- ORM baseline: Prisma 7 unless an explicit upgrade decision is approved.
- AI service: Python + FastAPI.
- Architecture: modular monolith + separate AI prediction service.
- API style: REST + OpenAPI.
- The browser must not call the AI service directly.
- The AI service must not access the main PostgreSQL database directly.
- NestJS owns business logic and persistence.
- Respect module ownership.
- Avoid circular dependencies.
- Do not introduce microservices unless explicitly approved.

## Free-first rule

Do not introduce a paid external dependency when a reasonable:

1. local,
2. open-source,
3. self-hostable,
4. or free-tier

solution can satisfy the requirement.

Any paid dependency requires explicit approval.

Do not add paid AI APIs to the product core.

## Security rules

- Never commit secrets.
- Never store plaintext passwords.
- Backend authorization is mandatory.
- Hiding a UI control is not authorization.
- Apply least-privilege access.
- Medical-data access must follow role and resource-level authorization.
- Validate important input on the backend.
- Do not expose unnecessary medical or authentication information in logs.
- Admin access does not automatically grant unrestricted clinical-data access.

## Healthcare and AI rules

- AI is clinical decision support, not diagnosis.
- Do not generate treatment automatically from model output.
- Do not fabricate missing medical data.
- If model inputs are insufficient, return an insufficient-data state.
- Preserve assessment history and model version.
- Published medical results must not be silently overwritten.
- Important clinical changes must remain auditable.

## Code quality

- Prefer simple, explicit solutions.
- Do not over-engineer.
- Reuse existing abstractions before adding new ones.
- Avoid unnecessary dependencies.
- Keep domain logic out of UI components.
- Preserve strict typing where applicable.
- Update tests for business-critical behavior.
- Update documentation only when a real architecture, product, or contract decision changes.

## Task workflow

For each task:

1. Work on the task branch.
2. Implement only the defined scope.
3. Run relevant linting, type checks, tests, and builds.
4. Review your own diff.
5. Do not mark the task complete while required checks fail.
6. Update the Pull Request with:
   - completed work,
   - remaining work,
   - checks/tests run,
   - known limitations,
   - next recommended step if incomplete.

If execution limits stop work, leave the branch and Pull Request in a state another AI agent can continue without restarting.

## Definition of Done

A feature is not done because the UI exists or because code compiles.

It is done only when:

- required behavior works end-to-end,
- authorization rules are respected,
- validation and error handling exist where required,
- relevant tests pass,
- builds/checks pass,
- no known blocker remains,
- documentation is updated when necessary.
