# Proposed system foundation v0.1

**Architecture proposal, not a finalized Design System or component API.** [Visual system board](system.html), [DTCG token proposal](tokens.json), [generated CSS projection](tokens.css), [interactive specimens](specimen-ar.html). Generation and validation are isolated from production.

## Layers and boundaries

| Layer | Responsibility | Examples | Rule |
| --- | --- | --- | --- |
| Foundational | Named raw design values | sRGB colors, font families, sizes, spacing, radius, line height, borders, duration, viewport/grid | No clinical meaning; provisional and traceable to the inspected directions |
| Semantic | Intent independent of a component/vendor | text, muted, action, surface, warning/error/success pairs, private/released audience, target, density | Alias foundational values; warning never means diagnosis; brand teal never means normal |
| Component | Reusable styling decision | button radius/height/background, appointment radius/background, source-row spacing/divider, focus width/color | Alias semantic intent or structural foundations; not a React prop/API |

Tokens use `$type`, `$value`, sRGB color objects, pixel dimensions, millisecond durations and `{group.token}` aliases. The [generator](tokens.py) resolves all scalar aliases and emits a deterministic CSS view; the checker detects unknown aliases/cycles and type mismatches, including nested shadow references. DTCG-compatible structure is a portability proposal, not external schema certification. No vendor theme object, runtime package or production CSS import.

The rendered static specimens intentionally test optical sizes in rem and responsive layout rules as well as tokens. The CSS is a review implementation, not a claim that every declaration is already a production semantic token. Font/loading behavior, content contracts and final API extraction require the next approved execution phase.

## Foundation specification

| Concern | Proposed rule | Visual evidence / tradeoff |
| --- | --- | --- |
| Typography | H: Manrope Latin / Plex Arabic. P: Inter / Noto Arabic. Body 16px, labels 14px, captions 12px base; Arabic line-height 1.85, Latin 1.65 | Existing local fonts; type board compares actual letterforms, diacritics and numerals; optical approval pending |
| Heading hierarchy | Patient 32–38px; clinical patient identity 24px; section 20px; professional labels 12–14px | Patient orientation is larger; clinical work keeps source context concise |
| Surfaces | Light neutral canvas, white work plane, subtle wash for grouped facts; one deep-teal responsibility anchor in H | F's persistence without dark-by-default reading; no glass or elevated-card grid |
| Spacing | 4px sub-rhythm, 8px layout rhythm; 12/16/24/32/48/64/80px steps | Compact source mode 12px; operations 16px; patient 24px; deliberate optical exceptions documented in CSS |
| Shape | H: 16px appointment, 8–12px true work containment, 6px controls; P: 6px functional containment | Most source content is separated by rules rather than boxes |
| Borders | 1px dividers; control border contrast is stronger than decorative line contrast | A faint divider must never be the only boundary of an input |
| Focus | 3px dark ring, 3px white separation, at least 44px relevant target / 48px primary control | Visible on anchor and light plane; semantic text/labels remain necessary |
| Elevation | Flat work surfaces. Dialog only: restrained shadow over opaque surface and backdrop | No arbitrary hover elevation, glass or clinical-success animation |
| Grid | 12-column conceptual grid, 1328px useful maximum, 32px wide gutter | Patient H asymmetry; P leading rail. Both reserve width for Arabic expansion |
| Motion | 140ms color feedback, reduced-motion disables transitions; no animated status celebration | Pending is not success; no clinical command retry hidden behind animation |
| Status | Explicit object + meaning + source/audience; dot/color supplementary | Saved, signed, released, accepted, dispensed and closed never share a generic complete label |

## Shared identity, distinct modes

Patient uses an attentive rhythm and one strong next-appointment anchor; secondary retrieval is a connected row and care sources are readable lines. Clinician keeps the same type/controls/surfaces, tightens spacing and fixes exact patient/visit identity before document/source purpose. Operations use aligned work rows and purpose-minimized details. Density does not shrink touch targets, omit warnings or switch semantic meanings.

No new global modules: Patient remains My care + Find care; Clinician remains Schedule + People in your care. Consultation source tasks stay local. Pharmacy is assigned prescriptions + bounded dispense history; Laboratory's assigned diagnostics remain future; Admin is People + Organizations with operational facts only. Arabic uses the accepted role terms from the Content System, including الوصفات المسندة / الفحوصات المسندة / الجهات.

## Responsive and bilingual rules

