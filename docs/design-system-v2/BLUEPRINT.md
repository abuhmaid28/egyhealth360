# Design System V2 — DS01–DS05 blueprint and approval plan

**PROPOSED / OWNER REVIEW — documentation/planning only, 10 November 2026.** [Issue #102](https://github.com/abuhmaid28/egyhealth360/issues/102) authorizes this complete planning package and independent review. It does not adopt a Design System, finalize prototypes, authorize frontend architecture/implementation or close Brand distribution gates. Target: responsive **web/PWA**, across Patient, Doctor/Clinician, Pharmacy Staff, Laboratory Staff and Admin; no native application.

Read this plan → [decision and evidence matrix](DECISION_AND_EVIDENCE_MATRIX.md) → [validation truth](VALIDATION.md). The Product Owner evaluates the plan next. Every new visual value or behavior below is **PROPOSED / OWNER GATE**, even when written as a measurable requirement for future work. Accepted UX, IA, content and clinical/security constraints remain binding.

## DS01 — Foundations and token mapping

### Reuse the accepted Brand reference

Brand source is [Draft PR #101](https://github.com/abuhmaid28/egyhealth360/pull/101), pinned at **`687f94074c0ac4d45610546517ea6aa228d36183`**. Use the [latest owner decision](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6761920764) over earlier pending prose inside its historical files. Preserve source-exact logo geometry/gradients, approved Arabic spacing and all six AR/EN/bilingual light/dark primary lockups **without tagline**. No optical redraw, texture, new gradient or recolor is proposed. [Pinned asset directory](https://github.com/abuhmaid28/egyhealth360/tree/687f94074c0ac4d45610546517ea6aa228d36183/docs/brand-source-exact-100/assets) and [finalization evidence](https://github.com/abuhmaid28/egyhealth360/blob/687f94074c0ac4d45610546517ea6aa228d36183/docs/brand-source-exact-100/finalization-review/BRAND_FINALIZATION_REVIEW.md) stay external references; none of #101's 511 changed paths is copied or cherry-picked.

AP01 typography is **Inter EN 400/500/600/700 + genuine IBM Plex Sans Arabic 400/600**. Preserve [pinned font identity, weight and OFL provenance](https://github.com/abuhmaid28/egyhealth360/blob/687f94074c0ac4d45610546517ea6aa228d36183/docs/brand-source-exact-100/ap01-ap04-review/evidence/font-provenance.json). Noto is a comparison, Manrope a historical reference; neither becomes a silent default. Future font-loading failure must be detected and reported; no synthetic Arabic bold or letter spacing.

AP04 accepts **Violet × Apricot A — Balanced** and the **exact tested supporting roles/pairs/states** in the [96-record color audit](https://github.com/abuhmaid28/egyhealth360/blob/687f94074c0ac4d45610546517ea6aa228d36183/docs/brand-source-exact-100/ap01-ap04-review/evidence/color-pairs.json), Git blob `53300351b7e860b29d4c806d73088bead2acc8d6`. This is bounded Brand evidence, not an approved product-token API or a universal accessibility result.

### Proposed semantic mapping, constrained by exact pairs

Notation: foreground / background; `border` and `adjacent` identify meaningful control boundaries. Values below are selected audited reference pairs; semantic names/usage are **PROPOSED / OWNER GATE**. The linked JSON remains the full source for all 96 records, including repeated rest/hover records. Never build an arbitrary cross-product of these colors or apply opacity and inherit an old PASS.

| Proposed token family / use | Light reference | Dark reference |
| --- | --- | --- |
| `surface.canvas` + `text.primary` | `#17142B / #F8F7FB` | `#F6F2FF / #10121D` |
| `surface.base` + `text.primary` | `#17142B / #FFFFFF` | `#F6F2FF / #1D2030` |
| `surface.raised` + `text.primary` | `#17142B / #EFEAF7` | `#F6F2FF / #262A3C` |
| `text.secondary` on base | `#595269 / #FFFFFF` | `#C2BED2 / #1D2030` |
| `action.primary.rest` | `#FFFFFF / #6240B8`; same-color border, adjacent `#EFEAF7` | `#17142B / #A78BFA`; same-color border, adjacent `#262A3C` |
| `action.primary.hover` | `#FFFFFF / #50309D`; same-color border, adjacent `#EFEAF7` | `#17142B / #BDA7FF`; same-color border, adjacent `#262A3C` |
| `action.secondary.rest → hover` | `#17142B` on `#FFFFFF → #EFEAF7`; border `#787084`, adjacent `#EFEAF7` | `#F6F2FF` on `#1D2030 → #262A3C`; border `#85839C`, adjacent `#262A3C` |
| `border.control` / input rest + hover | `#787084` on `#FFFFFF`; text `#17142B` | `#85839C` on `#1D2030`; text `#F6F2FF` |
| Invalid input rest + hover | border `#9F2638` on `#FFFFFF`; text `#17142B` | border `#FFB4B8` on `#1D2030`; text `#F6F2FF` |
| Disabled action rest + hover | `#595269 / #E5E0EC`; border `#787084`, adjacent `#FFFFFF` | `#C2BED2 / #36394E`; border `#85839C`, adjacent `#1D2030` |
| Focus on canvas / base / raised | `#6240B8` against each of `#F8F7FB / #FFFFFF / #EFEAF7` | `#A78BFA` against each of `#10121D / #1D2030 / #262A3C` |
| Form feedback error / warning / success | `#9F2638 / #695100 / #226346` respectively on `#FFFFFF` | `#FFB4B8 / #F1DE91 / #9CD9BE` respectively on `#1D2030` |
| Non-semantic apricot accent | `#17142B / #FFB88B` | `#17142B / #FFB88B` |
| `selection`, active/pressed, charts, medical/authorization/privacy status | No final assignment; component-specific audit required | No final assignment; component-specific audit required |

The audit also identifies tooltip/tag/state borders and adjacent surfaces; consult those exact records when specifying them. Rest/hover feedback labels are form feedback only. Apricot never means warning, urgent care or medical success. Medical states, saved/signed/released states, authorization denial, privacy suppression and audit provenance need task-specific text and icons tied to existing contracts. No state transition, diagnosis or care-completion inference follows from a color. Charts need labelled series, patterns and a data-table alternative; clinical reference ranges require separate traceable authority.

### Proposed shape, density and typography brief

| Foundation | Candidate for later specification; all PROPOSED / OWNER GATE |
| --- | --- |
| Spacing / grid | 4px base; 4/8/12/16/24/32/48 spacing steps. Fluid 4/8/12-column zones; proposed layouts below. No claim that V1's 4px rule is accepted V2. |
| Shape / elevation | Controls 8px, cards 12px, contextual panels 16px; pill for short tags only. Border-led hierarchy; at most two documented elevation levels, shadow values deferred until theme QA. Avoid equal-radius tiles everywhere. |
| Density | Patient comfortable; clinician/staff compact only when hierarchy, 16px body and targets survive. Density changes space, never authority, content meaning or critical text legibility. |
| Type scale | Page 30px EN700/AR600; section 20px/600; body 16px/400; label/action 16px EN500/AR600; metadata 14px/400. Candidate line heights: EN body 1.6, AR body 1.85; headings at least 1.4. No fixed-height multiline text boxes. |
| Icons / motion | One coherent accessible vector family; licensing, source, stroke and direction rules reviewed later, no library chosen. Label consequential actions; mirror only directional meaning. Respect reduced motion; no pulsing clinical urgency, decorative loading or motion-only feedback. |

**14px risk:** the Brand specimen measured small metadata, not real clinical usability. Keep patient identity, instructions, consequential actions and uncertainty at 16px candidate minimum. Increase metadata to 16px when AR shaping, OS text, dense rows or participant review fails; never use 14px as a way to fit more clinical content. Exact scale/line-height/spacing and dark-mode surface hierarchy need owner review before freezing.

## DS02 — Responsive and bilingual web/PWA contract

These are draft measurable layouts, not newly accepted breakpoints. Use content failure to refine thresholds. Maintain one semantic hierarchy, logical properties and DOM/visual/focus order parity; do not merely mirror screenshots.

| CSS width / proposed zones | Fluid sizing and navigation adaptation |
| --- | --- |
| 320 / 390 | 16px inline gutters: usable 288 / 358px; four fluid columns, 12px gaps. Single task column; secondary context disclosed inline or via labelled web drawer. Wrapping text/actions; no truncated patient identity or critical status. |
| 768 | 24px gutters: 720px; eight columns, 16px gaps. Optional contextual pair only if each zone retains at least 320px; otherwise stack in task order. Labelled navigation toggle, no assumed hover. |
| 1024 | 24px gutters: 976px; twelve columns, 24px gaps. Proposed 208px labelled rail where role navigation needs it; remaining task width 744px after 24px gap. Retain single-column editor when two panes fail. |
| 1440 | 32px gutters: 1376px; twelve columns, 24px gaps. Proposed 224px rail and 1128px task zone. Cap sustained prose near 65 characters; tables use available width with explicit column priority. |
| Beyond 1440 | Candidate shell max 1600px, centered; fluid context/work zones, no endlessly stretched prose or fixed desktop assumption. Verify 1920px, intermediate thresholds and widths below each proposed transition. |

Proposed role adaptations preserve [accepted destination hierarchy](../IA_SITEMAPS.md), not V1 navigation furniture:

| Role | Narrow → wide candidate, subject to owner navigation gate |
| --- | --- |
| Patient | Two labelled primary links **My Care / متابعتي** and **Find care / دور على دكتور**; secondary history/shared outcomes/care relationships/account remain discoverable. Evaluate normal web bottom placement versus top navigation; neither is adopted here. Wide layout may use a compact labelled rail. |
| Doctor | Schedule + Care relationships remain global; consultation tasks stay local. Narrow view uses an explicit local task selector and preserved patient/visit context; wide view may expose local panels without moving clinical tasks into global navigation. |
| Pharmacy | Assigned work primary; bounded dispense history secondary. Narrow queue becomes labelled list → exact work; wide list/detail only within the exact current purpose. No patient directory. |
| Laboratory | FUTURE assigned diagnostics primary, bounded history secondary; draft the same list/detail adaptation only as NOT LIVE planning reference. No active destination before delivery approval. |
| Admin | People + Organizations primary; membership/configuration contextual or secondary. Narrow operational list/detail; wide rail and optional split context. No patient chart or clinical counts. |

Candidate touch target **44×44 CSS px**, with spacing between adjacent actions; WCAG 2.2 AA target-size criterion 2.5.8 has a 24×24px minimum or defined exceptions, which do not replace this comfort target. Desktop density must retain accessible hit areas. Safe areas, orientation, browser chrome and virtual keyboard must not hide the current action; no native-tab, swipe-only, hover-only or platform-back convention is assumed. Browser Back should retain permitted task context without resubmitting commands. No offline clinical-write queue or caching of sensitive payloads is introduced.

Require 200% text resize and native browser zoom, and reflow at 320 CSS px equivalent (including 400% zoom from 1280px). Avoid document-level two-axis scrolling; genuinely two-dimensional tables/charts need a named, keyboard-operable bounded region plus a readable list/table alternative. Sticky context must not obscure keyboard focus or consume the narrow screen. Test long names/errors, display-size changes and on-screen keyboards.

AR uses natural professional Egyptian Arabic, EN equivalent intent, accepted terminology and Latin digits. [Content System](../CONTENT_SYSTEM.md), [Arabic UX](../ARABIC_UX.md) and [glossary](../TERMINOLOGY_GLOSSARY.md) control meaning; stored authored instructions and names remain exact. Isolate mixed Latin runs (names, units, references, phone/email, signed quantities); preserve copy/paste bytes, plus signs and chronological order. No letter spacing in Arabic, clipped marks, reversed timeline or CSS-reordered focus. Localize accessible names and announcements, not just visible labels.

**TIME CONTENT CONFLICT — unresolved for V2:** accepted CD07 includes named Gregorian months, Latin digits, **24-hour** display and actual event/clinic timezone. Subsequent owner preference favors natural **12-hour** patient labels, reflected in [PR #93's pinned writing note](https://github.com/abuhmaid28/egyhealth360/blob/459037baa0d7c2e67fd95715bfca7999592dfd45/docs/nova-evolution-refinement-04/EGYPTIAN_ARABIC_UI_WRITING_NOTE.md) and explicitly flagged by #102. Neither this sprint nor that specimen silently rewrites the accepted general content contract. Gate DSV2-02 must resolve audience/surface scope, AM/PM wording and visible-vs-detail timezone. Until resolved, compare synthetic alternatives only; no final pilot time copy. Preserve full date, event zone/DST, repeated-hour offsets, cross-midnight endpoints, exact instants and server eligibility precision under either display choice. No parser/storage change or preference feature is implied.

Light/dark are deliberate paired systems: validate contrast, hierarchy, elevation, disabled controls, feedback and charts separately in each. Do not mechanically invert values or recolor the logo. Theme preference/default/persistence remains a proposal; each theme must work without animation or color-only status.

## DS03 — Accessible component system

Read-only baseline inventory: [runtime primitives](../../apps/web/src/components/ui.tsx) at main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3` export `Modal`, `Icon`, `Logo`, `Badge`, `Avatar`, `Card`, `CardTitle`, `Heading`, `Empty`, `Loading`, `useResource`, `Resource`, `SessionRecovery`, `Detail`, `Field`, `date` and `time`. Button/Link/Input/Select and navigation also use native/Next elements and page composition; these are not all exported standalone primitives. `Modal` uses native dialog and focus restoration; `Field` links label/hint; `Badge` accepts a free-form tone defaulting to green; resource retry and 24-hour helpers are inventory facts, not approved V2 semantics. Never carry generic read-retry behavior into clinical mutations.

[LEGACY V1](../DESIGN_SYSTEM.md) and [Premium Synthesis](../ui-reference/PREMIUM_SYNTHESIS_SPEC.md), plus preserved Patient/Clinician references in the [source index](../SOURCE_OF_TRUTH.md), provide anatomy/behavior/evidence comparisons. Their old teal/blue, Manrope/Noto, small type and layout rules are not re-adopted. `packages/ui` ownership, framework/library choice and migration strategy await Frontend Architecture V2. This plan adds no JSX, CSS, package or component implementation.

Use one proposed taxonomy: **actions/entry → structure/navigation → feedback/data → healthcare patterns**. Every future component spec must include: purpose/non-goals; anatomy/slots and composition; proposed props/variants and semantic-token dependencies; rest/hover/active/focus/disabled/loading/error/empty/success or a reason a state is inapplicable; validation/recovery; accessible name/role/value and announcements; keyboard and screen-reader behavior; responsive AR/EN RTL/LTR and theme examples; prohibited compositions; source evidence and acceptance cases. Visual availability never supplies backend permission.

| Family / minimum components | Anatomy, interaction and anti-pattern checks for later specs |
| --- | --- |
| Button, Link | Label, optional icon, pending indicator; action vs navigation semantics, type/disabled/busy, safe consequential confirmation. No clickable div, icon-only sign/release, or spinner that implies committed success. |
| Input, Select, Search, Form Field | Label/control/hint/error/required state; explicit constraints, associated errors, preserved input and safe error summary. Native select baseline; any combobox needs complete keyboard semantics. Search loading/no results/error distinct; no inaccessible placeholder labels or unauthorized patient search. |
| Card, Navigation, Tabs | Heading/body/actions and landmarks/current location; card is not a nested interactive button. Tabs use labelled panels, arrows and documented activation; links remain links. No tab for unsupported Live integration or duplicated global/local menus. |
| Table/List | Caption, headers, row identity, sort/paging/status; keyboard controls and labelled responsive row alternative. No hidden critical cell, fabricated zero, client-side filtering of private rows/counts or visual-only sort. |
| Dialog/Drawer | Name/description, content, actions, close affordance; initial focus, containment where modal, Escape policy and focus return. Distinguish modal/nonmodal drawer. No trapped focus, lost unsaved text or bundled clinical command. |
| Alert/Toast | Severity label/icon, message, recovery; persistent critical errors, polite vs assertive announcements. No disappearing-only proof of signature, release or dispense; no PHI in global notifications. |
| Badge/Status | Text/icon and task-specific state meaning; distinguish clinical/authority/privacy/UI states. No green default for unknown, color-only result or conflation of CLOSED with shared/complete. |
| Skeleton, Empty/Error | Preserve structure, loading announcement/busy scope, explicit denied/uncertain/privacy treatment. No skeleton of hidden records, fake counters, retry storm or existence-revealing error. |
| Date/Time | Full labelled endpoints, locale/zone detail, accessible input/calendar and keyboard alternative. DSV2-02 blocks final formatting; no hard-coded permanent Cairo offset or reversed RTL ranges. |
| Charts | Title, units, period, source/provenance, legend, labelled values and table equivalent; keyboard/AT access, non-color encodings. No fabricated clinical thresholds, smoothing that changes meaning or chart-only unavailable state. |

## DS04 — Healthcare patterns across five portals

These are pattern planning references, **not five completed screen specifications**. Use synthetic fixtures only and explicit NOT LIVE/FUTURE labels. Current backend, frontend exposure and deployment are separate facts; no hosted parity is asserted by this docs sprint.

| Portal / pattern and traceability | Required component composition and safety | Capability classification |
| --- | --- | --- |
| Patient discovery/booking + My Care: [J1/J4 and journeys](../USER_JOURNEYS.md), IA P1–P9/P11, content Patient models | Search/public clinician facts → exact clinic/time review → explicit booking outcome; My Care task/appointment card → released summary/follow-up and secondary histories. Booking grants **ZERO** clinical authority; patient authorizes and clinician accepts the actual `ClinicianPatientAssignment`. Recommendation ≠ booked visit; closed ≠ shared. Own permitted data only; no private/draft counts. | Directory/booking and I2 core exist; relationship management, composed histories and Rx exposure include integration gaps. Lab result destination P10 FUTURE; integrated I4 timeline/reminders NOT LIVE. |
| Doctor schedule/active consultation: IA C1–C9, [I2 contract](../V3_I2_CONTRACT.md), [content consequential actions](../CONTENT_SYSTEM.md) | Schedule logistics → exact patient/visit/current authority → sustained editor/context with explicit saved/signed/released facts. Independent private-note sign, summary sign/release, follow-up release and Review & Close; no silent private-note release, discharge/close or auto-save/sign on navigation. Allergy uncertainty stays uncertainty. | I2 core implemented/exposed; prescribing/routing backend exists with V1 integration gaps; diagnostics C10 FUTURE. No fake medications/results/AI tab. |
| Pharmacy exact-routed fulfillment: IA F1–F5, [I3 Slice 2](../V3_I3_SLICE2.md), content Pharmacy models | Exact queue → accept → eligible full-item dispense → retained receipt/history/correction. Require current user/session, PHARMACY organization, exact current membership and route authority. No clinician access inherited. After completion/stoppage use reduced history purpose: actual dispense/correction facts, **no patient display name or source instructions**. Reversal preserves consumed entitlement; no dispense-again action. | Backend Slices 1/2 implemented; Live frontend integration/hosted I3 parity unverified, Demo is NOT LIVE. No stock, pickup readiness, substitution, partial supply or refill capability. |
| Laboratory scope/gap classification: IA L1–L5, [I3 §5](../V3_I3_CONTRACT.md#5-laboratory-orders-and-results), content FUTURE Lab | FUTURE exact order/assigned work → accepted work → draft entry → explicit verify/finalize → amendment/retraction history. Current exact LAB_STAFF/org/membership/artifact checks; no inherited clinician authority. Draft payload/IDs/counts hidden from patient/general clinician. Same person may enter/finalize with truthful separate provenance; final released immediately under privacy, **no added doctor-release queue**. | Accepted policy and operational role/org foundation exist; Lab backend/results and active UI are FUTURE / GAP / NOT LIVE. Samples/barcodes/LIS, SLA and extra verification workflow are UNDEFINED, not new accepted states. No results sign-off is automated. |
| Operational Admin: IA A1–A7, [I1](../V3_I1_CONTRACT.md), [security](../SECURITY.md), content Admin models | People/Organizations lists → exact account/org/membership/configuration → supported operational action and feedback. No blanket patient clinical payload/counts, impersonation, assignment manufacture, signing, break-glass or generic clinical audit browser. | Bounded operational services exist; full Live management exposure GAP. Safe-service-health A8 FUTURE; Demo Admin shell is NOT LIVE management proof. |

Every pattern inherits [current authority/privacy](../SECURITY.md) and accepted [I3 replay/privacy rules](../V3_I3_CONTRACT.md#6-privacy-replay-and-transactions): recheck reads/writes/replay; filter before count/page; suppress wrong-patient payload, identifiers, references and existence-revealing conflicts. Preserve immutable history and minimized audit. Timeout with uncertain commit is not success or failure: provide explicit reauthorized identical-command/key recovery where the accepted contract permits it; **no automatic clinical mutation retry**. Nothing here adds a medical rule or changes state transitions.

## DS05 — Validation, acceptance and handoff

### Ordered future review workflow

| Step | Reviewable output and exit condition; separate authorization required |
| --- | --- |
| 1. Compact foundations specification | DS01 token semantics/exact pair provenance + DS02 type/grid/density/theme candidates, exceptions and DSV2-01–04 owner decisions. Review before expanding variants. |
| 2. Component inventory/anatomy | DS03 inventory crosswalk and spec checklist completed for minimum families; accessible behavior/state coverage and unsupported capability labels reviewed. No package ownership assumed. |
| 3. Future high-fidelity pilots | **Patient My Care + Doctor Consultation**, both themes/languages and representative narrow/wide views plus states. Owner separately authorizes and visually reviews these pilots; this sprint creates neither. Reuse accepted information/task hierarchy, not old visual styling. |
| 4. Targeted staff/Admin samples | One exact-routed Pharmacy work/history sample, one explicitly FUTURE Lab result/correction sample, one operational Admin membership sample. Test role-specific limits without five full portal specs. |
| 5. Accessibility and visual QA | Run the matrix below against exact candidate artifacts; resolve material failures and review natural Egyptian Arabic/task comprehension. No preemptive whole-product PASS. |
| 6. Owner signoffs and health review | Explicit DS spec/component and pilot visual acceptance, identified exceptions and whole-project health disposition; AP03/AP05 kept separately OPEN unless direct evidence closes them. Technical CI cannot supply these approvals. |
| 7. Frontend Architecture V2 → implementation | Separately approved component ownership, i18n/data architecture and migration plan, then bounded implementation authorization with approved visual references. No automatic build grant from steps 1–6. |

### Future test/quality matrix — requirements, NOT EXECUTED here

| Dimension | Cases and measurable acceptance / retained evidence |
| --- | --- |
| Browser / PWA / device | Free local Chromium + available Firefox/WebKit automation for discovery, actual Chrome/Edge/Firefox/Safari and physical Android/iOS where applicable. Record exact SHA, browser/OS/device/DPR and settings. Emulator/WebKit is not physical Safari or installed PWA proof. On separately authorized build check install/icon choice, masking, safe areas, orientation, keyboard and OS text; unavailable device = NOT TESTED. |
| Contrast / themes | WCAG 2.2 AA 1.4.3 ordinary text ≥4.5:1 (large text ≥3:1 when qualified); 1.4.11 essential controls/graphics ≥3:1. Check actual composite rest/hover/active/focus/disabled/error surfaces per theme, with exceptions recorded, no translucent-color inference. Brand audit does not certify new pairs. |
| Keyboard / assistive tech | 2.1.1 keyboard, 2.1.2 no trap, 2.4.3 order, 2.4.7 visible focus, 2.4.11 focus not obscured; names/roles/values 4.1.2, status announcements 4.1.3, labels/errors 3.3.1–3.3.3. Tab/Shift+Tab, arrows, Enter/Space, Escape, focus return, skip links. Real NVDA/Firefox and VoiceOver/Safari where available; record manual speech/task results, automated audit alone insufficient. |
| Reflow / text / targets | All five widths +1920 and breakpoint edges; 1.4.4 at 200% text, 1.4.10 at 320px equivalent/native 400% zoom, 1.4.12 text-spacing overrides, 2.5.8 targets. No lost controls, hidden marks or clipped critical data; bounded 2D exceptions documented. |
| AR/EN / content | RTL/LTR reading/focus/copy parity, mixed Latin quantities/units/IDs/phone/email, diacritics, long names/errors, chronological ranges, repeated hours and midnight. Native Egyptian editorial/comprehension review remains required; no participant study inferred. Resolve time gate before final copy. |
| State / segregation | Loading/empty/error/success/disabled/denied/uncertain/privacy cases in each relevant role/theme. Session, assignment, membership and org revoked; wrong patient; stale version; uncertain mutation; restricted replay/count/page. No backend tests executed by this plan; future integrated negative tests must prove boundaries. |
| Visual / task quality | Exact-version snapshots at fixed font hashes, viewport, DPR, locale, theme and state; owner comparison of hierarchy/density/logo/type and task continuity. Reduced motion/forced colors check; no hidden synthetic data, font fallback or unreviewed snapshot update. |

No paid tooling is required: repository checks, browser devtools, Playwright/axe where available, free screen readers and borrowed physical devices can capture evidence. Availability is recorded honestly; no service purchase or dependency change is authorized here.

### Separate GO / NO-GO gates

- **Start DS specification work:** GO only after owner accepts/revises this plan and explicitly authorizes a bounded specification brief, confirms applicable Brand/UX/IA/content sources and resolves or narrowly scopes DSV2-01–04 before dependent final choices. Candidate comparisons may precede choice within that brief. NO-GO for unresolved authority conflicts, undocumented material design choices or scope expansion. AP03/AP05 OPEN do **not** block private documentation planning/specification; they remain explicit distribution holds. There is no automatic GO now.
- **Start full frontend:** GO only after approved UX/content (including time resolution), accepted DS/components + Patient/Doctor high-fidelity pilots and relevant role samples, accessibility/visual QA disposition, whole-project health review, separately approved Frontend Architecture V2 and explicit implementation scope. P0/P1 defects or missing material signoffs mean NO-GO. Existing functionality is not final visual approval.
- **Brand distribution/release:** AP03 actual browser/device/PWA icon selection, OS text and physical print remain OPEN; five Type3 PDF glyph bounding-box warnings remain disclosed. AP05 creator permission/artwork rights/originality and trademark checks remain OPEN; font OFLs do not clear the logo. Applicable unresolved holds mean NO-GO for the corresponding public distribution/rights claim, independently of CI or DS review. No deployment is authorized by any gate here.

**Next owner action:** evaluate this plan and its scoped decision register; accept, request revisions or authorize a specifically bounded future DS specification step. Keep the issue PR **DRAFT / OPEN / UNMERGED / AUTO-MERGE OFF**. No ready-for-review transition, runtime change, merge, deployment, production change or final Brand/Design System adoption.
