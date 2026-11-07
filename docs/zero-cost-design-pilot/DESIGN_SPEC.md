# Two bounded visual hypotheses — design specification

**UNAPPROVED DESIGN PROPOSALS.** This is an isolated design-only experiment under the Product Owner's 7 November 2026 zero-additional-cost brief. It grants no production implementation, final Brand V2, Design System V2, backend, database, merge or deployment authority. Existing Patient/Clinician source, accepted contracts and preserved evidence are not replaced.

[Owner gallery](index.html) · [Explicit audited playbook](PLAYBOOK.md) · [Specimen entry](specimen/index.html).

## Roles and source of design authority

The Design Agent authored the standalone specimens and this specification. A separate Independent Reviewer must assess actual rendered artifacts and confirm remediation; this document is not its verdict. The Implementation Agent is inactive. A later implementation handoff requires an explicit owner-approved, versioned specification and a separate bounded implementation grant. Implementation must preserve the selected approved direction rather than inventing a new one.

The design agent explicitly read the audited Basic-derived playbook. This is **EXPLICIT_AUDITED_PLAYBOOK_ONLY**, not host-native Skill activation, a full upstream Skill evaluation, S1 execution or proof of Skill efficacy. No upstream script, paid feature, generated asset service, external font request or production import is used.

H/P are unaccepted previous candidates; NOVA is historical inspiration only. Neither direction selects or finalizes them. Text `EgyHealth 360` is the sole brand identifier. Proposal names below identify review alternatives, not product brands.

The current brief permits different standalone visual proposals. Accepted task hierarchy and source semantics still control: [IA](../INFORMATION_ARCHITECTURE.md), [Arabic UX](../ARABIC_UX.md), [content foundation](../CONTENT_SYSTEM.md), [security](../SECURITY.md) and the supported scope of the [Clinician master](../ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md). Old adoption-time pending wording in accepted content documents does not reopen accepted CD01–CD07.

## Equal-content synthetic scenario

Both directions use the same immutable in-page data object and the same role-specific facts. Language changes authored presentation, not source identity, dates, clinical meaning or state.

| Fact | English / fixed value | Arabic presentation |
| --- | --- | --- |
| Patient display name | Salma Hassan | سلمى حسن |
| Treating doctor | Dr Omar Ali | د. عمر علي |
| Clinic proper name | Nile Care Clinic | Exact `Nile Care Clinic`, isolated LTR |
| Visit | 12 November 2026, 14:30–15:00 | 12 نوفمبر 2026، 14:30–15:00 |
| Event zone | Africa/Cairo, UTC+02:00 on this event date | بتوقيت القاهرة with exact isolated offset |
| Patient snapshot | 12 November 2026, 09:00 Cairo | Same synthetic morning; the 14:30 booking is confirmed and upcoming |
| Clinician snapshot | 12 November 2026, 14:35 Cairo | Same visit after explicit opening; consultation is open |
| Prior patient-visible source | Visit summary explicitly shared on 5 November 2026 | ملخص الزيارة؛ الدكتور شارك الملخص معاك |
| Independent prior follow-up | Recommendation from Dr Omar Ali on 5 November 2026 | الدكتور رشّح لك متابعة؛ التوصية دي مش حجز ميعاد |
| Follow-up association | No appointment is linked to this recommendation here | لسه مفيش ميعاد مرتبط بالتوصية هنا |
| Clinician source state | Blank, unsaved private-note and patient-summary drafts | Independent مسودة مش محفوظة states; no autosave |
| Allergy evidence | Not established | لسه مش مؤكدة; absence never means no known allergy |

These are two synthetic moments of the same visit, not an assertion that one simultaneously observed source has contradictory states. Within a role, data and state are identical across Interval and Relay. A confirmed appointment displayed elsewhere does not establish a link to the recommendation. No complete longitudinal record, reminder, update feed or unified outcome source is implied.

No age, sex, MRN, phone, photo, vital sign, medicine, laboratory result, diagnosis, dosage or clinical advice is fabricated. Empty documentation fields demonstrate composition, not real clinical findings. All controls remain disconnected.

## Material design differences

| Dimension | 01 — Interval | 02 — Relay |
| --- | --- | --- |
| Organizing question | What needs my attention now? | Which bounded source am I acting on? |
| Product perimeter | Open horizontal header; two primary destinations | Quiet dark vertical perimeter on desktop; two primary destinations |
| Patient composition | Strong architectural calendar/event plane plus separate recommendation; full-width connected retrieval row below | Date-led bounded-source plane with a vertical source spine and rules; care retrieval in an adjacent utility column |
| Patient visual hierarchy | Calendar numeral first, doctor/event next, deliberate next step beside it | Visit date and current event lead; separately attributed recommendation and shared summary follow as discrete sources |
| Surfaces | Squared open surfaces, large calendar slab, low-radius controls, no decorative shadows | One continuous source plane, unboxed event/recommendation partitions, thin rules; compact rounded controls |
| Clinician composition | Separate private-note and patient-summary source planes shown side by side on wide desktop | One continuous clinical work plane with stacked source-purpose sections, plus a slim context column |
| Typography | Larger date numeral and spacious English title; generous Arabic line measure | More compact typographic rhythm, stronger local source headings and a denser perimeter |
| Chromatic role | Forest/green event orientation with pale mineral surfaces | Ink perimeter and restrained cobalt source orientation on cool surfaces |
| Mobile transformation | Event remains a date/body split at 390px; date becomes a wrapping band at 320px | Perimeter becomes a compact header; source plane and bounded retrieval become a single reading column |
| Principal risk | Date emphasis can compete with the task; side-by-side documents may imply shared content without explicit ownership | Source sequence needs careful privacy/association language; stacked clinical sources require more vertical travel |

