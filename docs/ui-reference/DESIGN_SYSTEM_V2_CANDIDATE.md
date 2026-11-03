# EgyHealth 360 — Design System V2 Candidate (Patient + Clinician)

**Status: CANDIDATE FOR INDEPENDENT REVIEW / PRODUCT OWNER DECISION. NOT FINAL BRAND V2, NOT A DESIGN SYSTEM FREEZE, NOT AN IMPLEMENTATION AUTHORIZATION.**

Source checkpoint:
- Patient My Care accepted visual master: `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0` (PR #79, still open).
- Clinician Active Consultation Patient-DNA accepted visual master: `6fbd247a09d774fa42d9712068699753a88e10e6` (PR #80, still open).
- The two visual approvals are **slice-level** reviews, not approval for all portals, a new logo, or cross-project rollout.
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

### Semantic colors

| Meaning | Foreground | Background |
| --- | --- | --- |
| Success | `#16A34A` | `#ECFDF3` |
| Warning | `#B7791F` | `#FFF8E6` |
| Error | `#DC2626` | `#FEF2F2` |
| Info | `#2563EB` | `#EFF6FF` |

Semantic colors must describe **actual state**, never diagnose, infer a medical fact or substitute for copy. A teal selected state is not a clinical success state. Do not infer “no allergies” from absent, UNKNOWN or NOT_REVIEWED data. Errors/redaction must not leak forbidden details.

### Typography

- English/Latin: existing locally served **Manrope** (`EH My Care Manrope`). Arabic: existing locally served **IBM Plex Sans Arabic** (`EH My Care Arabic`).
- Care root: body 15px, line-height 1.6; RTL line-height 1.8. Care H1 32/600/1.2, H2 24/600/1.3, H3 16/600/1.4; RTL headings use appropriate taller line-height, no negative tracking.
- Clinician root: body 14px/1.6, RTL 1.8; H1 22px/1.3, H2 18px/1.4, H3 15px/1.5 (RTL headings 1.5).
- Numeric data should use tabular numbers. Preserve actual source strings, including signed/private narratives and patient display names.
- The above are **extracted current role-specific sizes**, not a license to force one universal heading scale. A unified semantic type scale is a **candidate** requiring review.

### Radius / depth / spacing

- Extracted corner tokens: XS 6px, SM 8px, MD 12px, LG 16px.
- Patient surface shadow: `0 1px 2px rgb(15 23 42 / 4%), 0 8px 24px rgb(15 23 42 / 4%)`; Clinician connected editor planes deliberately have no resting shadow. Use borders, rhythm and elevation only when functionally warranted.
- Spacing family: 4/8/12/16/20/24/32/40/48/64px (candidate **abstraction** of accepted rhythm).
- Root header ~72px; max container 1440px, desktop left/right padding 40px; at 1600px screenshot this gives 1360px usable content.
- Patient strong appointment anchor uses navy→teal; Clinician visit anchor uses the same family, compact nominal ~104px, with a connected white local task bar.
- The current Clinician desktop authoring plane is ~200px outline / flexible ~790px authoring / 280px context rail with 24px gaps at 1600px; preserve proportional priority rather than hard-coding it for smaller widths.

### Controls and accessibility

- Minimum interactive target 44×44px. Mobile primary actions nominal >=48px.
- Inputs at least ~44px; labels must remain visible and programmatically associated.
- Focus: conspicuous 3px teal ring (white ring on dark anchor when needed), with visible offset; never color alone.
- Use focus trapping and return-of-focus for dialogs; keyboard access, escape where safe, and disabled action state clearly distinguishable from pending.
- Respect reduced motion. Do not animate clinical success or privacy actions as celebrations.
- Existing patient icons are the single permitted family for now; no new external medical-icon pack or icon-as-logo.

## 4. Candidate component taxonomy (not yet a shared code package)

| Pattern | Patient source | Clinician source | Boundary |
| --- | --- | --- | --- |
| `ProductShell` | My Care header, utilities, account | Consultation header and local utility | Text wordmark only; role destinations must be real |
| `ContextAnchor` | Appointment hero | Compact visit ribbon | Same gradient family; only source-backed facts |
| `LocalTaskNav` | Purposeful shortcuts/bottom nav | Documentation / Follow-up / Review & Close | Current route/task meaning; no inert “active” tools |
| `ConnectedSurface` | Shortcuts and recent care | One coherent 3-plane editor | Avoid card proliferation |
| `ActionRow` | Next-for-you item | Documentation action groups | Correct target + allowed operation |
| `SourceState` | Recent care availability | Private note / summary / review status | Label saved vs unsaved separately |
| `AudienceBoundary` | Patient-visible released summary | Private Note navy / Patient Summary teal | Sign/release never implied by save or close |
| `FieldControl` | Care-friendly forms | Dense professional forms | Same focus and errors, role-dependent density |
| `ReviewDialog` | Consequence-aware patient interactions | Release review / Review & Close | Scoped clinical copy + explicit acknowledgements |
| `SafeState` | Empty / loading / Demo disclosure | Loading / error / redaction / signed / closed | No false authority or stale protected values |

No `packages/ui` migration occurs in this candidate stage. First catalog actual reusable API/props and risk, then extract stable primitives behind regression tests. Avoid making a generic global `Card` that erases differences in audience or clinical consequence.

## 5. Bilingual, RTL, date and medical-state rules

- Arabic UI: polished, modern Egyptian Arabic for ordinary tasks; precise unambiguous wording for clinical signing, release, restriction and closing. Author real Arabic equivalents rather than blind English mirroring.
- Use logical CSS properties and intentional RTL order. Preserve bidi isolation of mixed names, English content, timezone and values.
- Latin digits, named Gregorian months and 24h time based on the **actual event timezone**, displaying zone/offset when relevant.
- Do not translate or normalize entered patient/doctor names, recorded clinical content, diagnoses, prescribed text or signed sources.
- Status vocabulary must distinguish OPEN/CLOSED, SAVED/SIGNED/RELEASED, DRAFT/UNSELECTED, UNKNOWN/NOT_REVIEWED/REVIEWED, unavailable vs restricted.
- An active booking or membership does not itself grant clinical access. Approved patient-provider assignment and current authority are essential; UI must never display unauthorized clinical data.

## 6. Responsive acceptance baseline and states

**Care/Patient:** 1600 desktop and 390×844 mobile EN/AR both first-class; verify 320px, 200% text, full-page, focus and bottom navigation. Preserve readable shortcuts without splitting single words.

**Clinical/Clinician:** 1600 EN/AR master, 1280 responsive adjustment, 200% text, keyboard focus, full-page, source states, long text, release/close modal, signed/closed, error and redaction. Narrow reflow is structural, **not** an approved mobile-clinician redesign.

**Cross-cutting**: loading, empty, error, unavailable, permission redacted, action pending, success, uncertainty/no automatic retry, disabled, focus, long Arabic/Latin content. Do not create purely aesthetic success screens with nonexistent backend actions.

## 7. Implementation extraction plan — gated separately

1. Create a sourced component/token inventory with file references and per-token usage across Patient/Clinician.
2. Define semantic aliases (e.g., `text-primary`, `surface-subtle`, `action-primary`, `audience-private`) **without changing accepted rendered values**. Keep raw primitives explicit.
3. Build documented component examples and accessibility/state matrices from *actual accepted screens*, not imagined product screenshots.
4. Run a **no-visual-diff trial** extracting only a narrowly chosen primitive (e.g., type/font utility or focus ring). Preserve CSS module scoping to prevent bleed.
5. Prove each extraction using actual route screenshots, visual diff, 320/390/1280/1600 where applicable, 200%, RTL, browser tests and exact-head CI.
6. Only after independently reviewed candidate and **explicit owner authorization** may shared primitives move to `packages/ui` or other portals adopt the design.

**Not authorized now:** Final Brand V2/logo/icon selection, Design System V2 freeze, mass refactor, new clinical workflows, pharmacy/lab redesign, Lab I3 implementation, dependency churn, merge, release or production promotion.

## 8. Acceptance checklist for this candidate

- [ ] Exact Patient CSS tokens and Clinician inherited values independently reconciled.
- [ ] Every proposed abstraction clearly labeled proposed vs extracted.
- [ ] Source-backed component inventory and explicit usage examples for both densities.
- [ ] EN/AR, RTL, accessibility, audience, privacy and uncertain-command state requirements reviewed.
- [ ] No invented logo or UI feature; no clinical behavior change.
- [ ] Dedicated owner decision on Final Brand/Design System approval still pending.
- [ ] Any future release follows a separate exact-commit deployment checklist.

**Decision requested:** approve this *candidate documentation* as the starting design contract, or return specific issues. That is not a brand/logo freeze and does not authorize any UI rewrite.
