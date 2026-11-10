# Patient My Care + Doctor Active Consultation

**Candidate for Product Owner visual/content approval — Issue #106.** One responsive web/PWA language, two task compositions. No production integration or final Design System adoption. The PR remains Draft/Open/Unmerged, with no deployment or automatic next phase.

Start with **[Patient Arabic mobile, light](evidence/patient-ar-light-390.png)** / [dark](evidence/patient-ar-dark-390.png), then **[Doctor Arabic desktop, light](evidence/doctor-ar-light-1440.png)** / [dark](evidence/doctor-ar-dark-1440.png). These PNGs open directly on Android; GitHub's **Raw/Download** opens the full image. [All evidence and limits](QA.md).

Run `python docs/design-system-v2/high-fidelity-pilot/prepare-reference.py`, then serve this folder on loopback with `python -m http.server 8766 --bind 127.0.0.1 --directory docs/design-system-v2/high-fidelity-pilot` and open `http://127.0.0.1:8766/gallery.html` ([gallery source](gallery.html)). The gallery includes role, language, appearance, viewport and text selectors, full-screen links, and matched browser-rendered Dark/Light views. Preparation needs local pinned Git objects or authenticated `gh` access; the gallery itself makes no API/external requests and writes no storage. Local font/logo/image/script loads are necessary. A missing-input warning blocks a credible visual review. Gallery role selection is a review control, never authentication.

## Authority

Fresh branch from main/base **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**, without cherry-picking other design branches.

