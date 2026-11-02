# Current status

CURRENT AUTHORITATIVE delivery snapshot. Foundation Reboot V2 Stage 0+1 is complete/accepted after independent review PASS and PR #73 merge at `2fb940c2759056d63d3a22b640d67a587abccf07`; [acceptance and exact-main CI](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6564358810). Audited baseline main: **`eb61da263ce44db5ca71ffdfea6a87309c8e17ef`** (PR #71). This is a pinned implementation baseline, not a claim that main never advances. Recheck the remote at task start; the docs PR's eventual merge changes main without changing this runtime baseline.

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

Active umbrella: [#72](https://github.com/abuhmaid28/egyhealth360/issues/72). **Stage 2 — Product UX Foundation is ACCEPTED / MERGED** through [PR #75](https://github.com/abuhmaid28/egyhealth360/pull/75) at **`248347f72a7c1d4646cbceb7224f0ec1a9d92f06`**, from reviewed head `53eff8cdb6bb847351522ce3cc04e8fb1e34f627`. [Owner acceptance 6565530772](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565530772) accepts UXD10–UXD16, role/task/journey/principle foundations and UXD19 as planning direction only. Adoption-time pending wording in Stage 2 documents is historical; this explicit acceptance controls. Post-merge main CI [41362415955](https://github.com/abuhmaid28/egyhealth360/actions/runs/41362415955) is SUCCESS.

**Active: Stage 3 — Information Architecture**, documentation/product-structure only, under [owner authorization 6565633586](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565633586). [IA proposal](INFORMATION_ARCHITECTURE.md), [five sitemaps](IA_SITEMAPS.md), [IA decisions](IA_DECISION_REGISTER.md) and [validation](IA_VALIDATION.md) propose workspace grouping, primary/secondary/contextual hierarchy, entry points and structural responsive behavior. All labels are working labels. Material IA01–IA05 choices remain subject to independent review plus explicit owner acceptance. Delivery branch: `docs/foundation-reboot-v2-stage3-information-architecture`; one PR, OPEN / UNMERGED / auto-merge OFF. No IA choice is owner-approved by this delivery.

**CI Accelerator V2:** [PR #74](https://github.com/abuhmaid28/egyhealth360/pull/74) independently reviewed PASS and merged at **`7156b7fe667342a2ed4b356d857ff56c2f7da7fa`**. [CI policy](CI_POLICY.md) routes docs/governance through classify → docs-check → validate; heavy lanes intentionally skipped. Stage 3 final exact-head CI/duration belongs in its PR handoff. No new application runtime/deployment proof follows from a lightweight docs run.

**Health verdict: B — HEALTHY WITH NON-BLOCKING DEBT, accepted. Stage 1.5 is NOT REQUIRED on the reviewed evidence.** [Audit, severity register and limits](FOUNDATION_REBOOT_V2_AUDIT.md), [independent acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6564358810). Stage 2 records V1 exposure gaps and UX debt without remediating runtime or reopening accepted clinical/security policy.

**Paused / not authorized:** Content System / Arabic UX execution; Brand, Design System, high-fidelity prototypes, frontend architecture/implementation; I3 Slice 3 Lab Order, Slice 4 Lab Results, Slice 5 Integrated Exit, I4, I5/EACCE, research execution/AI inference, production/final-domain promotion. Stage 3 future locations do not authorize implementation, and a current backend capability is not automatically Live.

**Next gate:** independent Stage 3 Information Architecture review, explicit owner disposition of IA01–IA05 and whole-project health review before any separately authorized next stage. No automatic progression to Content/Arabic or Brand/Design. [IA dependencies](INFORMATION_ARCHITECTURE.md#8-dependencies-and-capability-gaps) record exposure gaps without fixes or new clinical/security rules.

## Fast reading path and truth maintenance

1. [AGENTS](../AGENTS.md), then current GitHub authorization above.
2. This file.
3. [Stable charter](FOUNDATION_CHARTER.md) + [source classification index](SOURCE_OF_TRUTH.md).
4. For Product UX: [UX_FOUNDATION](UX_FOUNDATION.md) → [USER_JOURNEYS](USER_JOURNEYS.md) → [UX_DECISION_REGISTER](UX_DECISION_REGISTER.md); [inventory](PRODUCT_UX_INVENTORY.md) supplies evidence.
5. For Stage 3: [INFORMATION_ARCHITECTURE](INFORMATION_ARCHITECTURE.md) → [IA_SITEMAPS](IA_SITEMAPS.md) → [IA_DECISION_REGISTER](IA_DECISION_REGISTER.md) → [IA_VALIDATION](IA_VALIDATION.md).
6. Relevant accepted contracts/current references, then implementation/tests when needed.

[PROJECT](PROJECT.md) supplies context; milestone reports and screenshots are historical evidence. [Stage 2 comprehension and validation](PRODUCT_UX_VALIDATION.md) covers the new 20 Product UX questions; [Stage 0+1 validation](FOUNDATION_REBOOT_V2_VALIDATION.md) remains historical evidence. Every milestone must refresh this snapshot and pass the charter's whole-project health review before the next is authorized.

Baseline post-merge CI: [41348249063](https://github.com/abuhmaid28/egyhealth360/actions/runs/41348249063); final observed result is recorded in the validation handoff. CI is technical evidence, never Product/UX/Design approval.
