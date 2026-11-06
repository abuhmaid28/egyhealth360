# Codex Execution Prompt — Clinician Active Consultation Master Slice

Read and obey, in order:

1. repository source-of-truth and current Issue #72 authorization
2. `docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md`
3. approved Patient baseline at commit `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`
4. current implementation contracts for consultation opening, documentation, follow-up and close

## Role

You are the implementation engineer, not the art director.

**Implement the master spec accurately. Do not redesign it.**

The Patient My Care final visual baseline is the visual DNA source. Do not introduce a separate clinician brand.

## Absolute visual rules

- Use text wordmark only: `EgyHealth 360`.
- DO NOT create, draw, add or substitute any logo symbol or brand mark.
- Reuse the exact Patient baseline font assets and approved tokens.
- Do not introduce purple, a new blue system, a dark clinician theme, glass, glow or generic admin-dashboard styling.
- Do not add stock illustrations or clinician/patient photos.

## Exact implementation slice

Implement ONLY the existing Live clinician documentation route family centered on:

`/doctor/consultation/:bookingId/documentation`

Create the premium Active Consultation composition described in the master spec:

1. Patient-product-family header
2. exact consultation context ribbon
3. local consultation task bar
4. documentation outline
5. high-density center authoring plane
6. truthful source-state/context rail
7. existing follow-up entry/context
8. existing Review & Close entry/context

Required first review variants:
- Desktop EN at 1600×1000
- Desktop AR / RTL at 1600×1000

Responsive code must not break narrower widths, but DO NOT design a full clinician mobile workspace in this slice.

## Product truth / forbidden invention

Preserve the existing real semantics exactly:

- consultation opening is explicit
- clinical authority is independently checked
- private note and patient summary are separate sources
- private note sign is separate from summary sign/release
- follow-up draft/release is separate from summary release
- closing is separate and irreversible
- close does not save, sign or release other sources
- uncertain commands are not silently retried
- signed history remains immutable
- addendum/correction/wrong-patient restriction semantics remain unchanged

DO NOT add active UI for unsupported capability merely to make the screen look richer.

Specifically, in this slice:
- no active Prescription tab unless a real integrated clinician prescription surface already exists in the current Live route
- no Lab/Results tab
- no fake vitals
- no fake medication list
- no fake results
- no MRN/age/sex if not supplied by this exact workspace source
- no diagnosis suggestion
- no dose suggestion
- no AI clinical suggestion
- no completeness or risk score

If a source value is absent, omit it or present a truthful unavailable state. Never fabricate a clinical value.

## Header / navigation

Do not create a feature-per-module clinician navbar.

Primary clinician navigation must follow accepted IA:
- Schedule
- People in your care / accepted localized equivalent (`مرضاي` in Arabic content)

Availability/settings remain secondary where already supported.

During consultation, the exact patient/visit task context must visually dominate.

## Local tasks

Visible local consultation tasks in this slice:
- Clinical documentation
- Follow-up instructions
- Review & close

These are exact-consultation anchors/work modes, not global modules.

## Documentation composition

Use existing documentation sections and actions. Do not rename consequential commands into generic equivalents.

Required source separation:
- Complaint and findings
- Allergy review
- Private note
- Visit summary and instructions
- Signed history

Preserve command labels/meaning such as:
- Save private note draft
- Sign private note
- Save summary draft
- Review sign and release
- Start separate draft where supported
- Add signed addendum
- Create signed correction
- Restrict wrong-patient document

Do not create `Save all`.

## Review & close

Keep Review & Close locally reachable.

DO NOT use:
- Complete consultation
- Complete & Close
- Save and close
- Finish all

The final close confirmation must preserve the existing acknowledgement that closing does not sign/release clinical material.

## Styling implementation

Prefer reusable clinician-scoped primitives/tokens derived from Patient rather than copying one-off values across many selectors.

Do not globally freeze Design System V2 in this task.

Do not restyle unrelated Patient, Pharmacy, Lab or Admin routes.

## Scope boundaries

NO changes to:
- backend
- API/OpenAPI
- database/schema/migrations
- authorization/security contracts
- pharmacy domain
- lab domain
- hosting/deployment
- CI policy
- production aliases

Do not merge.
Do not deploy.
Do not enable auto-merge.

## Required review evidence

Return fresh evidence from the production-built frontend:

- Desktop EN 1600×1000
- Desktop AR 1600×1000
- full-page EN
- full-page AR
- 1280px structural proof EN/AR
- 200% text EN/AR
- keyboard focus EN/AR
- loading/error/access-revoked or redacted state where reproducible
- before/after comparison against current V1 clinician documentation
- exact changed-file inventory
- explicit discrepancy register
- exact head SHA
- exact-head CI result

The review package must state clearly which visible values came from real current fixtures/services and which content is structural copy. Do not claim pixel-perfect parity or Product Owner approval.

Keep the work on `design/clinician-active-consultation-master-spec` and keep the Patient PR #79 unchanged.

Finish exactly with:

**READY FOR INDEPENDENT CLINICIAN ACTIVE CONSULTATION MASTER REVIEW**
