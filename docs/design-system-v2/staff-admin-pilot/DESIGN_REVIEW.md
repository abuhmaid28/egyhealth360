# One identity, three bounded workspaces

**Issue #108 · design review only · stop for Product Owner visual/content review.** The single owner-authorized refinement on existing PR #109 is recorded in [REFINEMENT.md](REFINEMENT.md); its new comparisons supersede the original composition/QA observations below where stated. No production UI, backend, contract, manifest/service worker, dependency, CI or deployment changes. The [capability gate](CAPABILITY_AND_AUTHORITY.md) was written before screens. Every record is synthetic; no service is connected and no successful mutation is simulated.

## Preferred source and deliberate adaptation

PR #107 exact `56f4f700aa83297c9f5c164a5304135303137f75`, Owner decision [6769908758](https://github.com/abuhmaid28/egyhealth360/pull/107#issuecomment-6769908758), is the preferred Patient/Doctor high-fidelity reference, not final DS approval. The new work starts from fresh main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; no reference branch is merged/cherry-picked. Its quiet canvas, differentiated rounded card planes, violet action hierarchy, controlled Lucide geometry, generous reading rhythm and localized typography carry through. Source-exact tagline-free logos and approved Violet × Apricot roles come from Brand #101 `687f94074c0ac4d45610546517ea6aa228d36183`. Nine ignored pinned inputs are hash-verified, not redistributed as a new Brand inventory. [Manifest](reference-manifest.json), [independent byte checks](evidence/source-provenance.json). Real Inter variable weights 400/500/600/700 and Plex Arabic 400/600, no synthetic Arabic bold or tracking. Original gradient artwork is loaded as-is; no redraw or recolor.

Light uses warm white task surfaces on a pale violet canvas. Dark uses layered ink/slate planes, lavender actions and a dark foreground on primary controls; it is authored separately. Apricot is a small decorative brand cue, never a fulfillment/clinical status. Text states and icons carry meaning. Existing #105 DSV2-01–04 foundation decisions constrain this candidate; Patient time exception does not alter these professional 24-hour contexts.

## One recommended composition per role

| Role | Main composition / hierarchy | Preserved meaning |
| --- | --- | --- |
| Pharmacy | Narrow exact-work queue beside a generous chosen-route plane; source/date anchor → minimum identity → whole source item → explicit review action. On phones an expandable route selector precedes the selected detail; both routes remain reachable and the selected route/status stay text-labelled. | Acceptance and dispense are separate. Accepted B changes heading to remaining-item work. No inventory, pickup, delivery, substitutions, partial quantity, refill or adherence. |
| Laboratory | Visibly FUTURE concept, narrower order context, three distinct conceptual stages, a blank result writing plane and explicit verification-boundary review. | No active order/result, no invented clinical values. Draft visibility differs from verified final; same-person verification is permitted and attributable. No doctor-release queue or sample/LIS workflow. |
| Admin | People and Organizations are direct global entries; operational list faces one exact organization–person membership detail. Object-scoped account, organization and membership statuses stay distinct. | No clinical chart or metrics dashboard. Internal inspect/end membership is not a public Live console. Secondary synthetic records deliberately open a uniform unavailable specimen rather than another identity's detail. |

Staff top/compact navigation is a **candidate shell**, not automatic five-portal Navigation A adoption. Ordinary web links work with browser navigation; there is no native bottom-tab assumption. All primary buttons are explicitly “Review …” and open an explanatory local dialog saying nothing was submitted. This is a design interaction, not mock success. Escape/close returns focus. Gallery theme/locale/width/state/text choices live only in the current URL/render; no stored preference policy is implemented.

Pharmacy history is a separate reduced-purpose plane: illustrative FULLY_DISPENSED plus terminal reversed meaning, no patient display name/source instructions, no renewed correction or dispense. Future Lab history is honestly empty, explaining current/superseded/retracted distinctions without fabricated data. Safe empty/unavailable/error/uncertain views reveal no prior identity, artifact reference or hidden count. There is no automatic retry or optimistic clinical completion.

## Content, time and responsive tradeoffs

Arabic uses the accepted Egyptian voice with professional الوصفة الطبية and precise صرف/إبطال meaning; English is LTR, Arabic RTL with logical CSS and mirrored directional icons only. Latin digits, named Gregorian date, 24-hour professional time and actual `Africa/Cairo (UTC+02:00)` for 10 November 2026 remain visible. This fixed illustrative instant does not encode a permanent Cairo offset. No date arithmetic/backend validity is implemented.

The review layer remains separate from the task screen: persistent DEMO-ONLY or FUTURE banners survive screenshots, plus a concise candidate footer. Patient/medication names and source instructions are intentionally not fabricated. Real pharmacy UI would show the unchanged exact signed medication/quantity/instructions within current authority; this specimen is not enough to evaluate clinical-source legibility. Lab deliberately has no lab values. This protects contract truth but limits realistic clinical usability assessment.

The authorized refinement replaces the tall phone queue with a compact selected-route disclosure and puts the noncommitting review action after minimum identity/source context. Detailed signed-source requirements, time, purpose-limited history and safety consequences remain accessible. Lab stages and blank result precede its verification-boundary review; Admin account/org/current-membership context precedes its operational review. Exact mobile measurements and remaining depth are in [REFINEMENT.md](REFINEMENT.md). These are browser reading-path improvements, not measured staff efficiency or a production clinical-action design approval.

## Product Owner decisions required

1. Accept/refine this single staff/Admin visual direction and each role's composition; choose whether phone queue depth is appropriate.
2. Accept/refine the candidate staff/Admin shells, task labels, density and Egyptian Arabic editorial tone. Native Egyptian participant and clinic review remain untested.
3. Decide theme default/system/persistence/shared-device behavior separately. No inferred implementation approval.
4. Approve later exact screen/content/architecture scope only after separate capability exposure and whole-project health/release gates. Laboratory remains future.

**AP03 physical platform/install/print and AP05 artwork rights/trademark remain OPEN.** No rights clearance, WCAG certification, whole-product health or final Design System acceptance is claimed. [Browser QA](QA.md) and [independent critique](evidence/independent-review.md) support review only. Keep existing PR #109 Draft/Open/Unmerged, auto-merge off. No merge, deployment, ready transition or production implementation.