| Source | Exact reference and controlling disposition |
| --- | --- |
| [Issue #106](https://github.com/abuhmaid28/egyhealth360/issues/106) | Authorizes this isolated high-fidelity review, actual browser evidence, independent critique and exact-head CI. |
| [PR #105 owner decision](https://github.com/abuhmaid28/egyhealth360/pull/105#issuecomment-6766897207) | Head `82fbbe9fef28a6407947852d47473ea35cd057a8`; DSV2-01 preliminary foundation reference; DSV2-02 patient appointment 12-hour scoped amendment; DSV2-03 Navigation A for review; DSV2-04 both visual appearances, behavior OPEN. |
| [PR #101 Brand approval](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6761920764) | Head `687f94074c0ac4d45610546517ea6aa228d36183`; exact no-tagline logo, genuine Inter/Plex, existing gradients/material, Violet × Apricot A — Balanced. AP03/AP05 remain OPEN. |
| [PR #103 blueprint](https://github.com/abuhmaid28/egyhealth360/blob/4052e2657dd8d354fe11e33ed51fc32ec8065583/docs/design-system-v2/BLUEPRINT.md) | Accepted planning only; not full system/component implementation authority. |
| [IA](../../IA_SITEMAPS.md), [content](../../CONTENT_SYSTEM.md), [Arabic](../../ARABIC_UX.md), [CD decisions](../../CONTENT_DECISION_REGISTER.md), [security](../../SECURITY.md), [Clinician master](../../ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md) | Accepted task/meaning/privacy constraints apply. Retired teal/navy/gold/Manrope/no-logo directives do not control this design. Earlier universal 24-hour Patient appointment wording is superseded only within the explicit #105 amendment. Canonical contracts are preserved. |

The optional PR #87 design playbooks were not loaded; no cloud-native skill activation is claimed. Current source/status notes are minimally reconciled, with historical evidence untouched.

## One language, two hierarchies

**Patient:** an editorial greeting leads to one appointment anchor. The full doctor name, named Gregorian date/year, local time and clinic precede the single primary detail action. At 390px the date changes to a compact horizontal band; appointment detail becomes a full-width touch action. Secondary retrieval uses flat, separated rows. The appointment leads; discovery and relationships remain secondary. Shared summaries show an honest empty state rather than fabricated releases, medical metrics or history. The synthetic booked fixture is a design input, never a successful action performed by the gallery.

**Doctor:** a compact current-visit anchor precedes sustained authoring. It states the exact patient, treating doctor, event/timezone and independent current care access. Global Schedule/People in your care are separate from local Documentation/Follow-up/Review & close. Wide screens have a local outline, one writing plane and source rail. Below 1200px the outline yields first; below 900px source context has an explicit jump before authoring and a return path, and local tasks use a native labelled disclosure. Nothing is sticky, so context and focused actions cannot be masked by fixed UI. Source context is recoverable rather than permanently consuming the narrow viewport.

The authoring surface is an editable, unsaved local template without clinical findings. Save/sign/close affordances open clearly labelled noncommitting review dialogs. They cannot save, sign, release, close or report success. Patient-only summaries and follow-up are distinct sources. Allergy is **not reviewed**, never “no allergies”. Signed history is empty. No active Lab/AI/results/vitals/prescription-authoring feature is invented.

## Approved inputs versus candidate composition

| Layer | Approved input | This candidate / owner choice |
| --- | --- | --- |
| Brand | Immutable four AR/EN light/dark primary SVGs, no tagline or filters; approved source gradients/contours | Header scale and placement only; no redraw or recolor. |
| Type | Inter real EN400/500/600/700; Plex real AR400/600, no synthetic weight or Arabic tracking | 16px clinical/action text; 14px limited quiet metadata; role-specific heading scale/measure. Arabic heading tracking explicitly zero. |
| Color | AP04 canvas/base/raised/text/action/control values and exact audited references | Product aliases in `screen.css` remain candidates; each actual opaque text/control/focus adjacency is remeasured. Apricot is a tiny nonclinical footer cue, never status. |
| Spatial/material | #105 preliminary 4/8/12/16/24/32/48 rhythm and shape hierarchy | Patient anchor24px wide/20px narrow, editor/context16px, controls10px, secondary rows flat. These softened radii deliberately depart from the preliminary card12/anchor16/control8 reference; no token freeze. |
| Appearances | Approved raw Dark/Light families | Light uses airy canvas with a white writing plane; Dark uses three dark planes and lavender actions, without a white editor or inversion filter. Neither theme is a clinical state. |
| Navigation | A labelled top/compact direction selected for review, accepted destinations | Narrow Patient links remain visible, bordered and labelled. Doctor tasks collapse locally; no native bottom tab bar, new destination or five-role shell freeze. |

Source provenance is explicit in [reference-manifest.json](reference-manifest.json), [font identities](evidence/font-identity.json) and [Lucide icon manifest](icons/manifest.json). Only nine pinned font/logo/OFL inputs are prepared in ignored `.reference/`; none of the 511-file Brand package is committed. The icons use Lucide Static **0.468.0**, exact selected geometry, ISC notice with Feather attribution in [LICENSE](icons/LICENSE). Decorative SVGs are hidden from assistive technology; their surrounding text supplies the accessible name. Only directional arrows are mirrored; clocks/calendar/logo retain orientation. Icons are local assets, not a new production dependency or a final icon-system adoption.

## Time, privacy and capability boundaries

The appointment fixture is **12 November 2026, 13:00–13:30 UTC**, displayed for actual event zone **Africa/Cairo**, whose offset on that date is **UTC+02:00**. Patient overview is **3 مساءً / 3 pm**, with Cairo named. Details expose the full Gregorian date, both endpoints, IANA zone and date-specific offset. The overview is unambiguous in this single-zone fixture. Repeated-hour/cross-zone variants must expose offsets in overview; cross-midnight variants require both endpoint dates. Doctor/consequential timestamps remain **15:00–15:30**, with zone/offset visible. No permanent Cairo offset, parser, stored instant, eligibility logic or time-preference feature is introduced.

Own permitted patient information only; no private-note existence/counts in Patient My Care. Current `ClinicianPatientAssignment` is the grant; booking gives zero clinical authority. Active authority here is an explicitly synthetic initial fixture, not a check performed by the browser. Private signing does not share; summary release, follow-up release and irreversible close remain independent. No automatic clinical retry, offline write queue or sensitive cache. Existing V1 staging capability classification is unchanged; merged prescription/pharmacy backend does not establish integrated/hosted clinician authoring, laboratory/AI or longitudinal completeness.

## Independent critique and recommendation

[Separate visual review](evidence/independent-review.md) records actual browser views, reviewer attribution, source hashes and candid aesthetics. It is independent from author QA and cannot grant Product Owner acceptance. Initial findings led to the narrow source jump/return, compact task disclosure, larger audience/status labels, and Arabic heading tracking correction. The exact final verdict is in that report.

Recommend this unified **restrained, typographic, task-first direction**: appointment anchor for Patient; connected writing plane with source context for Doctor; flat retrieval/work rows and sparse brand accents. It can guide later Pharmacy/Lab/Admin design review while preserving their own work/authority models. Those high-fidelity portals are not designed here. The tradeoffs are conservative visual expression, a long narrow secondary reading path, and source context requiring a jump on narrow Doctor screens. No extra ornament is proposed to fill clinical data gaps.

## Focused Product Owner choices

1. Accept this unified visual direction and softened shape hierarchy, or request a bounded aesthetic revision. Review the Patient mobile and Doctor desktop pairs first.
2. Accept the narrow Doctor context jump/return plus compact task disclosure, or request a context disclosure closer to the editor. All visit/authority information remains visible above action.
3. Choose a theme-behavior brief for later review: system-first with an explicit override versus explicit session choice. Default, persistence scope, shared-device behavior and SSR/flash handling remain OPEN; gallery controls implement no preference policy.

AP03 real-platform/install/print and AP05 artwork rights/trademark remain distribution/release gates. Native Egyptian clinical/editorial review, frontend architecture and whole-project health review remain later gates. Technical CI Green does not approve the visual/content candidate. **Stop for Product Owner visual approval; no next implementation phase.**
