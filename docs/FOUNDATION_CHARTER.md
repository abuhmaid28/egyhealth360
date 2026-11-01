# Foundation charter

Status: CURRENT AUTHORITATIVE — stable governance. Established by [issue #72, final authorization 6563757904](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6563757904). Mutable delivery state belongs in [CURRENT_STATUS](CURRENT_STATUS.md), not this charter.

## Authority and truth

1. Current explicit Product Owner authorization in GitHub defines executable scope. A newer authorization supersedes an older one only within its stated scope.
2. This charter and [AGENTS](../AGENTS.md) define stable governance/execution.
3. Accepted product, clinical, security and task contracts constrain behavior. Authorization to implement is not permission to silently change those contracts.
4. Current implementation, tests, schema and OpenAPI establish what actually exists; a conflict with an accepted contract is a defect to report, not implicit policy approval.
5. [CURRENT_STATUS](CURRENT_STATUS.md), [SOURCE_OF_TRUTH](SOURCE_OF_TRUTH.md) and current reference documents summarize that evidence.
6. Historical reports and superseded plans establish past evidence, not current authorization. Assumptions have no authority over these sources.

If authoritative sources conflict materially, document the exact conflict and request the missing owner decision. Ordinary implementation details within an approved contract remain autonomous.

## Preserve by default; audit honestly

Preserve accepted auth/session, CSRF/Origin/Fetch Metadata protections, clinical authority and `ClinicianPatientAssignment`, organizations/memberships, booking, consultation, documentation, FollowUpIntent and explicit consultation close. Preserve wrong-patient privacy, immutable history/provenance, operation-key/idempotency behavior, PostgreSQL concurrency protections, prescription lifecycle, pharmacy fulfillment, additive migrations/checksums, and accepted tests/runtime evidence.

Preservation does not grant immunity from audit. Report concrete defects with severity and evidence. Do not replace accepted foundations for architectural fashion. Major backend remediation requires a separately bounded authorization; an audit sprint records defects without changing runtime behavior.

Open to deliberate review/redesign: documentation structure and truth hierarchy, Product UX, information architecture, navigation, user-facing terminology, Arabic content, brand/logo/colors/typography, Design System, frontend/component architecture, and the V1 UI. Open to review does not mean authorized to finalize or implement.

## Decision boundary

Agents may choose ordinary implementation details inside an approved contract and complete reversible, authorized validation and fixes without repeated permission.

Explicit Product Owner approval is required for product scope, user journeys, information architecture/navigation, important patient/clinician terminology, final brand direction/logo/colors/typography/visual direction, final Design System, high-fidelity product prototypes, destructive or major architecture replacement, and clinical/security/privacy policy. An agent must surface an unspecified decision and its implications; it must not silently supply the final answer.

**NO IMPLEMENTATION FROM UNDEFINED PRODUCT OR DESIGN DECISIONS.**

Codex is an implementation engineer for final UI work; it does not own final product design. Future final UI implementation requires approved UX + Content System + Brand + Design System + high-fidelity prototype. CI Green proves technical validation. It does not prove Product correctness, UX, visual, branding or terminology quality.

## Ready, done, and milestone health gate

A milestone is ready only with an explicit authorized goal/scope, acceptance criteria, dependencies, relevant contracts, defined product/design behavior and major architecture decisions. Clinical rules additionally need an authoritative traceable source and interpretation. Listing a future milestone is not authorization.

A milestone is done only when its authorized deliverables and risk-appropriate technical validation pass, evidence matches the actual commit, relevant current documents are refreshed, and independent review is available. For implementation, include end-to-end behavior and negative authorization/privacy/history/concurrency proof as applicable. A docs-only sprint proves scope preservation and reference consistency. Required remote CI must succeed before a Green/review-ready claim. Do not merge without explicit authorization.

Every major milestone must independently pass Product correctness, UX/content fitness, Design System compliance where applicable, architecture fit, security/privacy/clinical authority, and technical CI/runtime gates. **Before authorizing the next major milestone, conduct a whole-project health review** covering:

- CURRENT_STATUS freshness, architecture and roadmap truth, documentation conflicts;
- technical debt, frontend structure, UX/content and Design System fitness;
- security/privacy/clinical authority, migration/data integrity;
- actual tests/CI/runtime evidence, deployment health and next-milestone readiness.

This applies through the remainder of I3, I4, I5/EACCE, research/evaluation and final release. P0 blocks continuation; P1 must be remediated before the next major phase; P2 belongs in its relevant phase; P3 is optional/later. A P0/P1 foundation defect requires a recommendation for **Stage 1.5 Foundation Remediation**, with separate authorization before execution. A Green docs PR does not approve UX or remediation.

## Future Product/Design approval process — document only

1. Product UX Foundation, then Information Architecture.
2. Content System and Arabic UX; explicit Product Owner UX/content approval.
3. Brand research, then **exactly three genuinely distinct visual/brand directions**.
4. Product Owner selects one, rejects all, or approves a fourth hybrid. Codex must not choose the winning direction.
5. Final Brand V2, then Design System V2; explicit owner approval of final choices. No Design System V2 finalization before direction approval.
6. High-fidelity Patient + Clinician prototypes; explicit Product Owner final visual approval.
7. Frontend Architecture V2, then frontend implementation, Visual QA against the approved prototype, and preserved before/after evidence.

The three directions must differ in personality, layout language, hierarchy, color and typography approach, icon/illustration language, component styling, patient experience and clinician workspace feeling. Three palettes on the same layout do not qualify. Each must demonstrate a logo concept, palette, typography, navigation, buttons/forms, Patient Home, Doctor Consultation workspace, Arabic sample and mobile sample.

No broad React/frontend implementation before owner visual approval. Existing UI is a **FUNCTIONAL V1 PROTOTYPE / BEFORE BASELINE**, not final approval; the current logo is not final. Preserve `docs/ui-screenshots/doctor-demo/` byte-for-byte. No automatic promotion of the protected final domain `egyhealth360.vercel.app`.

## Maintaining this operating system

Every delivery updates CURRENT_STATUS and affected current references in the same PR when truth changes. Link historical evidence instead of copying old mutable status paragraphs. SOURCE_OF_TRUTH classifies documents; accepted contracts retain their historical adoption context. Keep milestone reports at their paths and label obsolete instructions. At handoff verify current authorization, exact base/head, diff scope, CI and deployment claims. Do not convert “implemented,” “accepted,” “Live,” or “future” into interchangeable states.