- At 1440px, H uses horizontal navigation, asymmetry and a source rail; P has a 205px leading rail and continuous light work plane. Containers remain constrained on larger monitors.
- At 768px, multi-column content reflows and P's global rail becomes horizontal. At 390/320px Patient becomes a purpose-built single column. Retrieval stays in two flexible columns; long labels wrap.
- Below 720px Clinician demonstrates identity/visit/source review with the allergy uncertainty retained. Read-only authoring panels and signing/release/close review controls are removed from this **specimen's** phone presentation; no production capability change. No table or desktop workbench is scaled to fit a phone.
- Use logical margin/padding/borders and native `dir=rtl`; DOM order follows the task reading order. Arrow direction mirrors, functional calendar/document icons do not. The specimen's P source rail visual reorder on desktop needs owner task review before adoption.
- UI Arabic is authored modern Egyptian Arabic, not an English fallback. Do not translate/normalize recorded identities, human-authored medical text or medication names. Deliberately localized synthetic names have explicit fixture fields.
- Isolate Latin proper names, references, quantities, 24-hour values and complete chronological ranges with `bdi` or an LTR container. Use Latin digits and named Gregorian months. Render the actual event timezone and offset where repeated local time requires disambiguation; never hard-code UTC+02 for real future events.
- Show long Arabic text and 200% text enlargement without truncation. A specimen numeric quantity is explicitly not a dosage. Production localized date formatting continues to use existing tested helpers.

## Component taxonomy — proposed contracts, no frozen API

| Family | Responsibilities | Required states / exclusions |
| --- | --- | --- |
| Primitives | Type, icon, divider, action, field, textarea, select, focus/target | Default, hover, pressed, focus, disabled; icons never replace text meaning |
| Feedback | Inline error, notice, loading, empty, unavailable, access-safe denial, uncertainty | Loading ≠ empty, denied ≠ unavailable; live region for material status changes |
| Navigation | Shared shell, primary goal, local task anchors, retrieval row | Explicit current page/task; real route integration deferred; no speculative product module |
| Identity/context | Exact patient/visit ribbon, organization scope, source provenance | Current authority factual only; clear content erasure on lost authority; no protected counts |
| Source patterns | Independent source row, audience label, version/history, correction/addendum | Private/saved/signed/released/corrected remain separate; stale/retracted distinct |
| Review patterns | Modal preview, cancellation/focus return, exact target/effect, explicit acknowledgement | No bundled clinical mutation, implicit consent or optimistic success |
| Work surfaces | Patient anchor, clinical editor/context rail, operational list | Density by task; phone review replaces compressed workbench; no generic all-purpose card |

Specimen interactions are local presentation only: dialog open/Escape/focus return, validation/error association, state selection, compact spacing and chronology disclosure. No click simulates a server-owned clinical success. Documentation textarea is read-only; save/dispense/management controls are unavailable with visible explanation.

## Healthcare interaction patterns

| Pattern | Required information and boundary | Reusable design behavior |
| --- | --- | --- |
| Appointment | Exact doctor/clinic/date/time/zone, booked vs unconfirmed, in-person context | Logistics anchor, exact detail continuation; booking grants zero clinical authority |
| Identity / relationship | Correct identity, exact current assignment, patient permission + clinician acceptance | Persistent context; booking/role/membership/authorship alone never supply grant |
| Clinical context / warning | Relevant authorized facts, explicit unknown/not-reviewed allergy state | Warning remains visible; unknown is not no-known; no invented diagnosis/vitals |
| Private documentation | Current source/version/author/audience and save state | Read-only proposal editor, separate private-sign review; no copy into patient summary |
| Patient summary / instructions | Exact human-authored signed/released version, author/time | Preview patient's exact audience; release separate from private note and follow-up |
| Prescription | Human-selected medication, exact quantity/unit/instructions/validity, source/version | Separate sign, route, acceptance and dispensing; no generated dose, substitute/refill/partial supply |
| Pharmacy operations | Exact current routed artifact + current organization/membership, acceptance, item state | Assigned-work row; acceptance ≠ stock/ready; full item only; reversal keeps history and consumes entitlement |
| Bounded history / provenance | Purpose-appropriate facts and actual actor/time/correction chain | Expandable chronology; pharmacy historical view excludes patient name/source instructions; no global chart |
| Laboratory order/result | FUTURE exact routed order, minimal permitted identity, draft vs verified final, corrections/retractions | Unavailable service specimen; never fake empty queue/results or mandatory doctor-release/second-verifier policy |
| Authorization loss | Privacy-safe denial, no patient/reference/count disclosure | Clear stale context, return to permitted work; no Admin override |
| Sign / release / close | Exact target/version/content/effect, current authority, independent confirmation | Private sign ≠ summary release ≠ follow-up release ≠ prescription sign ≠ irreversible close |
| Uncertain outcome | Original source/operation identity, last confirmed facts | Inspect authoritative result first; only explicit identical-command recovery where accepted; no automatic clinical retry or new key |
| Demo / Live | Actual data/service mode and capability availability | Persistent synthetic marker in this package; real Live never falls back to Demo. Live badge here is explicitly an appearance specimen |

No Laboratory/Admin/AI/EACCE backend, authorization, result generation, notification or action functionality is introduced. This is a visual foundation for owner comparison within existing contracts.
