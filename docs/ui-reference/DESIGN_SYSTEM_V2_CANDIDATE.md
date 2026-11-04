# EgyHealth 360 — Design System V2 Candidate (Patient + Clinician)

**Status: CANDIDATE FOR INDEPENDENT REVIEW / PRODUCT OWNER DECISION. NOT FINAL BRAND V2, NOT A DESIGN SYSTEM FREEZE, NOT AN IMPLEMENTATION AUTHORIZATION.**

Source checkpoint:
- Patient My Care visual master: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`, PR #79 **[final visual sign-off comment 6593490637](https://github.com/abuhmaid28/egyhealth360/pull/79#issuecomment-6593490637)**. Still OPEN / UNMERGED.
- Clinician Active Consultation Patient-DNA master: `6fbd247a09d774fa42d9712068699753a88e10e6`, PR #80 **[independent premium visual pass comment 6613466373](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6613466373)**. Still OPEN / UNMERGED; **Product Owner's final acceptance is a distinct, outstanding gate**.
- These reviews approve bounded visual slices, not Final Brand V2, a universal component library, a logo, mobile Clinician product architecture or cross-portal rollout.
- This audit-corrected document is **still a candidate**, not complete source-selector inventory or a frozen design standard.
- Existing approved UX/IA/content rules and actual backend/security/clinical contracts override presentation convenience.
- No new clinical feature is authorized by this document.

## 1. Source of truth and decision boundaries

**Observed implementation truth** (the CSS and accepted screenshots):
- `apps/web/src/components/patient-my-care.module.css`
- `apps/web/src/components/clinician-consultation.module.css`
- `docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md`
- `docs/ui-reference/CLINICIAN_PATIENT_DNA_PREMIUM.md`
- `docs/INFORMATION_ARCHITECTURE.md`, `docs/CONTENT_SYSTEM.md`, `docs/ARABIC_UX.md`.

This document distinguishes **extracted** values from **proposed** abstractions. Exact implementation CSS takes priority for the existing accepted slices. A future implementation may consolidate tokens and components only after a bounded migration plan, accessibility regression and explicit authorization. Avoid silently redefining approved visuals while generalizing.

No logo symbol is approved. The only currently accepted brand presentation is the existing text wordmark: **EgyHealth 360**. Do not add an E, plus, cross, shield, heart, stethoscope or new medical emblem. Final icon/app-icon/brand lockup has a separate owner gate.

## 2. Visual product architecture

**One product, two densities:**
- **Care mode — Patient:** consumer-friendly, warm clarity, strong appointment anchor, purposeful hierarchy, compact next actions and a calm integrated shortcut surface. Mobile is first class.
- **Clinical mode — Clinician:** the *same* type, colors and controls, with denser information, three connected work planes, private-vs-patient-visible audiences and independent consequential actions. Desktop is the first visual acceptance target.

Do not transfer the Patient dashboard-style information order into a dense clinical editor, or flatten Patient into the Clinician utility style. Shared tokens, component behavior and brand make the connection; content density follows the task.

Forbidden visual drift: purple, paper/beige journal style, hospital-software-from-2012 aesthetic, random dark console, glows, glass effects, 20 unrelated KPI cards, mismatched icon families and generated brand marks.

## 3. Extracted tokens (current CSS values)

### Color primitives

| Name | Value | Current meaning |
| --- | --- | --- |
| Navy | `#0B2545` | Brand orientation / private-note audience accent |
| Teal | `#0B6E7F` | Primary action / navigation / patient-visible accent |
| Teal dark | `#084E5A` | Emphasis / hover |
| Aqua | `#14B8A6` | Restrained accent only |
| Blue | `#3B82F6` | Additional accent, not a medical finding |
| Canvas | `#F7F9FC` | Application background |
| Surface | `#FFFFFF` | Primary panel/form |
| Surface alt | `#F1F5F9` | Quiet grouped surface |
| Border | `#E2E8F0` | Default separation |
| Border strong | `#CBD5E1` | Controls / emphasized separation |
| Ink | `#0F172A` | Main text |
| Secondary | `#475569` | Supporting text |
| Muted | `#526178` | Accessible muted copy in accepted implementation |

### Semantic color primitives — not universal text combinations

| Meaning | Accent / indicator primitive | Light surface primitive | Text rule |
| --- | --- | --- | --- |
| Success | `#16A34A` | `#ECFDF3` | Prefer readable ink/navy status text; do **not** assume green is contrast-safe on this surface |
| Warning | `#B7791F` | `#FFF8E6` | Prefer readable ink/navy status text; preserve explicit wording |
| Error | `#DC2626` | `#FEF2F2` | Prefer ink/navy for normal text; verify red text on its actual background before use |
| Info | `#2563EB` | `#EFF6FF` | Verify contrast for each rendered text size/state; not universally approved |

