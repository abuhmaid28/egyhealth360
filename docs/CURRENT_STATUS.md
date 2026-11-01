# Current status

CURRENT AUTHORITATIVE delivery snapshot for Foundation Reboot V2 Stage 0+1. Audited baseline main: **`eb61da263ce44db5ca71ffdfea6a87309c8e17ef`** (PR #71). This is a pinned implementation baseline, not a claim that main never advances. Recheck the remote at task start; the docs PR's eventual merge changes main without changing this runtime baseline.

## Product and accepted implementation

EgyHealth 360 is a synthetic graduation healthcare platform connecting patient access, discovery, booking, consultation, prescriptions, diagnostics, pharmacy and follow-up, with later longitudinal continuity and bounded explainable HTN research. Five workspaces share one platform: Patient, Clinician, Pharmacy, Laboratory and Admin. Scope approval is not delivery approval.

**Accepted complete:** M0, M1, M2, V3-G0, V3-I1, V3-I2, the V3-I3 contract, I3 Slice 1 (medication catalog + prescription source lifecycle), I3 Slice 2 (pharmacy routing + full-item dispensing). **Overall I3 is incomplete.** [Roadmap and completion evidence](IMPLEMENTATION_ROADMAP.md).

**Implemented on baseline main:** identity/session/security; organizations/memberships, patient entry, public directory, bilateral relationships; finite availability, booking, consultation, private documentation/explicit summary release, FollowUpIntent and explicit close; prescription/catalog and pharmacy fulfillment. M2 retains exact-pinned planning/evidence/INITIAL actions without EACCE. There are **63 Prisma models, 22 migrations, 82 OpenAPI paths**. [Architecture](ARCHITECTURE.md), [data inventory](DATA_MODEL.md), [API](API.md).

## Live versus merged

Pre-final deployment: **Browser → Vercel Next.js → same-origin `/api/v1` rewrite → Vercel NestJS API → Neon PostgreSQL 18**. Stable [Live frontend](https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app/) and [API health](https://egyhealth360-pre-final-api-abuhmaid2810gmailcoms-projects.vercel.app/api/v1/health).

The hosted I2 journey is evidenced: login → availability → booking → consultation → drafts/context recovery → separate summary/follow-up releases → Review & Close → CLOSED/CONSULTED, with EN/AR/RTL checks. [Hosted evidence](PRE_FINAL_DOCTOR_DEMO_UI.md). Both pre-final deployments were observed READY and direct/proxied API health returned 200 during this audit. The deployment API exposes no source SHA for these deployments; exact-main deployment parity is **not verified**. The staging migration evidence ends at 20. Do not claim I3 is hosted or migrations 21/22 are applied there.

The frontend has separate explicit Demo and Live adapters; Live failures stay Live. Pharmacy/Laboratory and unintegrated surfaces remain Demo/unsupported, regardless of the merged pharmacy backend. The current UI is **FUNCTIONAL V1 PROTOTYPE / BEFORE BASELINE**. The current logo, colors, typography and Design System are not final product approval.

**Protected final domain: `egyhealth360.vercel.app`.** It is reserved; no promotion, alias, DNS or deployment change is authorized here. Current hosting is pre-final/synthetic, not production healthcare.

## Active, paused and next

Active issue: [#72](https://github.com/abuhmaid28/egyhealth360/issues/72). **Current authorization: [6563757904](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6563757904)**. Earlier comment **6563631251 is SUPERSEDED**. Only Foundation Reboot V2 Stage 0+1 governance/documentation/audit is authorized. Its deliverables are proposed for independent review in one open, unmerged PR, auto-merge off; this snapshot does not assert owner acceptance of the reboot.

**Health verdict: B — HEALTHY WITH NON-BLOCKING DEBT. Stage 1.5 is not required by the observed foundation findings.** [Audit, severity register and limits](FOUNDATION_REBOOT_V2_AUDIT.md). No concrete P0/P1 foundation defect was found; review may amend that verdict. No backend rewrite or frontend restructuring is authorized by it.

**Paused / not authorized:** I3 Slice 3 Lab Order, Slice 4 Lab Results, Slice 5 Integrated Exit, I4, I5/EACCE, AI inference, production/final-domain promotion; UI redesign, logo/brand/Design System implementation. A contract describing future Lab behavior is not Lab execution authorization.

**Next authorized action:** independently review Stage 0+1 and its exact-head CI. After acceptance, the Product Owner may separately authorize Product UX/IA and Content/Arabic UX. If independent review identifies P0/P1 foundation debt, authorize a bounded Stage 1.5 before Product UX. Neither route starts automatically. [Future sequence and owner gates](FOUNDATION_CHARTER.md#future-productdesign-approval-process--document-only).

## Fast reading path and truth maintenance

1. [AGENTS](../AGENTS.md), then current GitHub authorization above.
2. This file.
3. [Stable charter](FOUNDATION_CHARTER.md) + [source classification index](SOURCE_OF_TRUTH.md).
4. Relevant contracts/current references, then implementation/tests.

[PROJECT](PROJECT.md) supplies context; milestone reports and screenshots are historical evidence. [Fresh-agent comprehension](FOUNDATION_REBOOT_V2_VALIDATION.md) answers the 20 handoff questions without old PR archaeology. Every milestone must refresh this snapshot and pass the charter's whole-project health review before the next is authorized.

Baseline post-merge CI: [41348249063](https://github.com/abuhmaid28/egyhealth360/actions/runs/41348249063); final observed result is recorded in the validation handoff. CI is technical evidence, never Product/UX/Design approval.
