# NOVA EVOLUTION — premium refinement 01

**One Patient My Care design-only refinement for Product Owner review.** Candidate A from PR #90 is provisionally selected; B/C are not selected. This package proposes a refined appearance, without final Brand V2, Design System, logo or production approval.

## Open the visual evidence

- [Refined Arabic mobile — full 390px PNG](evidence/refined-ar-390-full.png)
- [Refined Arabic desktop — full 1440px PNG](evidence/refined-ar-1440-full.png)
- [One before/after comparison PNG](evidence/before-after.png)

The comparison uses the first 844px of each phone capture, explicitly labeled, and complete desktop captures at half display size. Full mobile PNGs are available separately. Original A phone/desktop PNGs are copied byte-identically from the source commit; its branch and evidence are untouched. Every image is an actual Chromium render, with synthetic data. The owner needs only the PNG links; GitHub does not execute specimen HTML.

## Compact visual rationale

The refinement keeps A's dark digital appointment stage, restrained orbital calendar and luminous action. Its signature now also comes from an offset light source plane, a common alignment datum, precise double-line accents and consistent icon/action details. A structural outer edge joins the page's surfaces; it is decorative layout framing, not a care timeline, source association or clinical progress indicator. No new mark or final palette/type decision is made.

| Material change | Result / reason |
| --- | --- |
| Compact mobile appointment | Doctor, full date, time/offset and action are composed together beside a smaller orbit. At 390px, the event surface falls from **488.47px to 326.34px — 33.2% shorter**. The 52px primary action ends at **572.09px instead of 794.45px**. |
| Arabic optical rhythm | A compact greeting/orientation, confident doctor name, emphasized Manrope time and calmer Plex Arabic source hierarchy give each information level a distinct role. Source prose is more readable; clinician/date stay with each released message. No Arabic letter spacing, essential ellipsis or forced clinical text shortening. |
| Dark/light relationship | Controlled depth remains in the appointment; a slightly offset light plate and common edge replace unrelated floating boxes. Source icon/title alignment follows the doctor-name datum on desktop. No card-within-card stack. |
| Patient correspondence | The first revision's table-like metadata/actions were rejected in independent review. Final desktop sources use two independent correspondence groups on one shared plane, each with its own attribution and adjacent action. Mobile retains a clear reading order. |
| Deliberate wide-screen hierarchy | Desktop gives identity/action, full timing and calendar separate horizontal positions, while source correspondence uses balanced columns. It is not a stretched phone layout. |
| Earlier next responsibility | The follow-up title moves from **907.84px to 797.16px** on the phone, entering the first 844px viewport. Its recommendation and unlinked status remain separate from the confirmed appointment. |
| Contextual privacy | The booking/access boundary is beside the event instead of at the bottom of the entire page. Its wording and bilateral-care meaning are preserved. |

[Actual before/after geometry](evidence/comparison-metrics.json). These are browser layout measurements, not user-research, task-success or clinical-outcome metrics. The mobile page is 1781px tall versus 1973px for source A, while all facts remain available.

## Interaction and loading concepts

| Situation | Defined treatment | Current specimen / boundary |
| --- | --- | --- |
| Pointer hover | A 140ms color/border change and restrained 3px directional arrow movement; no glow sweep or continuous orbit animation | Implemented for design-only controls; content and clinical status do not change |
| Keyboard focus | Visible 3px ring with a contrasting separation layer; lime on dark, dark plum on paper; no obscured fixed overlays | Implemented, measured and keyboard-checked |
| Preview dialog | Named native modal, single-action Tab/Shift+Tab loop, Escape close and opener focus return | Local explanation only, without booking, clinical command, storage or service call |
| Later appointment loading | Preserve the event's geometry; announce `بنحمّل مواعيدك` with busy semantics; do not show stale facts as a current confirmation or invent an empty result. Replace the content after a successful read, retaining focus. A short opacity transition may be used only when motion is allowed. | Specification concept only. No loading screen or data request is added in this bounded normal-scenario round. Error/empty/uncertain outcomes remain a separately scoped state review. |
| Reduced motion | Immediate visual state changes and automatic scrolling; all transitions/animations disabled | Implemented and verified under emulated preference |

