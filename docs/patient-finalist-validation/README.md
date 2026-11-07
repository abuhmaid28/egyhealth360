# Patient finalist validation — NOVA Refinement 04

**Candidate review package, 8 November 2026 (Africa/Cairo).** The current owner brief authorizes only bilingual Patient My Care validation and recovery of the missing logo gate. NOVA Refinement 04 is selected for further validation; final product, Brand V2 and Design System V2 are not approved. No production implementation, merge or deployment is authorized.

Base main: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. Sole visual source: [PR #93](https://github.com/abuhmaid28/egyhealth360/pull/93), pinned `459037baa0d7c2e67fd95715bfca7999592dfd45`. Its actual markup, CSS, both normal images, rationale, Arabic writing note, validation and independent review were read. This branch copies its CSS and five font/license assets unchanged into an isolated specimen; language/state support and the observed validation fixes are separate. PR #93 is preserved.

## Six primary images

| Locale | 390px full normal | 1440px full normal | Six-state board |
| --- | --- | --- | --- |
| Arabic / RTL | [Mobile](evidence/normal-ar-390-full.png) | [Desktop](evidence/normal-ar-1440-full.png) | [Arabic states](evidence/states-ar.png) |
| English / LTR | [Mobile](evidence/normal-en-390-full.png) | [Desktop](evidence/normal-en-1440-full.png) | [English states](evidence/states-en.png) |

All are actual Chromium renders, synthetic and disconnected. Boards show complete affected-region excerpts from a 390px viewport, with region and state labels; full normal pages are separate. The maintained live specimens are [Arabic](ar.html) and [English](en.html). Query `?state=normal|loading|empty|error|no-sources|unavailable` selects one isolated state. All actions open labeled local preview explanations. Reload is read-only recovery explanation, not a service call or clinical retry. Prescriptions remain explicitly unavailable; available history is bounded.

## Compact bilingual parity

| Meaning / fact | Professional Egyptian Arabic | English |
| --- | --- | --- |
| Primary navigation | متابعتي / دور على دكتور | My care / Find care |
| Synthetic patient / doctor | سلمى حسن / د. عمر علي | Salma Hassan / Dr Omar Ali |
| Clinic / booked date | Nile Care Clinic / الخميس، 12 نوفمبر 2026 | Same clinic / Thursday, 12 November 2026 |
| Ordinary patient time | 2:30 مساءً / لحد 3:00 مساءً | 2:30 PM / to 3:00 PM |
| Appointment meaning | الحجز اتأكد؛ الحجز لوحده مش بيشارك معلوماتك الطبية | Confirmed; booking alone does not share medical information |
| Shared recommendation | الدكتور رشّح لك متابعة؛ مش ميعاد محجوز | Doctor recommended follow-up; not a booking |
| Linked booking | لسه مفيش ميعاد مربوط بالمتابعة دي هنا | No appointment linked to this recommendation here |
| Independent source / provenance | ملخص الزيارة؛ د. عمر علي؛ 5 نوفمبر 2026 | Visit summary; Dr Omar Ali; 5 November 2026 |
| Secondary retrieval | مواعيدك / الملخصات والمتابعة / السجل المتاح / روشتاتك | Appointments / summaries and follow-up / available history / prescriptions |

The exact start/end remain `2026-11-12T14:30:00+02:00` / `2026-11-12T15:00:00+02:00`, zone `Africa/Cairo`, duration 30 minutes. Main content omits technical zone/UTC and 24-hour strings; the appointment detail explains clinic time in Cairo. This bounded owner-directed 12-hour presentation supersedes the older ordinary-surface convention only here. No signed clinical text is rewritten. [Label catalog](evidence/parity-catalog.json); [asserted facts and parity](evidence/assessment.json).

## State and responsive coverage

| State | What the viewer can conclude | Safe next action |
| --- | --- | --- |
| Normal | Confirmed appointment; two separately shared synthetic sources | Inspect preview details or source; recommendation is not booked |
| Loading | Appointments have not loaded; no stale doctor/time/confirmation | Wait; stable skeleton and busy/status semantics |
| Empty | No upcoming appointment in information available here | Find care preview; no universal absence claim |
| Read error | Appointment status unknown because the read failed | Explicit reload preview; no booking/clinical command retry |
| No shared sources | No shared summary/follow-up available in this view | Available retrieval; no unpublished source disclosure |
| Unavailable | Content unavailable here; no cause, existence, count, actor or date disclosed | Return to available information; no access-grant action |

“No record exists,” “not released” and “not available to this viewer” are separate domain states; this client fixture has no authority to infer the first two from an empty patient projection. Normal follow-up explicitly represents a released recommendation without a linked booking. Source release and booking never imply each other or grant access. Initial content remains hidden/inert until the requested projection is ready, including stalled-JS and no-JS checks. This is presentation evidence, not backend payload-redaction proof.

| All six states, both languages | 1440 | 768 | 390 | 320 |
| --- | --- | --- | --- | --- |
| 100% text | PASS | PASS | PASS | PASS |
| 200% computed text | PASS | PASS | PASS | PASS |

96 cases, 18 keyboard cases / 86 modal actions; minimum visible target dimension 48px. [Technical report and exact limits](VALIDATION.md). Native browser zoom, real screen readers, physical devices and other browser engines are **NOT TESTED**.

## Provisional Design System compatibility

**Compatible as a candidate, not a frozen system.** Semantic HTML, logical CSS, RTL/LTR primitives, local OFL typefaces, original 24-unit icons, explicit source/status patterns and reduced-motion/focus rules can inform later Next.js/TypeScript components without changing the accepted product architecture. Current roles for canvas, surfaces, lime action, muted text and focus are coherent across the six states. Existing tokens and source CSS remain provisional; no production token alias or component is changed.

Before Design System V2: actual logo/identity owner decision; resulting palette/type/icon alignment and light/monochrome brand proofs; broader density/component/error/disabled/long-content inventory; native zoom, assistive and device checks; then final prototype acceptance. This Patient sample cannot establish four other portals, long clinical payload behavior or production accessibility. **Final Brand V2 remains BLOCKED; Design System V2 must not freeze before Brand.** [Recovered next logo gate](NOVA_BRAND_LOGO_NEXT_GATE.md) and [authoritative roadmap](../IMPLEMENTATION_ROADMAP.md#current-patient-to-brand-sequence).

## Audited workflow and owner handoff

Actual mode: **EXPLICIT_AUDITED_PLAYBOOK_LOADING**. PR #89 `0886788bd6b395bb7cace8653ffe280da68af4b8`: Basic PLAYBOOK, AUDIT, excerpt bundle, upstream lock and MIT license explicitly loaded. PR #87 `b3eb9543a58d571968a16168d3492bf817792cb4`: visual exploration SKILL.md, visual QA SKILL.md and REFERENCE_MAP explicitly loaded. [Exact paths and hashes](evidence/provenance.json). Native activation/discovery and S1 completion are **not proven**. No installer, paid feature/API, purchased asset, hosted design service or new dependency was introduced. Existing subscription/runtime/GitHub limits still apply.

Read [independent three-gate review](INDEPENDENT_REVIEW.md), [technical validation](VALIDATION.md), then [logo next-gate brief](NOVA_BRAND_LOGO_NEXT_GATE.md). Owner decision now: accept this candidate validation package or request specific refinements. A later, separate Logo Exploration Sprint requires its own authorization. Validation/technical Green is neither final product acceptance nor authority to start it. Exact final head and CI outcome belong in the Draft PR handoff.
