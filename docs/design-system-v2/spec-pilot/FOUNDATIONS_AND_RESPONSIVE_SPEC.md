# Design System V2 — Foundations and Responsive Components specification

**CANDIDATE / OWNER REVIEW · Issue #104 · 10 November 2026.** Two synthetic local web/PWA specimens, not adopted UI, completed product screens or a native app. Start with [gallery.html](gallery.html), [decision gates](DECISION_GATES.md) and [actual QA](QA.md). Run `python prepare-reference.py` in this folder, then open the gallery directly as a local file. No server, production route, API, submission, persistence, new dependency or external hosting. Gallery controls change only local review state; role selection never authenticates anyone.

## Authority and provenance

- [Issue #104](https://github.com/abuhmaid28/egyhealth360/issues/104) authorizes this bounded specification. Fresh main/base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. One new branch from main; no imported PR history.
- [Accepted planning blueprint](https://github.com/abuhmaid28/egyhealth360/blob/4052e2657dd8d354fe11e33ed51fc32ec8065583/docs/design-system-v2/BLUEPRINT.md), [matrix](https://github.com/abuhmaid28/egyhealth360/blob/4052e2657dd8d354fe11e33ed51fc32ec8065583/docs/design-system-v2/DECISION_AND_EVIDENCE_MATRIX.md), [owner decision 6763681689](https://github.com/abuhmaid28/egyhealth360/pull/103#issuecomment-6763681689): planning only; new values and compositions remain candidates.
- [Brand owner decision 6761920764](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6761920764), reference `687f94074c0ac4d45610546517ea6aa228d36183`: DP01 Arabic spacing; DP02 no tagline; AP01 Inter EN400/500/600/700 + genuine IBM Plex Sans Arabic AR400/600; AP02 source-exact gradients/geometry; AP04 Violet × Apricot A — Balanced and exact audited supporting pairs. [96-record source audit](https://github.com/abuhmaid28/egyhealth360/blob/687f94074c0ac4d45610546517ea6aa228d36183/docs/brand-source-exact-100/ap01-ap04-review/evidence/color-pairs.json), blob `53300351b7e860b29d4c806d73088bead2acc8d6`. Acceptance comments supersede older pending prose inside those artifacts.
- Accepted [UX](../../UX_FOUNDATION.md), [IA destinations](../../IA_SITEMAPS.md), [Arabic UX](../../ARABIC_UX.md), [CD01–CD07](../../CONTENT_DECISION_REGISTER.md), [terminology](../../TERMINOLOGY_GLOSSARY.md) and [security](../../SECURITY.md) constrain meaning. Old adoption-time proposal language does not reopen owner acceptance recorded in CURRENT_STATUS.
- [Runtime primitives](../../../apps/web/src/components/ui.tsx) and [legacy Design System](../../DESIGN_SYSTEM.md) are read-only inventory at main. Runtime has Modal/Icon/Logo/Badge/Avatar/Card/CardTitle/Heading/Empty/Loading/useResource/Resource/SessionRecovery/Detail/Field/date/time; native/Next elements compose other controls. Legacy teal, Manrope/Noto, tone-default-green and V1 logo are not V2 authority. No component API/library or `packages/ui` ownership is selected.

Exact-source primary AR/EN light/dark lockups are loaded without modification, tagline, CSS filters or redrawing. Bilingual remains an approved source variant, not duplicated here. [Reference manifest](reference-manifest.json) records seven exact blob and SHA-256 identities; local preparation writes only ignored `.reference/`. Fonts/logos are not committed again. Inter variable supplies genuine approved EN weights; Plex has separate 400/600 files, `font-synthesis:none`, no Arabic letter spacing. A visible missing-asset warning prevents fallback from masquerading as proof.

## DSV2-01 — semantic aliases (all aliases CANDIDATE)

Raw values and audited pairs come from AP04; assigning UI aliases is a new owner choice. Ratios below are WCAG sRGB opaque foreground/background calculations, rounded to two decimals. **They validate only the listed pair and use**; see browser-derived actual states in QA. No opacity or arbitrary cross-product inherits a PASS.

| Alias / use | Light foreground / background | Ratio | Dark foreground / background | Ratio | Provenance / boundary |
| --- | --- | --- | --- | --- | --- |
| canvas / primary text | `#17142B / #F8F7FB` | 16.81 | `#F6F2FF / #10121D` | 16.93 | AP04 exact text pairs |
| surface / primary text | `#17142B / #FFFFFF` | 17.93 | `#F6F2FF / #1D2030` | 14.65 | AP04 exact text pairs |
| raised / primary text | `#17142B / #EFEAF7` | 15.18 | `#F6F2FF / #262A3C` | 12.89 | AP04 exact text pairs |
| secondary text on surface | `#595269 / #FFFFFF` | 7.41 | `#C2BED2 / #1D2030` | 8.90 | AP04 exact text pairs |
| primary CTA rest | `#FFFFFF / #6240B8` | 7.13 | `#17142B / #A78BFA` | 6.59 | Rest AP04 |
| primary CTA hover / active | `#FFFFFF / #50309D` | 9.33 | `#17142B / #BDA7FF` | 8.65 | AP04 hover; active reuse CANDIDATE |
| secondary CTA rest | `#17142B / #FFFFFF` | 17.93 | `#F6F2FF / #1D2030` | 14.65 | AP04; border below |
| secondary CTA hover / selected nav | `#17142B / #EFEAF7` | 15.18 | `#F6F2FF / #262A3C` | 12.89 | Hover AP04; selected nav CANDIDATE |
| control border on surface | `#787084 / #FFFFFF` | 4.72 | `#85839C / #1D2030` | 4.40 | AP04 essential boundary ≥3 |
| control border on raised | `#787084 / #EFEAF7` | 4.00 | `#85839C / #262A3C` | 3.87 | AP04 adjacency ≥3 |
| focus on canvas | `#6240B8 / #F8F7FB` | 6.69 | `#A78BFA / #10121D` | 6.85 | AP04; 3px outline, 3px gap |
| focus on surface | `#6240B8 / #FFFFFF` | 7.13 | `#A78BFA / #1D2030` | 5.93 | AP04 |
| focus on raised | `#6240B8 / #EFEAF7` | 6.04 | `#A78BFA / #262A3C` | 5.22 | AP04 |
| disabled text / fill | `#595269 / #E5E0EC` | 5.71 | `#C2BED2 / #36394E` | 6.26 | AP04; no opacity; inactive exception not relied on |
| form error text / invalid border | `#9F2638 / #FFFFFF` | 7.48 | `#FFB4B8 / #1D2030` | 9.58 | AP04 form feedback only |
| form warning text | `#695100 / #FFFFFF` | 7.56 | `#F1DE91 / #1D2030` | 11.98 | AP04 form feedback only |
| form success text | `#226346 / #FFFFFF` | 7.14 | `#9CD9BE / #1D2030` | 10.05 | AP04 form feedback only |
| skeleton / fill on surface | `#595269 / #E5E0EC` | 5.71 | `#C2BED2 / #36394E` | 6.26 | New alias for AP04 disabled pair; bars decorative |
| selection text / fill | `#FFFFFF / #6240B8` | 7.13 | `#17142B / #A78BFA` | 6.59 | CANDIDATE reuse of audited CTA pair |
| underlined links on surface | `#6240B8 / #FFFFFF` | 7.13 | `#A78BFA / #1D2030` | 5.93 | CANDIDATE alias; no color-only affordance |
| nonsemantic sample accent | `#17142B / #FFB88B` | 10.65 | `#17142B / #FFB88B` | 10.65 | AP04; never urgency, health or permission |

Primary fill/border also forms its boundary against surface/raised; secondary/disabled controls retain the opaque control border. Links remain underlined across rest/hover/active. Selected navigation has `aria-current` (page for Patient My Care; location for Doctor Schedule section while Consultation is open), border and an inset rule. Pointer active/pressed retains the hover pair while hovered (secondary raised, primary hover); keyboard active without hover retains rest. Neither implies a toggle state. Status tags are neutral text + boundary. Form error/warning/success colors **do not define** clinical status, authorization, privacy, pharmacy fulfillment or lab results. Apricot labels only synthetic review material. Unknown is never green or zero; CLOSED never implies shared or complete.

### Spatial, type and material candidates

| Foundation | CANDIDATE / recommendation | Reason and owner-visible tradeoff |
| --- | --- | --- |
| Spacing | 4/8/12/16/24/32/48px scale; structural gutters 16/24/32px; content uses rem | Compact vocabulary; does not reuse V1 as authority. Text growth expands cards. |
| Type | EN Inter: title30/700, section20/600, body16/400, actions16/600, labels16/600, metadata14/400. AR Plex: same sizes, titles/sections/actions600, body/metadata400 | Genuine weights only. 14px limited to nonconsequential review metadata; identity, permission, date, task/error text ≥16px. |
| Line-height | EN1.6 body/1.4 title/1.5 section; AR1.85 body/1.4 title/1.5 section | AR shaping gets room. No fixed-height text containers or clipped marks. |
| Comfortable density | Patient 24px card inset wide,16px narrow;24px task gaps. Doctor same type/target floor with16px context inset | Doctor density is task grouping, not smaller clinical text. Compact spacing remains candidate, not a functioning density preference. |
| Shape | Control8px, card12px, anchor/dialog16px, short state pill only | A soft hierarchy without equal pill cards everywhere. |
| Elevation | Level0 border-led surfaces; level1 dialog with opaque surface + backdrop `#10121DCC`; no shadow required | Dark hierarchy comes from separate canvas/base/raised values; light relies on white surface and violet-tinted raised context. Logo is theme-specific source asset. |
| Icons | Future coherent24px vector grid,20px inline size,1.75px stroke, round joins; text-labelled consequential controls | No icon library/API selected. Proof uses text to avoid an invented symbol system. Mirror directional arrows only; never clocks, logos or medical marks. |
| Motion | Static skeletons; optional future120ms control transition only; no medical pulsing; reduced-motion removes transitions | No motion is needed to understand any state. No loading-implies-commit animation. |

**Three hierarchy treatments, not three dashboards:** recommend a **task anchor** (violet top rule, date block, one primary action) for Patient's next appointment; use a **context anchor + quiet work surface** (raised identity/authority panel, local task links, white/dark base editor) for Doctor; use **border-led source rows** for secondary retrieval. Gallery demonstrates these together. Alternative equal-weight cards obscure the next task; a permanent saturated clinical editor competes with source-state text. These are proposed treatments, not new IA or adopted layouts.

## DSV2-03/04 — responsive web/PWA and theme behavior

| CSS width | Candidate geometry and same-order behavior |
| --- | --- |
| 320 | 16px gutters,288px usable; single column, wrap all actions; date block becomes horizontal; nav labels wrap. No clipped full name, zone, permission or denial. |
| 390 | 16px gutters,358px usable; same task order; comfortable44px controls and48px fields. |
| 768 | 24px gutters,720px usable; main task/context still stacked; component state strip may use two columns. |
| 1024 | 32px gutters,960px usable; 1.6:1 task/context columns with24px gap; local links wrap. No desktop side rail invented. |
| 1440 | 32px gutters,1376px usable; same hierarchy; prose wraps within task panels; no dashboard metrics. |
| Beyond1440 | Center shell capped1600px including gutters. Planned text measure refinement for sustained clinical prose near65ch; this empty editor proof does not validate authored-document readability. 1920px checked as a bounded extra case. |

Breakpoints768/1024/1600 are **candidate content thresholds**, not frozen tokens. One task order: global context → page intent → next task/current patient+visit+authority → local work → secondary retrieval → state strip. AR uses logical properties; mixed names, ISO instants, timezone, ranges and Latin numbers isolated with `bdi`. Chronological ranges remain LTR; date names are localized Gregorian months. Full synthetic doctor/patient names wrap, never ellipsize. Responsive changes retain actual DOM/focus/reading order; navigation B is moved in the DOM with its visual location, never CSS-reordered. Existing IA destinations remain intact; proof links only inspect local patterns and do not promise Live integrations.

**Navigation comparison:** A keeps labelled global links below the masthead at all widths; recommended for web discoverability, early keyboard access and consistent browser use. B places those same links after content below768px in normal document flow (no sticky overlay); thumb access improves only after scrolling, discovery and keyboard return worsen. At wider widths B returns above content. No native tabs, swipe gesture, bottom fixed bar, new destination or accepted placement is inferred. Doctor Schedule/مرضاي remain global; documentation/follow-up/review-close remain local. Patient متابعتي and دور على دكتور are bordered labelled links/buttons, not static headings alone.

**Theme comparison:** deliberate paired palette, border hierarchy and theme-specific exact logo. Option T1: system preference initially, explicit override persists in future account/browser scope; supports expectation but raises flash/SSR/shared-device questions. Option T2: explicit first choice with session-only override; predictable shared-device behavior but repeats choice. Recommend testing T1 with a narrowly scoped preference contract later. Gallery's light-first selector is a comparison control, **not product default**; it reads no media preference or storage. No theme persistence/default is implemented or approved.

**Accessibility intent:**200% text and320px reflow; native400% zoom from1280px remains a separate test, not replaced by a screenshot or CSS scaling. Minimum44×44px comfortable targets, visible3px focus offset3px, no sticky context obscuring focus, no hover-only action. Preserve text-spacing overrides and forced-color boundaries. No claim of complete WCAG2.2 conformance, assistive-tech speech, installability or device ergonomics from this isolated proof. No offline clinical writes or sensitive PWA cache.

## Component behavior contracts — CANDIDATE, no implementation API

All families inherit genuine typography, opaque per-theme pairs above, explicit text states and the responsive order rule. A visible enabled control never supplies authorization. Gallery is a subset proof; **S** below means shown in specimen, **P** means specified/planned, not executed product behavior.

| Family | Anatomy, variants and states | Keyboard / AT | Responsive / RTL / themes; prohibited behavior |
| --- | --- | --- | --- |
| Button / Link | Label + optional future icon/busy text; primary/secondary, rest/hover/active/focus/disabled/busy(S except busy P). Link navigates; button acts. Busy retains label and reports pending, not success | Native buttons Enter/Space; links Enter; real disabled removed from tab order with nearby reason. No clickable div or icon-only sign/release | Wrap label/action groups;44px floor; mirror only directional icon. No auto clinical retries, bundled sign/share/close or fake submit. |
| Field / Input / Select | Visible label/control/hint/error/required marker; neutral, invalid, disabled, read-only(P), filled(S). Native select baseline; value is not placeholder label | Associate hint/error through describedby, invalid state and explicit error text; native select keyboard. Future validation summary links to first invalid field; don't erase entered value | Full width narrow; Arabic label aligns start; values retain their own direction. Invalid border and error text independently tested each theme. |
| Card | Heading/body/optional metadata/actions; task/context/quiet source variants(S); loading/empty/error via inner region | Section/heading semantics; card itself not a nested interactive element | Natural height and same-order stacking; border-led separation, no card-wide click enclosing links. |
| Search | Label/query/explicit search action/results/status; query input(S), results loading/none/error(P) | Native search; future submit Enter; result count only for currently authorized source; polite status. No incomplete custom combobox | Wrap long names; safe public clinician search only in Patient example; never unauthorized patient directory. No request is sent by proof. |
| Navigation | Labelled landmark/link/current marker; global vs local task links(S), compact candidate A/B(S) | Links keep browser semantics, current-page attr; no menu role for ordinary navigation. Active state has border/underline as well as color | A/B owner-gated; placement changes DOM with view. Secondary retrieval remains explicit. No extra five-portal switch or authorization inference. |
| Dialog / Drawer | Title/description/body/close/actions; modal dialog(S), nonmodal drawer(P), pending/error(P) | Native showModal containment, initial safe close focus, Escape closes proof, focus restores opener. Future destructive dialogs require separately approved confirmation semantics | Width ≤36rem and viewport minus32px, own vertical scroll; no clipped close. Nonmodal drawer never traps focus; modal drawer follows dialog contract. Never discard unsaved authored text silently. |
| Tabs | Labelled list/tab/panel, selected/unselected/focus/disabled(P); proof local tasks use links, not faux tabs | Future in-page tabs roving tabindex, Left/Right with locale-consistent visual direction, Home/End; manual Enter/Space activation for expensive panels | Wrap to labelled task selector if necessary; no horizontal clipped labels; no forced DOM reorder or unsupported Lab/AI tab. |
| Table / List | Caption/header/row identity/source state/paging; static source list(S), tabular/sorted/paged(P) | Real headers/scope, sort button with aria-sort, explicit paging; rows contain canonical links. No focusable entire row with nested controls | Narrow labelled list keeps identity/status/date/actions; genuine2D table may use named keyboard scroll region plus equivalent list. Never hide critical cell or calculate private counts client-side. |
| Alert / Status | Text + optional semantic icon, reason/recovery/source; form error/warning/success(S), neutral clinical/denied/uncertain(S) | Initial static strip is not repeatedly live-announced. New result status polite; urgent blocking failure alert once. Persistent consequential outcome remains visible | Text/icons, not violet/apricot health meaning. No disappearing-only signature proof, PHI toast or CLOSED=complete claim. |
| Skeleton / Empty / Error | Stable public shape and scoped busy label(S), explicit permitted empty(S), error/denied/uncertain(S) | Busy only its region; decorative bars hidden. Future retry explicit, reauthorized read only; no repeated announcements | No inferred hidden item lengths/counts. Unauthorized case suppresses payload/IDs/references/counts. Empty≠zero inaccessible records. |
| Appointment | Status, full doctor, clinic, date/endpoints/zone, explicit details action(S); empty/cancelled/rescheduled/error(P) | Real detail button opens inspection; no booking command. Read date in labelled chronological order | Responsive date anchor; never truncate doctor's name or zone. Booking grants ZERO clinical authority; recommendation≠booking. |
| Consultation | Patient+visit+current authority, local documentation, per-source state, independent next actions(S); revoked/closed/recovery(P) | Heading and link order retain context; private-note sign, summary sign/release, follow-up release, Review & Close stay independent; proof mutations disabled | Stack context before work; no sticky obstruction. Current assignment rechecked by backend in future integration. Authorship/membership/admin/booked role alone does not grant chart access. |

## DSV2-02 — time conflict and exact proposed decision

Gallery compares accepted **12 November2026 ·15:00–15:30 ·Africa/Cairo(UTC+02:00)** with patient proposal **12 نوفمبر2026 ·3 مساءً–3:30 مساءً**, both labelled alternatives. Fixture instants `2026-11-12T13:00:00Z`→`2026-11-12T13:30:00Z`; actual zone offset applies to that date only, not permanent UTC+02. Consequential sources must preserve exact instants, date, event zone, seconds where contract-relevant, repeated-hour offsets and cross-midnight endpoint dates. Browser formatting/parsing/storage and server eligibility are unchanged.

Owner options and exact amendment language are in [DECISION_GATES](DECISION_GATES.md). A preference for natural3 مساءً is design input, not formal replacement of accepted CD07. No universal12h rule or inferred hidden timezone is adopted.

## Preserved authority and review boundary

Patient sees own permitted released information; no private-note existence/counts in My Care. Current `ClinicianPatientAssignment` grants clinical access; booking grants ZERO. Private signing does not release, source release is independent, closing neither signs nor shares. Wrong-patient payload/ID/reference/count suppression, current-authority replay, immutable history and no automatic clinical write retry remain binding. Denial strip is generic proof, not a live authorization test. Admin has no blanket chart, impersonation or assignment-creation shortcut. Pharmacy requires exact route/current membership/org authority and reduced history; Laboratory/AI/longitudinal continuity remain FUTURE/NOT LIVE. Accepted all-five-portal scope stays in the pinned blueprint, not implemented in this two-role proof.

AP03 actual Android/iOS installed PWA, actual Firefox/Safari/Chrome/Edge, OS text and physical print remain OPEN. Preserve the five Type3 glyph bounding-box warnings in the prior PDF risk register; no new PDF or print PASS is claimed. AP05 underlying artwork creator permission/originality/exclusivity/trademark remains OPEN; font OFLs are not logo rights clearance. Existing Live integration/hosted-I3 parity and native Egyptian editorial/AT debt remain. A whole-project health review is prerequisite before a major frontend phase; this task does not execute that audit or fix runtime defects. Technical Green is not product/design approval. Stop at one Draft PR for Product Owner review; no ready transition, final DS adoption, merge, deployment or automatic next stage.