**D1 correction:** The accent and surface entries above are **raw tokens**, not approved `foreground/background` pairs. The independent review measured ordinary-text contrast of approximately **3.12:1 success**, **3.44:1 warning**, **4.41:1 error** for accent-on-matching-surface; each misses the usual **4.5:1** normal-text threshold. An accent can still be used as a restrained indicator with a separate qualifying non-text-contrast test. Actual accepted status badges often render ink/navy copy on semantic surfaces or use accent separately. Before any new semantic component ships, test its actual CSS color/background/size against applicable WCAG criteria, including hover, disabled and focus states. Do **not** silently change approved primitive hex codes to remedy this candidate-doc error.

Semantic colors describe **actual verified state**, never diagnosis or inferred medical facts. Teal selection is not clinical success. Missing, UNKNOWN or NOT_REVIEWED allergy state never becomes “no allergies”. Redaction/errors must not leak forbidden details.

### Clinician scoped CSS alias resolution (D2 — extracted)

In `apps/web/src/components/clinician-consultation.module.css`, the `[data-clinician-master]` scope maps legacy UI aliases to the actual Patient tokens as follows:

| Clinician alias | Effective value / source |
| --- | --- |
| `--navy` | `var(--care-navy)` = `#0B2545` |
| `--blue`, `--teal` | `var(--care-teal)` = `#0B6E7F` (**not** `#3B82F6`) |
| `--blue-dark`, `--teal-dark` | `var(--care-teal-dark)` = `#084E5A` |
| `--blue-soft`, `--teal-soft` | `var(--care-alt)` = `#F1F5F9` (**not** blue or teal tints) |
| `--ink`, `--muted` | `var(--care-ink)`, `var(--care-muted)` |
| `--line`, `--canvas`, `--white` | `var(--care-border)`, `var(--care-canvas)`, `var(--care-surface)` |
| `--amber`, `--shadow` | `var(--care-warning)`, `none` |

These are compatibility aliases of the existing Clinician presentation; **do not rename or consolidate them without auditing actual selectors and rendering**.

### Typography

- English/Latin: existing locally served **Manrope** (`EH My Care Manrope`). Arabic: existing locally served **IBM Plex Sans Arabic** (`EH My Care Arabic`).
- Care root: body 15px, line-height 1.6; RTL line-height 1.8. Care H1 32/600/1.2, H2 24/600/1.3, H3 16/600/1.4; RTL headings use appropriate taller line-height, no negative tracking.
- Clinician root: body 14px/1.6, RTL 1.8; H1 22px/1.3, H2 18px/1.4, H3 15px/1.5 (RTL headings 1.5).
- Numeric data should use tabular numbers. Preserve actual source strings, including signed/private narratives and patient display names.
- The above are **root/heading-level extracted sizes only** and do **not** enumerate component overrides. Examples requiring usage mapping: Patient `.doctorInfo h3` is 20px; review/dialog titles and specific component headings vary (including ~20/22px). Media/container queries and responsive overrides have distinct computed results.
- A universal semantic type scale is **proposed**; no typography normalization or cascade changes are authorized.

### Radius / depth / spacing

- Extracted corner tokens: XS 6px, SM 8px, MD 12px, LG 16px.
- Patient surface shadow: `0 1px 2px rgb(15 23 42 / 4%), 0 8px 24px rgb(15 23 42 / 4%)`; Clinician connected editor planes deliberately have no resting shadow, **but dialogs have separate elevation** (e.g., a scoped modal uses `0 12px 32px rgb(11 37 69 / 10%)`). Do not flatten this distinction during extraction.
- This inventory is **partial** (D3). Literal/local styles remain outside the named root tokens: e.g., `#EAF6F8` in Patient selected nav, `#D7E9EE` for Patient clinician monogram, 20px Patient card titles, role-specific dialog headings, breakpoint text sizes, surface and focus overrides. Future inventory must attach `file → selector → property → computed value → viewport/state` and cascade exceptions before consolidation.
- Use borders, rhythm and elevation only when functionally warranted.
- Spacing family: 4/8/12/16/20/24/32/40/48/64px (candidate **abstraction** of accepted rhythm).
- Root header ~72px; max container 1440px, desktop left/right padding 40px; at 1600px screenshot this gives 1360px usable content.
- Patient strong appointment anchor uses navy→teal; Clinician visit anchor uses the same family, compact nominal ~104px, with a connected white local task bar.
- The current Clinician desktop authoring plane is ~200px outline / flexible ~790px authoring / 280px context rail with 24px gaps at 1600px; preserve proportional priority rather than hard-coding it for smaller widths.