The distinction is spatial, informational and typographic; it survives removal of color. No recoloring of a single layout is presented as a separate direction. Relay's perimeter still uses a familiar software-navigation pattern. Originality is a composition claim for these specimens, not a claim of unprecedented visual invention, legal clearance or proven premium quality.

## Proposed visual parameters

Values below belong solely to these proposals. Existing local type assets are reused for compatibility and zero external cost; doing so does not freeze final typography.

| Role | Interval | Relay |
| --- | --- | --- |
| Ink | `#132E39` | `#1E303E` |
| Supporting text | `#526770` | `#576773` |
| Canvas | `#F5F8F8` | `#F0F3F6` |
| Surface | `#FFFFFF` | `#FFFFFF` |
| Rule | `#D5E1E3` | `#D6DEE5` |
| Action/orientation | `#00645A` | `#234BC2` |
| Strong perimeter | Open white header | `#17283E` |
| Default control radius | 4px | 10px; fields 6px |
| English type | Local Manrope variable | Local Manrope variable |
| Arabic type | Local IBM Plex Sans Arabic, regular/semibold | Same local family, different composition/scale |
| Keyboard outline | 3px `#1265CF`, 4px offset | Same behavioral treatment |

Patient main copy uses a 16px floor; controls/status and key labels use at least 14px; essential metadata uses at least 12px. Headings vary with role and viewport. Arabic uses more generous line height and authored complete sentences. The display date numeral is deliberately exceptional in Interval; it is not repeated as a metric-card device.

Calendar/status colors convey source orientation, not a medical conclusion. Confirmed/open/draft/unknown states always have text. Amber identifies uncertainty rather than emergency. No red/green medical interpretation or fabricated health score appears.

## Responsive and bilingual construction

The application source is not imported. Standalone HTML, CSS and original JavaScript choose the specimen and language, using browser-native elements. Desktop source max-width is 1600px, Patient content max-width 1320px, with fluid page padding. Main grids use shrinkable tracks. At intermediate widths, simultaneous document planes become a vertical sequence and the context column moves below. The two source purposes remain distinct.

At 760px and below, both perimeters become compact mobile headers. Local consultation tasks use a wrapping row with content-driven height rather than a clipped or horizontally scrolling tab strip. Identity, visit date, chronological time/offset and open state remain visible before task content. The redundant scenario breadcrumb line is removed on phones because the exact visit context already carries that information.

Relay's appointment date wraps its month/year to another line when enlarged. At 320px, Interval's large calendar slab becomes a wrapping horizontal date band. Essential labels and consequences wrap without ellipsis, clamping or fixed heights. Source controls stack rather than shrinking captions to fit. No sticky overlay obscures focused controls; exact target identity is repeated at consequential action groups.

`dir="rtl"`, logical CSS properties and semantic DOM order govern Arabic. Inline times, offsets and recorded proper names use explicit isolated LTR runs. Date chronology and care transitions are never reversed. Only directional UI arrows mirror. Language switching preserves direction, role and state parameters. Arabic product copy is complete and locally authored; proper names, the text wordmark and review proposal names remain allowed exceptions.

## Patient task and privacy contract

Primary navigation is My care / متابعتي and Find care / دور على دكتور. Secondary retrieval remains explicit: appointments, shared summaries and follow-up, available history and the unavailable prescription integration. There is no active Lab destination or unsupported prescribing flow.

The next confirmed appointment is the primary event. Follow-up is a separate source, with an explicit no-booking consequence and no invented association. The shared visit summary is separately dated/attributed and explicitly released. Patient screens never mention private-note existence, hidden draft counts or a clinician completion checklist. Bounded sources do not claim I4 continuity.

The permission disclosure explains that booking grants no clinical access and a new care relationship requires patient permission plus doctor acceptance. It does not add a new predicate to independently valid legacy grants. Existing current-assignment and backend checks remain authoritative in any future implementation.

## Clinician source ownership and independent actions

Global destinations remain Schedule / جدول المواعيد and People in your care / مرضاي. Documentation, follow-up and review/close are local to the exact consultation. There is no active prescription, Lab, results, medical analytics or AI task.

The private-note editor owns its complaint/findings, problems, diagnoses and allergy-review fields. A visible explanation states that these structured fields belong only to the private note and are never copied into the patient summary. The separate patient-facing summary has its own narrative and patient-instructions fields. This is explicit source-purpose ownership, not a proposed shared draft or combined write API.

