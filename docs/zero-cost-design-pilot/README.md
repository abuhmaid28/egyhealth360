# Zero-additional-cost design Skill pilot

**Design proposals for Product Owner evaluation only. Implementation is not authorized.** Two isolated directions cover Patient My Care and Clinician Active Consultation with identical synthetic data within each role across proposals, English LTR and Egyptian Arabic RTL. H/P are unaccepted; NOVA is historical inspiration only. This does not finalize Brand V2 or Design System V2.

## View the actual visuals

Open the PNGs or PDF directly in GitHub; no software install, code, design work or local IDE is needed.

- [Four-page owner review PDF](evidence/owner-review.pdf).
- Desktop comparison: [English](evidence/board-desktop-en.png) / [Arabic](evidence/board-desktop-ar.png).
- Mobile comparison: [English](evidence/board-mobile-en.png) / [Arabic](evidence/board-mobile-ar.png).
- [Navigable static gallery](index.html) is source/reproduction material; GitHub does not execute its HTML. Use PNG/PDF links for immediate evaluation.

| Complete browser captures | INTERVAL | RELAY |
| --- | --- | --- |
| Patient desktop EN | [PNG](evidence/interval-patient-en-1440-full.png) | [PNG](evidence/relay-patient-en-1440-full.png) |
| Patient desktop AR | [PNG](evidence/interval-patient-ar-1440-full.png) | [PNG](evidence/relay-patient-ar-1440-full.png) |
| Patient mobile EN | [PNG](evidence/interval-patient-en-390-full.png) | [PNG](evidence/relay-patient-en-390-full.png) |
| Patient mobile AR | [PNG](evidence/interval-patient-ar-390-full.png) | [PNG](evidence/relay-patient-ar-390-full.png) |
| Clinician desktop EN | [PNG](evidence/interval-clinician-en-1440-full.png) | [PNG](evidence/relay-clinician-en-1440-full.png) |
| Clinician desktop AR | [PNG](evidence/interval-clinician-ar-1440-full.png) | [PNG](evidence/relay-clinician-ar-1440-full.png) |
| Clinician mobile EN | [PNG](evidence/interval-clinician-en-390-full.png) | [PNG](evidence/relay-clinician-en-390-full.png) |
| Clinician mobile AR | [PNG](evidence/interval-clinician-ar-390-full.png) | [PNG](evidence/relay-clinician-ar-390-full.png) |

## What is being evaluated

Read [design rationale/specifications](DESIGN_SPEC.md) and [independent screenshot findings](INDEPENDENT_REVIEW.md) alongside the images. These are two spatial/hierarchy hypotheses, not a contest between color palettes. Familiar local OFL fonts and original CSS/SVG keep cost and asset dependencies bounded. There is no invented logo, complete longitudinal chart, Lab/AI output or integrated prescribing surface.

Patient is a synthetic 09:00 snapshot before the visit; clinician is a 14:35 snapshot during the same visit on 12 November 2026. Their operational states intentionally differ by moment; each role’s fixture is identical across the two proposals. The appointment, released summary and follow-up are separate sources. Clinician private-note signing, summary sharing, follow-up release and close remain independent. Preview buttons explain their specimen-only behavior and never contact a service. Readable error specimens do not fix the production defect in Issue #88.

## Skill and cost disposition

Actual mode: **EXPLICIT_AUDITED_PLAYBOOK_ONLY**. No host-native selection/instruction loading is verified. The [audit and incremental cost model](AUDIT.md), [pinned MIT attribution](vendor/LICENSE), [source hashes](vendor/upstream-lock.json), and [explicit playbook](PLAYBOOK.md) document exactly what was used. No upstream executable, Premium feature, paid API/asset, credit purchase, new subscription or deployment is used. S1 remains blocked/unmeasured and untouched.

[Baseline and authorization](BASELINE.md) · [browser/technical validation and limits](VALIDATION.md) · [measured browser JSON](evidence/browser-measurements.json) · [preservation proof](evidence/preservation.json).

## Next owner gate

Evaluate both directions in **both roles and languages**, then record `INTERVAL / RELAY / REJECT BOTH / NAMED HYBRID`, with any concrete revisions. A hybrid must be shown coherently for approval. This approves only further design development of a versioned proposal; it does not authorize production implementation, final identity/system freeze, merge or deployment. Later owner gates for Final Brand V2, Design System V2 and high-fidelity approved prototypes remain separate. The dormant implementation role receives only owner-approved versioned specifications under a further explicit implementation grant. Basic checklist usefulness does not close the separate native Skill/S1 efficacy gate.

## Reproduction for agents

The owner need not run these commands. From repository root, use installed Python to serve localhost (`python3 -m http.server 8765 --bind 127.0.0.1`), then run `node docs/zero-cost-design-pilot/tools/render.mjs` and `node docs/zero-cost-design-pilot/tools/boards.mjs` with an installed Playwright package and Chromium. Tool defaults match the provided runtime; `PLAYWRIGHT_PACKAGE`, `CHROMIUM_PATH` and `PILOT_ORIGIN` can select existing installations. No dependency installation or paid service is needed. Render scripts are original pilot tooling, not upstream Skill execution.
