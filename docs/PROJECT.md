# EgyHealth 360 — project context

CURRENT AUTHORITATIVE overview; [CURRENT_STATUS](CURRENT_STATUS.md) is the concise delivery/deployment/authorization source. Start with current GitHub authorization → CURRENT_STATUS → [charter](FOUNDATION_CHARTER.md) + [source index](SOURCE_OF_TRUTH.md) → relevant contracts/code/tests.

EgyHealth 360 is an integrated synthetic graduation healthcare platform: patient access/discovery/booking, human-authored consultation and released care information, prescriptions, pharmacy, future diagnostics, follow-up and longitudinal continuity; later bounded evidence-aware HTN research. Patient, Clinician, Pharmacy, Laboratory and Admin share one platform. Ordinary healthcare journeys do not require a CarePlan or EACCE.

**Complete accepted foundation:** M0/M1/M2, V3-G0, I1, I2, I3 contract, I3 Slice 1 Prescription and Slice 2 Pharmacy. I3 overall remains incomplete. The [current roadmap](IMPLEMENTATION_ROADMAP.md) links completion evidence. M2 remains bounded planning/evidence/INITIAL generation, not closure classifications or recurring actions.

**Live:** pre-final Vercel frontend → Vercel NestJS API → Neon PostgreSQL 18, with evidenced I2 login/booking/consultation/documentation/follow-up/close and EN/AR/RTL. Prescription/pharmacy backend on main is not verified deployed or integrated into Live UI. Pharmacy/lab frontend shells remain Demo/unsupported. Current UI is a functional V1 prototype, not final design; current logo is not final. Protected final domain: `egyhealth360.vercel.app`.

**Active:** Foundation Reboot V2 Stage 2 — Product UX Foundation, documentation/product analysis only, after accepted Stage 0+1 and merged/independently reviewed CI Accelerator V2. [Current scope and gates](CURRENT_STATUS.md), [Product UX reading path](UX_FOUNDATION.md), [CI policy](CI_POLICY.md). Stage 1.5 is not required on accepted evidence. Stage 2 outputs remain subject to independent review and owner acceptance; Stage 3, Lab, I4/I5/EACCE, final design/frontend implementation and final-domain promotion remain unauthorized.

## Product and execution boundaries

Keep [Product V3](PRODUCT.md), accepted [D01–D36](PRODUCT_V3_DECISIONS.md), [security](SECURITY.md) and task contracts distinct from implementation evidence. Clinical authority is the current assignment; booking grants none. Staff fulfillment is current exact recipient/artifact scope. ADMIN is operational. Retain wrong-patient privacy, immutable history, operation keys, PostgreSQL concurrency and additive migration checksums.

The student team owns scope/design decisions, coordination and understanding/presentation; agents implement authorized contracts. [Execution policy](EXECUTION_POLICY.md) preserves synthetic data, authoritative clinical sources, free-first scope and no default fieldwork dependency.

## Retained research direction — future execution

CR-HTN-FU-001 controlled uncomplicated HTN follow-up; B0 naive overdue, B1 normalized coverage-blind, P1 EACCE. Report false-gap rate alongside recall, decision coverage/abstention and isolated ground truth. The integrated product does not expand the rule/benchmark. Engine, FHIR and worker packages remain scaffolds. [Research](RESEARCH.md) and [protocol](research/EXPERIMENT_PROTOCOL_V1.md) are plans, not completed experiments.

## Historical completion evidence

The records below preserve accepted point-in-time evidence. They do not set today's task, deployment or design authorization. Earlier project wording remains available at the [audited baseline](https://github.com/abuhmaid28/egyhealth360/blob/eb61da263ce44db5ca71ffdfea6a87309c8e17ef/docs/PROJECT.md).

## V3-G0 completion evidence

[PR #36](https://github.com/abuhmaid28/egyhealth360/pull/36) merged at `2ad6ecadcdd973bc7f61d6613d9b4d2c5ef81ddb`. Exact-main post-merge [Bootstrap CI 39881994529](https://github.com/abuhmaid28/egyhealth360/actions/runs/39881994529) completed **SUCCESS** (`event=push`, `branch=main`, exact head SHA above). [Issue #35 final verification](https://github.com/abuhmaid28/egyhealth360/issues/35#issuecomment-6355210754) records **V3-G0 COMPLETE**; Issue #35 is **CLOSED/completed**. This closes V3-G0 reconciliation only. Subsequent [Issue #39](https://github.com/abuhmaid28/egyhealth360/issues/39) approves the I1 contract; [Slice 1 authorization](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6356123914) permits documentation adoption only.

## V3-I1 final completion evidence

[PR #47](https://github.com/abuhmaid28/egyhealth360/pull/47) merged at `d1b0a017896bdbef0062951264d2e0176732e6b9`, ordered parents `7f977466252dcf96caca7510e85c66aee24b9cd8` and `63af9483964263114ce234470c584f678830a964`. Exact-main Bootstrap 40496696728 SUCCESS, push/main, attempt 1, validate 122163838525; all 37 steps passed. Accepted 98 unit / 583 integration / 7 container / 14 migrations PASS; no failures/skips/cancellations; both audits 0 HIGH / 0 CRITICAL; Slice 6 25/25, all runtimes/smoke/cleanup PASS. Issue #39 CLOSED / completed with final comment 6441304825. These are I1 completion results, not I2 implementation proof.


## M0–M2 retained exit evidence

M0: [EH-003 validation](EH-003_VALIDATION.md). M1: [issue #14 final exit](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). M2: [EH-014 post-merge validation](EH-014_VALIDATION.md#post-merge-validation), [issue #28 completion](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6330230875). FR-024 remains foundation-only; AC-004/005 are not satisfied by INITIAL generation. Historical evidence is not a fresh CI execution for this docs sprint.