### Controls and accessibility

- Minimum interactive target 44×44px. Mobile primary actions nominal >=48px.
- Inputs at least ~44px; labels must remain visible and programmatically associated.
- Focus: conspicuous 3px teal ring (white ring on dark anchor when needed), with visible offset; never color alone.
- **Existing code-backed behavior:** scoped dialogs implement focus containment/restoration; accepted captures demonstrate visible focus and EN/AR reflow. These are not proof of all assistive-technology behavior.
- **Future acceptance requirements (not yet proven):** native-device and major-browser keyboard/assistive audits, announcement order and screen-reader dialogue semantics, focus return after each consequential action, escape where safe, and differentiation of disabled, pending, uncertain and permission-denied. Do not present screenshot evidence as native AT certification.
- Respect reduced motion. Do not animate clinical success or privacy actions as celebrations.
- Existing patient icons are the single permitted family for now; no new external medical-icon pack or icon-as-logo.

## 4. Candidate component taxonomy (D4–D6; not yet a shared code package)

**Source labels:** `OBSERVED` = accepted slice implementation; `PROPOSED` = possible abstraction requiring separate implementation review. A visual similarity is **not** evidence of a shared component or behavior.

| Pattern | Patient My Care | Clinician Active Consultation | Status / behavioral boundary |
| --- | --- | --- | --- |
| `ProductShell` | Header, text wordmark, locale/account | Same Patient-family header primitives | OBSERVED style reuse; destinations must be truly implemented |
| `ContextAnchor` | Appointment hero | Compact visit ribbon | OBSERVED visual family; source-backed facts only |
| `DestinationNav` | Quick-access destinations + mobile bottom navigation | **Not applicable** to the Clinician local tasks | OBSERVED Patient behavior: route navigation, real destinations; cannot replace in-page anchors |
| `SectionAnchorNav` | **Not established from My Care** | `#live-documentation`, `#live-follow-up`, `#review-close`, using `aria-current="location"` | OBSERVED Clinician behavior: scroll/anchor navigation, not route changing |
| `ConnectedSurface` | Integrated shortcuts / recent care | Connected three-plane authoring workspace | OBSERVED visual pattern; density-specific layout, not a universal `Card` |
| `ActionRow` | Next-for-you items | Save/sign/release/close action groups | PROPOSED shared visual grammar; operation semantics are separate and must be individually verified |
| `SourceState` | Recent care availability (limited visibility) | Loaded private/summary/allergy/source rail | Distinct **server-loaded state**, not unsaved editor content |
| `AudienceBoundary` | Displays only allowed/released patient information | Private note (navy) vs patient summary (teal), independent sign/release | OBSERVED Clinician audience treatment; a **proposed cross-role abstraction**, not an observed My Care control |
| `FieldControl` | My Care local selects are limited Demo utilities; **no reusable clinical form component established here** | Clinical authoring inputs/selects | PROPOSED cross-role token alignment, not a source-backed shared Patient component |
| `ReviewDialog` | **Not demonstrated as a My Care consequential dialog** | Actual summary sign/release and independent consultation close | OBSERVED in Clinician only. Future Patient mapping requires separate evidence |
| `SafeState` | Demo, empty/loading/availability as rendered | Loading, error, redacted, signed, closed, uncertain | PROPOSED taxonomy; never collapse authorization, lifecycle or clinical-content state |

### Independent state axes (D6 — preserve actual semantics)

| Axis | Examples | Required interpretation |
| --- | --- | --- |
| Visit lifecycle | OPEN, CLOSED | Closing is a separate action; it does **not** save, sign or release existing material, nor create a blanket prohibition on separately authorized edits after closure |
| Content provenance | unloaded/unselected, **loaded saved draft**, signed private, signed-and-released summary | The Clinician source rail reflects selected **server-loaded** state; unsaved editor values remain separate. A loaded draft is never implicitly patient-visible |
| Audience/authority | private author, released to patient, permission redacted | Recheck active assignment/current authority. Invalidation/redaction must remove protected projections, IDs and revealing state, not preserve a disconnected source snapshot |
| Review/finding | NOT_REVIEWED, UNKNOWN, REVIEWED_NO_KNOWN, human positive findings | Unknown/not reviewed are **not** medical negatives; presentation may not infer allergy status |
| Command outcome | idle, pending, success, known failure, uncertain outcome | A timeout/uncertain result cannot be retried automatically or rendered as confirmed saved/released |
| Navigation/availability | active route, local current section, unavailable destination | Visually similar controls have different semantics; no fabricated functional People directory |

