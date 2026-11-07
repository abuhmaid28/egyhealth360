# Three Patient My Care design proposals

**For Product Owner visual evaluation only.** Exactly three Arabic-first, disconnected Patient My Care specimens; one synthetic scenario. No winner, final identity, system freeze or frontend implementation is approved.

## Open the visuals

Start with the [mobile comparison PNG](evidence/board-mobile-ar.png) and [desktop comparison PNG](evidence/board-desktop-ar.png). Full-resolution browser captures:

| Proposal | Arabic mobile, 390px | Arabic desktop, 1440px |
| --- | --- | --- |
| A — NOVA EVOLUTION | [Full PNG](evidence/a-ar-390-full.png) | [Full PNG](evidence/a-ar-1440-full.png) |
| B — EDITORIAL CARE FUTURE | [Full PNG](evidence/b-ar-390-full.png) | [Full PNG](evidence/b-ar-1440-full.png) |
| C — NEXT-GENERATION CONNECTED CARE | [Full PNG](evidence/c-ar-390-full.png) | [Full PNG](evidence/c-ar-1440-full.png) |

The boards contain these actual Chromium screenshots, not generated UI images. [Grayscale mobile](evidence/grayscale-mobile.png) and [grayscale desktop](evidence/grayscale-desktop.png) provide structural comparisons. PNGs open directly in GitHub on a phone; GitHub does not execute HTML. The owner need not install or run anything.

## Three concise rationales

**A — NOVA EVOLUTION.** A dark appointment stage, orbital calendar and luminous action establish a strong digital identity. A full-width appointment separates doctor/action from a calendar-and-time composition; two light source planes follow. Plex semibold Arabic and Manrope numerals create emphatic hierarchy. Technical framed icons and restrained hover highlights suggest precision without clinical scores. Attention goes to the confirmed appointment, then the separate recommendation. Original CSS/SVG is straightforward to specify in the existing Next.js stack. Risk: the orbit can outweigh the appointment facts; its mobile footprint was reduced after independent review. NOVA's historical appearance was not recovered, so this is a new interpretation of the authorized territory.

**B — EDITORIAL CARE FUTURE.** An oversized Arabic masthead, vermilion date folio and asymmetric ruled composition make care feel thoughtfully edited. The appointment owns the larger column; the independently shared sources form a smaller annotated column. Noto Sans Arabic has a denser, heavier optical character; unframed line icons and square actions reinforce the print rhythm. Mobile uses a dedicated date stamp, then the full-width time/action. Native CSS grid and local variable type are feasible. Risk: editorial restraint may feel less technologically expressive, and Noto needs generous line boxes; its measured stress defects were corrected.

**C — NEXT-GENERATION CONNECTED CARE.** A sculpted double enclosure places the confirmed appointment beside explicitly separate released sources. Soft source nodes express bounded retrieval, not a chronology, booking association, clinical progress or integrated medical history. Light Plex Arabic, a capsule calendar, shared navigation inset and round icon nodes establish a quieter spatial language. Mobile keeps the appointment and sources within one continuous plane. CSS grid, borders and normal semantic sections implement the geometry without an API aggregate. Risk: it is the least adventurous candidate, and the connected metaphor must never suggest automatic source association.

| Dimension | A | B | C |
| --- | --- | --- | --- |
| Composition | Wide dark stage; separate light source pair | Asymmetric folio; ruled side notes | Appointment and bounded sources in one enclosure |
| Emphasis | Luminous action and orbital day | Arabic masthead and typographic time | Current appointment within shared care context |
| Typography | Plex semibold, compact hierarchy | Noto bold, spacious line boxes | Plex regular, softer hierarchy |
| Primary navigation | Independent rounded tabs | Underlined text in ruled masthead | Inset shared segmented surface |
| Shape/surface | Chamfer-like asymmetric corners, depth | Square edges, flat paper, rules | Deep corner arc, capsule, nested contour |
| Grouping | Appointment → source pair → retrieval | Appointment with privacy / editorial source column | Appointment + independent source section → retrieval |
| Color relationship | Midnight plum, lilac, citron | Ivory, aubergine ink, vermilion | Pale sage, deep petrol, light leaf |
| Icon/rhythm | Fine technical glyphs in angular frames | Bare print glyphs and annotations | Rounded icon nodes, separated source markers |
| Interaction proposal | Illuminated action, stage focus | Explicit textual actions, ruled feedback | Soft inset selection and source traversal |

All use seven keyboard-accessible preview buttons, a skip link, native modal semantics and explicit specimen-only feedback. No hidden hover action or external navigation. The differences remain visible in grayscale: dark stage / ruled paper / nested dark-light contour.

**Non-binding recommendation:** A is the strongest starting point if the owner's priority is expressive digital character; B is the clearest editorial alternative; C prioritizes calm bounded continuity. This is an aesthetic recommendation, not a selected winner or measured user preference. Review all six images before deciding.

## Scope, scenario and authority