No interaction commits or retries anything. The [static specimen](index.html) is for agent reproduction over localhost, not a production application or public deployment. English parity, broader states and native-device/editorial/assistive checks remain required before final design approval.

## Source and authority

Verified current main/base: **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**. New branch: `design/72-nova-evolution-premium-refinement`. The direct 7 November 2026 owner brief authorizes this one Patient-only refinement, separate Draft PR and required final-head CI. Earlier multi-direction requirements yield only within this new scope. Accepted UXD10–UXD16, IA01–IA05/Patient B, CD01–CD07 and clinical/privacy/security contracts remain binding. Current source/main CI and the final PR/head/CI are separate facts; actual delivery results belong in the Draft PR handoff.

Primary visual source: **PR #90 at `5aad95092a74e5818214c71d4263451b9d28eb86`** — [README](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/README.md), [independent review](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/INDEPENDENT_REVIEW.md), [validation](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/VALIDATION.md), [A HTML](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/a.html), [A CSS](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/a.css) and [common CSS](https://github.com/abuhmaid28/egyhealth360/blob/5aad95092a74e5818214c71d4263451b9d28eb86/docs/patient-three-directions/common.css). Original [mobile](evidence/before-ar-390.png) / [desktop](evidence/before-ar-1440.png) copies retain the exact source fingerprints. PR #90 was freshly verified Draft/Open at that head and is preserved.

Same synthetic scenario: سلمى حسن; د. عمر علي; official `Nile Care Clinic`; confirmed Thursday **12 November 2026, 14:30–15:00, Africa/Cairo, UTC+02:00**; independently released follow-up and summary dated **5 November 2026**. Recommendation has no linked appointment here; no inference about bookings elsewhere. No clinical narrative, private/draft material, hidden count, diagnosis, AI, laboratory or active medication capability is invented. Available history stays bounded; prescription access is visibly unconnected; booking creates no clinical authority.

## Explicit design-resource loading

Actual mode: **EXPLICIT_AUDITED_PLAYBOOK_LOADING**. No new native availability probe or activation claim; S1 remains unchanged. Resources were explicitly read at their exact Git commits before design, with hashes in [provenance](evidence/provenance.json).

- **`0886788bd6b395bb7cace8653ffe280da68af4b8` / PR #89:** [PLAYBOOK](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/PLAYBOOK.md), [AUDIT](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/AUDIT.md), [Basic excerpts](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/basic-ux-excerpts.json), [upstream lock](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/upstream-lock.json), [MIT notice](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/LICENSE).
- **`b3eb9543a58d571968a16168d3492bf817792cb4` / PR #87:** [exploration Skill](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/.agents/skills/eh360-visual-exploration/SKILL.md), [visual QA Skill](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/.agents/skills/eh360-visual-qa/SKILL.md), [reference map](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/docs/skills-pilot/REFERENCE_MAP.md).

No upstream installer/generator, package update, Premium feature, new subscription, paid service/API/image generator/asset or credit purchase. Existing local Plex/Manrope OFL fonts are copied with notices; visual treatments are original CSS/SVG. No new dependency or deployment.

## Review and next owner decision

[Independent rendered critique](INDEPENDENT_REVIEW.md) separates visual excellence from [technical/governance validation](VALIDATION.md). Read its actual reservations; technical Green cannot establish the owner's aesthetic preference.

Owner decision: **accept this refined A as the basis for separately scoped finalist validation; request specific changes; or reject this refinement.** No automatic progression follows. English parity, broader states and native-device review precede final design approval. Final Brand V2, Design System, broader portals, frontend implementation, merge and deployment remain separately owner-gated.

## Agent reproduction

Serve the repository root using installed tooling at `http://127.0.0.1:8765`, then run the scripts in `tools/`: `render.mjs`, `comparison.mjs`, `contrast.mjs`, `motion.mjs`, `verify.mjs`. They use existing Playwright and `/usr/bin/chromium`; `SPECIMEN_ORIGIN` / `CHROMIUM_PATH` can select existing alternatives. No application build or backend is involved. The owner need not execute these commands.