A code-level component API, state model, selector inventory and clinical safety review **must precede** any consolidation. No `packages/ui` migration occurs in this candidate. A universal `Card` must not erase clinical consequences, audience boundaries or behavior differences.

## 5. Bilingual, RTL, date and medical-state rules

- Arabic UI: polished, modern Egyptian Arabic for ordinary tasks; precise unambiguous wording for clinical signing, release, restriction and closing. Author real Arabic equivalents rather than blind English mirroring.
- Use logical CSS properties and intentional RTL order. Preserve bidi isolation of mixed names, English content, timezone and values.
- Latin digits, named Gregorian months and 24h time based on the **actual event timezone**, displaying zone/offset when relevant.
- Do not translate or normalize entered patient/doctor names, recorded clinical content, diagnoses, prescribed text or signed sources.
- Status vocabulary must distinguish OPEN/CLOSED, SAVED/SIGNED/RELEASED, DRAFT/UNSELECTED, UNKNOWN/NOT_REVIEWED/REVIEWED, unavailable vs restricted.
- An active booking or membership does not itself grant clinical access. Approved patient-provider assignment and current authority are essential; UI must never display unauthorized clinical data.

## 6. Responsive acceptance baseline and states

**Care/Patient:** accepted screenshots include 1600 desktop and 390×844 mobile EN/AR with 320px, 200% text, full-page and focus evidence. These screenshots demonstrate reviewed compositions, **not** universal AT/device compliance. Preserve readable shortcuts without splitting single words.

**Clinical/Clinician:** accepted visual evidence includes 1600 EN/AR, 1280, 200% text, keyboard focus, full-page, long text, release/close review, signed/closed and error/redaction states. These are measured browser/screenshot checks, not native/screen-reader certification. Narrow reflow is structural, **not** an approved mobile Clinician redesign.

**Cross-cutting**: loading, empty, error, unavailable, permission redacted, action pending, success, uncertainty/no automatic retry, disabled, focus, long Arabic/Latin content. Do not create purely aesthetic success screens with nonexistent backend actions.

## 7. Implementation extraction plan — gated separately

1. **Complete the missing inventory (D3):** every token and local literal with file, selector, property, cascade, font override, breakpoint, role and state. Distinguish effective computed values from declarations.
2. Define semantic aliases (e.g., `text-primary`, `surface-subtle`, `action-primary`, `audience-private`) **without changing accepted rendered values**. Keep raw primitives explicit.
3. Build documented component examples and accessibility/state matrices from *actual accepted screens*, not imagined product screenshots.
4. Run a **no-visual-diff trial** extracting only a narrowly chosen primitive (e.g., type/font utility or focus ring). Preserve CSS module scoping to prevent bleed.
5. Prove each extraction using actual route screenshots, visual diff, 320/390/1280/1600 where applicable, 200%, RTL, browser tests and exact-head CI.
6. Only after independently reviewed candidate and **explicit owner authorization** may shared primitives move to `packages/ui` or other portals adopt the design.

**Not authorized now:** Final Brand V2/logo/icon selection, Design System V2 freeze, mass refactor, new clinical workflows, pharmacy/lab redesign, Lab I3 implementation, dependency churn, merge, release or production promotion.

## 8. Acceptance checklist for this candidate

- [x] Root color/radius/Patient shadow declarations and Clinician alias mapping reconciled to accepted source; **full selector inventory remains open**.
- [x] Candidate component relationships labeled observed vs proposed; independent state axes and distinct nav behavior documented.
- [ ] Exhaustive per-selector/per-breakpoint usage and measured contrast + AT audit (not yet completed).
- [x] EN/AR, RTL, privacy, audience and uncertain-command contracts separated from implementation proof; **native/browser/AT acceptance remains open**.
- [x] No new logo, medical capability or runtime change proposed in these documentation corrections.
- [ ] Dedicated owner decision on Final Brand/Design System approval still pending.
- [ ] Any future release follows a separate exact-commit deployment checklist.

**Audit disposition:** D1–D8 candidate-document corrections incorporated. **Final candidate acceptance is still pending independent re-review and Product Owner decision.** The Clinician independent visual approval does not replace Product Owner final sign-off. No brand/logo freeze, code extraction, UI rewrite, PR merge or release authorization follows from this document.