Base main: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`, freshly fetched and verified against GitHub. Branch: `design/72-patient-three-directions-20261107`. Main CI [42165554605](https://github.com/abuhmaid28/egyhealth360/actions/runs/42165554605) was SUCCESS at that base; it is not evidence for this PR's changed head. Final PR/head/CI are recorded in the Draft PR handoff.

Authority is the direct Product Owner brief uploaded on 7 November 2026. Its digest is retained in [bootstrap provenance](evidence/bootstrap.json). It supersedes earlier visual candidate counts, role/language scope and creative restrictions only for this isolated experiment. Accepted UXD10–UXD16, IA01–IA05/Patient B, CD01–CD07 and clinical/privacy contracts remain binding. [Current status](../CURRENT_STATUS.md), [charter](../FOUNDATION_CHARTER.md), [accepted composition semantics](../ui-reference/PATIENT_MY_CARE_COMPOSITION.md), [content](../CONTENT_SYSTEM.md), [Arabic](../ARABIC_UX.md) and [brand strategy](../BRAND_STRATEGY.md) were consulted. Earlier composition palettes and geometry are historical visual directions, not constraints on this newly authorized exploration.

Fresh GitHub verification: [#86](https://github.com/abuhmaid28/egyhealth360/pull/86) OPEN/unmerged, head `7bd1d03195185b19b6ed869fb2e5ced51b4cb9b3`; [#87](https://github.com/abuhmaid28/egyhealth360/pull/87) OPEN/unmerged, head `b3eb9543a58d571968a16168d3492bf817792cb4`; [#89](https://github.com/abuhmaid28/egyhealth360/pull/89) DRAFT/OPEN/unmerged, head `0886788bd6b395bb7cace8653ffe280da68af4b8`. They are untouched. [Issue #88](https://github.com/abuhmaid28/egyhealth360/issues/88) remains a separately tracked production error-button defect; this sprint does not fix it. H/P, INTERVAL and RELAY remain rejected historical visual evidence. NOVA was absent from inspected main text, the pinned reference map and current GitHub code search; no historical NOVA identity is invented.

The controlled scenario reuses PR #89's Patient data: سلمى حسن, د. عمر علي, official clinic name `Nile Care Clinic`; confirmed Thursday 12 November 2026, 14:30–15:00, `Africa/Cairo`, actual `UTC+02:00`; separate summary and follow-up released on 5 November 2026. This is a synthetic snapshot before the appointment. The recommendation has no linked appointment here; no inference about bookings elsewhere. No clinical narrative, condition, dosage or private/draft source is invented. Prescription retrieval is explicitly unconnected; available history is bounded. Booking does not imply permission or clinician acceptance.

## Design resource provenance

Actual mode: **EXPLICIT_AUDITED_PLAYBOOK_LOADING**. One native Cloud Skills catalog availability check was performed; the requested design resources were not in that catalog. No native activation/loading event is evidenced. This is explicit pinned Git file reading, not native activation or S1 completion. The repository S1 evaluation remains unchanged.

Read before authoring at **`0886788bd6b395bb7cace8653ffe280da68af4b8`**:

- [PLAYBOOK.md](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/PLAYBOOK.md)
- [AUDIT.md](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/AUDIT.md)
- [basic-ux-excerpts.json](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/basic-ux-excerpts.json)
- [upstream-lock.json](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/upstream-lock.json)
- [MIT LICENSE](https://github.com/abuhmaid28/egyhealth360/blob/0886788bd6b395bb7cace8653ffe280da68af4b8/docs/zero-cost-design-pilot/vendor/LICENSE)

Read before authoring at **`b3eb9543a58d571968a16168d3492bf817792cb4`**:

- [Healthcare Visual Exploration Skill](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/.agents/skills/eh360-visual-exploration/SKILL.md)
- [Healthcare Visual QA Skill](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/.agents/skills/eh360-visual-qa/SKILL.md)
- [REFERENCE_MAP.md](https://github.com/abuhmaid28/egyhealth360/blob/b3eb9543a58d571968a16168d3492bf817792cb4/docs/skills-pilot/REFERENCE_MAP.md)

[Digests and loading record](evidence/bootstrap.json). The Basic subset traces to upstream MIT commit `b7d5353e0130feb8c5574ef1251f8a1db1873ccb`; no upstream download, installer, generator, Premium feature or code was run. The previous two-direction/bilingual/multiple-role expectations yield to this owner's three-direction, Patient-only, Arabic-first six-capture scope. Original artifacts contain no copied upstream code or assets. Font notices are retained beside byte-identical local OFL binaries. All SVG icons/calendar treatments are original, decorative and carry no medical meaning. No final logo is proposed: the text wordmark is retained.

## Review and validation

[Independent rendered visual findings](INDEPENDENT_REVIEW.md) separate aesthetic Gate V from technical Gate T and governance Gate G. [Focused validation](VALIDATION.md) records browser measures, corrected defects, preservation and explicit limits. Technical success cannot establish visual approval. Native Egyptian editorial/participant review, English parity, screen readers, real devices, other browsers and full state coverage remain finalist work.

## Owner decision

- Select Candidate A for further refinement
- Select Candidate B for further refinement
- Select Candidate C for further refinement
- Reject all three and request another creative direction

A choice authorizes only the subsequent separately scoped design refinement after explicit owner direction. It does not approve Final Brand V2, Design System V2, production UI implementation, merge or deployment. Implementation Agent C remains dormant.

## Reproduction for agents

The owner only reviews images. For agents, serve the repository root locally with an existing HTTP server, then run `node docs/patient-three-directions/tools/render.mjs`, `node docs/patient-three-directions/tools/boards.mjs`, `node docs/patient-three-directions/tools/contrast.mjs`, and `node docs/patient-three-directions/tools/verify.mjs`. Defaults: `http://127.0.0.1:8765`, installed Playwright and `/usr/bin/chromium`; `SPECIMEN_ORIGIN` and `CHROMIUM_PATH` select existing alternatives. No installation or package update is required. Open [A](a.html), [B](b.html), [C](c.html) through localhost for design-only controls. The HTML files are the authored prototypes; no application build or backend is involved.
