# Visual Directions — validation and review limits

Point-in-time evidence for the isolated A/B/C exploration at base **`0a0e9c2038ecad420e95c2c67ae367129e195839`**, 2 November 2026. Scope: [Issue #72 / owner comment 6568574368](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568574368) plus the explicit owner visual brief. Base main CI [41384993898](https://github.com/abuhmaid28/egyhealth360/actions/runs/41384993898) is SUCCESS at the exact base.

## Actual visual evidence

- Exactly A/B/C: Care Journal, Clear Instrument, Care Thread. [Matrix](../comparison/MATRIX.md) compares ten material-difference dimensions and twelve functional/brand-fit dimensions without weights, totals or a winner. [Logo-free proof](../comparison/logo-free-comparison.png) preserves visibly different page grammar.
- Six independent concepts: A1 folio, A2 attentive pair, B1 aligned handoff, B2 focused frame, C1 open interval, C2 folded path. [Vector proof sheets / screening](../logos/REVIEW.md) and adjacent PNGs show full name/360, symbol, light/dark, monochrome, app icon and 16/32px. No copied competitor assets or trademark-clearance claim.
- **42 full-screen PNGs**: 14 per direction, seven EN/AR pairs. Each direction has Patient desktop, Patient mobile, appointment context, Doctor desktop Schedule, active Consultation, Doctor mobile Schedule and a state board. [Inventory and owner entry](../README.md) link every full-size screen; each direction also has an overview PNG.
- Actual Chromium rendering, not V1 screenshot reuse. [Render record](render-results.json) records browser version, widths/heights, bidi runs, computed font stacks, missing-image/clipping checks and keyboard focus. Screen exports use 1440px desktop and 390px mobile, DPR 1, `Africa/Cairo`, reduced motion and fixed synthetic content. Overview boards are 1600×2360. Full pages are captured rather than truncating long Arabic screens. Overview composites intentionally scale screens; separate PNG/HTML gives full-size inspection.
- Read-only loopback serving is used only for capture because managed Chromium blocks `file:` navigation. All remote requests are blocked. The delivered owner review needs no server/build/backend and works with local relative assets. No runtime endpoint or deployment was changed.
- Each direction uses the same [synthetic fixture](synthetic-fixture.json), medicine, exact `1.25 mL` quantity, long name, event date/time/zone, appointment states, summary/fulfillment meanings and uncertain-result example. Patient My care depicts a booked visit; Doctor specimens depict its later open-consultation context. Prior shared Patient summary is dated 1 November; the current Doctor summary is dated 2 November. Quantity and recorded observations are display fixtures, not dosage, advice, a diagnosis or a clinical rule.

## Accessibility concept check

| Check | Result / evidence | Limit |
| --- | --- | --- |
| Text and status contrast | Explicit rendered role pairs pass 4.5:1 normal-text target; necessary field/focus boundaries pass 3:1. [Ratios](contrast-results.json) | Sampled concept role pairs, not every state of a finished application |
| Non-color status | Status words, source labels, border shape and consequence copy distinguish success/warning/error/unavailable/uncertain | No color-blind participant study |
| Focus | Actual Tab navigation lands on a specimen button with a visible outline; [PNG](keyboard-focus.png), [record](render-results.json) | Product controls are inert static specimens, not implemented keyboard workflows |
| Arabic readability | Full RTL Patient and Doctor examples; Naskh / sans / Kufi display approaches; body joining and labels visually reviewed | Native Egyptian clinical/editorial participant review remains outstanding |
| Mixed-direction values | `bdi dir=ltr` preserves `Amoxicillin`, `1.25 mL`, `14:30`, `UTC+02:00`, `Omar Abdelrahman`; actual computed direction recorded | Screen-reader speech order, selection/copy and assistive-device testing remain later work |
| Mobile | Actual 390px reflows; no page overflow or detected clipped headings/body/buttons/statuses. Additional 320px reflow checks cover all 30 desktop role/state pages in both languages; [record](reflow-results.json). Dense prescribing is represented on desktop; mobile Doctor scope is Schedule/visit review | Long pages and small labels need real-device/task evaluation; static dimensions prove no task success |
| Typography and numerals | Existing fonts and legal browser/system fallbacks only; explicit decimal/unit and small-label specimens | Naskh/Kufi/Georgia/Trebuchet availability varies by OS. No final font choice or cross-platform guarantee |
| Illustrations / icons | Original functional symbols with text; no stock medical/AI imagery; arrows drawn as SVG to avoid missing glyphs | Icon recognition remains unmeasured |

This is **concept-level WCAG 2.2 AA targeting, not full implementation conformance**. No fabricated usability, native-speaker certification, preference, speed or recall results.

## Semantic-safety check

Author review of the actual EN/AR pages against accepted UX, IA, content and brand constraints:

| Dangerous inference | Explicit visual counterexample / result |
| --- | --- |
| Booking grants medical access | Patient appointment helper and separate care-permission explanation; Doctor Schedule states access is separate |
| Closed means everything shared | Doctor Schedule helper and state board distinguish closed from shared; consultation retains independent source ledger |
| Signed private note becomes shared | Private editor label and signing explanation state it stays private; review-signing is separate from summary sharing |
| Signed prescription means dispensed | Prescription SIGNED, pharmacy ACCEPTED and “No dispense recorded” appear as separate facts |
| Pharmacy accepted means available/ready | Actual helper explicitly denies availability, pickup readiness and dispense inference |
| Dispensed means consumed | State board says recorded dispense is not consumption; no adherence/usage graphic |
| Follow-up recommendation means booked | Recommendation panel states it is not a booking and no appointment is linked here; no claim about appointments elsewhere |
| Lab final means doctor reviewed | Only a FUTURE-labelled state-board statement; no active Lab navigation or fabricated current result |
| Admin means clinical access | State board states operational access only; no Admin chart view, role selector or override |
| Unknown/not-reviewed means no allergies | Persistent allergy warning in every Consultation; exact knowledge state retained |
| Close saves/signs/shares | Separate Review closure action names exact patient and consequence; no “finish everything” control |
| Timeout means success or safe new request | Uncertain signing state says review current source, do not create a new signing command, recover the original only if available |
| Available history is complete record | Explicit secondary source retrieval and bounded-source language; C thread explicitly rejects complete-timeline interpretation |

Synthetic source author is Dr Mariam Hassan, patient Omar Abdelrahman, clinic Dokki. Patient own information and Doctor current care authority are represented without policy changes. No private/draft counts leak into Patient screens. No automatic clinical decision, medical text translation, substitute medicine, refill, partial dispense, reminder, AI or unapproved current feature is added. Dates use named Gregorian months, Latin digits, 24-hour time and the actual fixture event timezone (Cairo on 2 November 2026, UTC+02:00); no permanent-offset rule is introduced.

## Preservation and CI

[Scope record](scope-results.json) compares every pre-existing tracked file outside the seven permitted current-document updates against base bytes, including all 18 protected V1 files. `apps/web`, `packages/ui`, `apps/api`, all other runtime/packages, database/schema/migrations, OpenAPI, dependencies, CI/workflows and protected evidence remain byte-for-byte unchanged. No new font files, app integration, favicon, production logo or deployment change.

The seven existing document changes are status, source index, project, roadmap and acceptance-context banners in strategy/register/exploration brief. The historical research findings remain preserved; the banners resolve superseded pending language using the actual owner acceptance.

Focused checks: `python docs/visual-directions/check-review.py`, browser capture/reflow checks, existing `node --test tests/ci/*.test.mjs`, `node scripts/ci/check-docs.mjs`, and `git diff --check`. Actual classification is **DOCS_GOVERNANCE + INFRASTRUCTURE / full regression** because HTML/CSS/SVG/PNG/JSON/Python/MJS in this new documentation area are unmapped by the existing fail-closed policy. No policy is weakened. The required remote Bootstrap CI run, exact final head, classification, lane results and actual duration belong in the PR/final handoff; a local visual check alone is not technical Green.

## Whole-project health and owner gate

**B — HEALTHY WITH NON-BLOCKING DEBT remains unchanged** on this bounded evidence. No new P0/P1 foundation defect established. Existing [IA D01–D09](../../INFORMATION_ARCHITECTURE.md#8-dependencies-and-capability-gaps), Live integration gaps, unverified hosted I3 parity, native/participant/device/assistive validation and pre-final deployment limitations remain. This is no new live runtime/security/deployment audit. Technical CI cannot select or approve a visual direction.

Independent Visual Directions review and explicit **A / B / C / REJECT / HYBRID** follow. No winner, final logo/palette/font, Final Brand V2, Design System V2 or production implementation is created. A hybrid requires a later coherent rendering for approval. PR stays open/unmerged, auto-merge off. No automatic next-stage authorization.
