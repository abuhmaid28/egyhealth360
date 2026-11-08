# Unified visual foundation proposal

PROPOSAL for Product Owner review. One identity for Patient, Doctor, Pharmacy, Laboratory and Admin; only Patient My Care is designed here. This is neither final Brand V2 nor Design System V2. [Rendered language board](evidence/visual-language.png), [live board source](language.html), [semantic tokens](tokens.css).

## Art direction and hierarchy

NOVA's appointment-led hierarchy, framed interactive navigation, asymmetric softened corners, generous Arabic type and independent clinical sources remain. The new architecture uses a quiet Light canvas, one Nile-family dark appointment anchor, one connected white shared-source plane and open retrieval rows. Depth is a restrained contact shadow, not a glow. The date becomes a precise typographic calendar instead of an orbital decoration. A darker action derivative serves light surfaces; a brighter turquoise derivative serves dark surfaces. Gold is reserved for a small appointment marker/date repeat and the original logo ribbon/head.

This changes the relationships between surfaces, not merely their hues. It trades the previous all-dark theatrical character for stronger contrast between the immediate appointment and supporting shared information. The owner may judge that tradeoff; technical scores cannot settle it. No competing purple/lime role remains in candidate CSS. Historical purple/lime is shown only in the explicitly labelled comparison.

## Shared brand and semantic colors

| Role | Proposed values | Rule |
| --- | --- | --- |
| Identity | Nile Night `#0B3D4A`, Turquoise `#0FB5A8`, Gold `#E3B45C`, Light `#F7F9FA` | Starting palette from #97. Exact selected SVG gradients/geometry unchanged. |
| Dark surfaces | Anchor `#092D38`, elevated `#124653`, hover `#1B5360` | Dark hierarchy anchored in Nile Night, not a separate portal palette. |
| Light surfaces | White `#FFFFFF`, soft `#EDF4F5`, selected `#DDF2EF` | Canvas stays mostly neutral. White source content contrasts with the dark care anchor. |
| Text | Strong Nile Night; muted `#45616A`; on dark Light; muted dark `#BDD4DA` | Metadata remains readable. Do not use bright brand turquoise/gold as light-surface body text. |
| Borders | Divider `#D6E3E7`; essential control boundary `#5D7B83`; on dark `#64858D` | Subtle dividers are decorative; essential boundaries use a stronger role. |
| Interaction | Light action `#087F79`, hover `#06645F`; dark action `#48D5C7` with ink `#062E37` | Brand turquoise informs the family, but accessible derivatives serve actual surfaces. |
| Focus | Light `#006F70`; dark `#F3CD82` | 3px outline, 4px offset, 2px surface separation. Focus gold is interaction feedback, never clinical warning. |
| Success | Ink `#226344` / fill `#E4F2E9`; on dark `#B5E5C5` | Explicit confirmed/recorded fact + check. Never infer medical health, adherence or authorization. |
| Warning | `#805000` / `#FFF1D9` | Explicit caution + icon and consequence text. Distinct from brand gold; no guessed clinical triggers. |
| Error | `#A42D3D` / `#FDECEF` | Read failure or supported operation error + explicit recovery. Never encode failure as empty or success. |
| Information | `#245D85` / `#E8F2FA` | Neutral explanatory information + label. No implied medical interpretation. |
| Unavailable | `#4D5966` / `#EDF0F3` | Uniform unavailable treatment; never reveal absent versus denied, source details or counts. |

Role names in tokens.css are the authority for this proposal; components reference roles, not ad hoc colors. Brand accents are not clinical statuses. Native disabled controls need explicit reason/alternative text and later control-specific validation; this slice's unavailable prescriptions are noninteractive text, not a fake active button. Semantic swatches are visual proposals, not new clinical policy.

## Typography

One product system: **Inter** for English and Latin number runs; **IBM Plex Sans Arabic** for Arabic. Files/notices match #97. This deliberately adopts the foundation's proposed Inter in place of the prior NOVA Manrope; no other portal gets a separate family. The immutable logo's outlined lettering remains unchanged and has disclosed source-fit approximations.

| Role | Starting size / weight | Treatment |
| --- | --- | --- |
| Page title | 44px desktop / 36px mobile, 600–700 | One title; bounded balanced wrapping. |
| Appointment identity | 32px desktop / 26px mobile, 600 | Explicit doctor and clinic precede action. |
| Time | 48px desktop / 36px mobile, 400–600 | Start dominant; end/duration context stays available. |
| Section / source title | 18–22px / 20–22px, 600 | Distinct source purpose without competing with appointment. |
| Body | 16px / 400 | English 1.7, Arabic 1.85 unitless line-height. |
| Labels / metadata | 13–16px / 400–600 | No clinical consequence in tiny text. Arabic marks have vertical room. |