Each source action group repeats the exact synthetic patient, visit date, interval, Cairo offset and consultation-open state. The disconnected preview dialog also repeats this target for document/follow-up/close actions. This prevents a long mobile scroll from leaving a consequential action with no visible target context. Future real confirmations must include the exact current patient/visit and state from authoritative sources, then recheck authority before committing.

| Surface/action | Meaning preserved |
| --- | --- |
| Save private draft | Private source only; no sign/share implied |
| Sign private note | Private signature only; patient does not receive the note |
| Save summary draft | Patient-facing draft remains unreleased |
| Sign & share summary | Explicitly releases that summary; private content stays private |
| Save follow-up draft | Independent source, not booking |
| Sign & release follow-up | Explicit independent release; no appointment or summary release follows automatically |
| Review & close | Separate final action; irreversible, does not save edits, sign or release other sources |
| Signed history & corrections disclosure | Immutable signed history and separately authorized addendum/correction/wrong-patient workflows; no fabricated history payload |

All specimen actions open an honest “Preview only” dialog. They never save, sign, release, retry, book, close or persist anything. Inputs change only the disconnected page memory. The page labels edits as not saved, and reload clears them. The proposed design does not add a command-recovery protocol or weaken existing operation-key contracts.

## State specimens

Use the same query contract as the default pages, with the state parameter below.

| Role / state | Query value | Rendered meaning |
| --- | --- | --- |
| Patient appointment read failure | `state=read-error` | No current appointment content or success/empty inference. Explicit loading problem and readable read-only recovery action in EN/AR. Independently displayed shared sources remain separate. |
| Clinician uniform unavailable | `state=access-redacted` | No patient identity, visit context, source content or count is rendered. Uniform absent/denied/restricted wording, return to Schedule. `window.designFixture` contains no clinical payload for this state. |
| Clinician uncertain private signing | `state=uncertain-write` | Signing status is unknown; no conflicting draft/signed badge, document editor or new sign command appears. Review current status, preserve exact original context if recoverable and recheck authority; no automatic retry. |

These are static design states, not evidence of real authorization enforcement. The source code necessarily contains synthetic fixture literals; it is not a privacy boundary or a replacement for backend denial tests.

## Reproduction and review contract

Default URL: `specimen/index.html?direction=interval&role=patient&lang=en`.

- `direction`: `interval` or `relay`.
- `role`: `patient` or `clinician`.
- `lang`: `en` or `ar`.
- `state`: omitted/default, or the role-specific states above.

The eight default language/role/direction combinations render at 1440×1000 desktop and 390×844 mobile. Additional reviewer evidence covers 320px, 200% text, focus, state recovery and scrolled action targets. The Root agent records actual screenshot filenames, measured findings, browser version and independent-review disposition in this package's evidence. Screenshots establish what was rendered; local metric checks and CI do not establish aesthetic excellence, native-device usability or WCAG certification.

The owner should evaluate the browser-rendered PNG/PDF boards supplied in the package, with no software installation or IDE operation required. The HTML gallery offers navigable source specimens for agents and reviewers; GitHub source browsing alone does not execute it.

## Revision log and remaining design gaps

1. The first browser critique found clipped Relay month text at 320px with enlarged text, undersized metadata/control labels, and a mobile clinician header that delayed the first editor. Revision 1 introduced readable type floors, wrapping date bands, compact mobile tasks/context and full target sizing.
2. Independent critique found ambiguity in the ownership of structured clinical fields. They now live only inside the private source and have a visible no-copy explanation.
3. Independent critique found insufficient target context after long mobile scrolling. Every independent action group and relevant preview dialog now repeats exact patient/visit/state context.
4. The first Relay proposal relied too much on familiar rail/cards. Revision 2 replaced repeated patient source cards with a single ruled source plane, preserving independent sources and bounded chronology. This improves structural distinction without claiming novel navigation primitives.

5. Final screenshot/metric review showed that earlier font-floor and target rules lost to more-specific selectors. Their earlier completeness claim was not established. A bounded final CSS correction gives interactive controls 44px minimum width/height, source metadata a 12px floor and control captions a 14px floor with explicit high-specificity selectors. True 200% screenshots also exposed split initials and fragmented local task words; initials now remain unbroken in content-sized shapes, task items wrap as whole items, and English headings/actions use normal word boundaries. These corrections still require the final browser/reviewer pass.

Final defect verification belongs to the independent review, not the author. Native Egyptian editorial review, assistive technology, physical-device interaction, task research and comprehensive state coverage remain unperformed. Typography/color/brand selection, all product interaction specifications beyond this bounded sample, a production component system and real source-command mappings remain owner-gated future work. No owner should be asked to supply manual design or code to complete those later agent tasks.

The recommended next gate is a Product Owner visual disposition: **Interval / Relay / reject both / named coherent hybrid request**, after reviewing independent findings and both languages/sizes. A selected direction should receive a further bounded design-specification pass before any separately authorized production implementation. Selection is not Final Brand V2 or Design System V2 approval.