Use rem-based text, content-driven block heights, full essential labels, no line clamps. No Arabic letter spacing. The longest English source labels may wrap at extreme text enlargement. Navigation moves controls into rows before breaking Arabic words.

## Spacing, shapes and depth

4px base; prefer 8/12/16/20/24/32/40/64 spacing. Desktop shell inset 64px, tablet 40px, mobile 20px. Actions use 14px corners; panels 26–28px with one 10–12px corner where needed to retain NOVA's rhythm. Avoid giving every content row its own card. An appointment is a bounded action anchor; related shared sources form a connected plane with internal rules. Separate sources retain independent headings, author/date and actions.

One restrained shadow token supports major planes. No CSS gradients, decorative medical photos, artificial glow, random ornaments or portal-specific logo effects. Supplied SVG gradients are a preserved identity material, not a recipe for every background.

## Components and iconography

- **Primary button:** explicit verb/object, 56px target in appointment, solid accessible turquoise derivative on dark or dark teal on light, visible hover/focus. One dominant action per task context.
- **Secondary button:** white/outlined with dark teal ink, at least 52px in sources; hover selected pale tone. It remains visually subordinate while preserving a meaningful object label.
- **Navigation:** accepted My care + Find care only. Nile Night active tile with turquoise lower edge and `aria-current`; inactive tile with named icon and text. Native links/buttons, no custom tabindex order. Mobile becomes a full-width rail and wraps when enlarged content needs room.
- **Icons:** same original 24-unit outline vocabulary from #94, 1.7px rounded strokes, 20–32px displayed. A framed 38–58px organic container marks identity/source context; quiet unframed icons serve retrieval. No new AI, clinical-status, pharmacy or laboratory icon inventions in this sprint.
- **Appointment:** explicit confirmed logistics, doctor, clinic, full date, local start/end time and details. No appointment-created clinical access. Gold date repeat is decorative; the full semantic date is always present. Narrow English omits its duplicate month to avoid fragmentation.
- **Clinical source:** source type/state → title/purpose → author + source date → independent action. Follow-up recommendation explicitly is not a reservation; missing link is qualified “here.” Summary and follow-up are not combined or auto-released.

## States, privacy and recovery

Six URL-controlled synthetic specimens preserve #94 meanings: normal, loading, empty, read error, no shared sources, unavailable. Loading removes appointment facts/confirmation, uses a static skeleton and outside status announcement. Empty is bounded available information, never a clinical recommendation. Read error preserves uncertainty and offers a labelled read-only reload preview. No-sources/unavailable remove source articles, author/date/references/counts and private/draft hints. Shared sources may independently remain while appointment reads fail.

The initial shell is hidden/inert until the requested projection is ready; no-JS shows a localized fallback. These are disconnected presentation fixtures. Raw source includes synthetic data; this is not server redaction or authorization proof. No real signing, release, booking, drug, lab or AI capability is added. Booking grants no clinical authority; patient permission and doctor acceptance remain separate prerequisites.

## Direction, accessibility and future reuse

Arabic and English keep the same task order and clinical consequences. Use logical properties for borders, spacing and alignment; mirror only directional navigation arrows. Never mirror the logo, reverse chronological ranges, translate signed source content or substitute locale labels for clinical state. Latin digits, proper clinic name and offsets are isolated. This bounded Patient candidate preserves #94's ordinary 12-hour presentation and exact 14:30–15:00 Cairo instants; this does not amend other accepted contexts' 24-hour convention.

Targets are at least 48px, with visible focus, skip link, native modal, heading focus, Tab/Shift+Tab containment, Escape and opener return. Every status has text and meaningful non-color cues. 320px reflow and measured 200% text are required; motion preference removes transitions/smooth scroll. Contrast uses actual rendered solid surfaces; logo gradients stay outside ordinary UI text claims. Native zoom, real screen readers, real devices, other engines and native Egyptian editorial remain separate tests unless explicitly evidenced.

Doctor, Pharmacy, Laboratory and Admin may later vary columns, density and task grouping. They reuse these same roles/families/icon/focus/source rules and obey their existing exact authority contracts. No additional portal is designed or implemented here; this slice does not validate a complete component inventory, dense clinical text, forms, tables, destructive actions or all authorization states.

## Preserved Arabic brand gates

**DP01 OPEN:** Arabic wordmark final ya dots in “إيجي” collide with the line below. No source lettering edited, no closure claimed. Separate authorization and actual-size correction evidence remain mandatory.

**DP02 OPEN:** current formal Arabic tagline is reference-only and not approved final Egyptian Arabic product copy. It is omitted from these new UI screens; no replacement slogan is invented. The compact header uses the unchanged standalone symbol plus separately typeset English product name as a proposed product placement, not a revised source lockup. Review that placement here; it does not fix or approve Arabic lettering.

Approve or request changes to the four screens and this direction before any broader rollout. No merge, deployment, Brand V2 finalization or Design System V2 freeze follows automatically.
