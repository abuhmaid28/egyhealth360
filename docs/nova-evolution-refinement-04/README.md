# NOVA EVOLUTION — refinement 04

One design/content-only Patient My Care refinement against preserved PR #92. The direct owner brief applies **Professional Egyptian Arabic**, simpler patient-facing time/explanations and stronger non-photo identity/iconography to the selected NOVA direction. No other screen, production implementation, final branding/system or finalist validation is authorized.

## Visual artifacts

- [Full Arabic mobile, 390px](evidence/refined-ar-390-full.png)
- [Full Arabic desktop, 1440px](evidence/refined-ar-1440-full.png)
- [One complete before/after comparison against PR #92](evidence/before-after.png)

All images are actual Chromium HTML/CSS/SVG renders. The board contains complete phones at native display width and complete desktops at 50%; no cropping. Original before bytes come directly from pinned Git objects, without editing PR #92 or duplicating its images in this package. [Comparison fingerprints](evidence/comparison-sources.json).

## Compact visual/content rationale

| Owner concern | Concrete change and reason |
| --- | --- |
| Technical time | Main time is **2:30 مساءً**, with **لحد 3:00 مساءً** below. The UTC/Cairo helper is removed from the main surface. Exact offset-bearing instants and clinic zone remain in HTML semantics/evidence; existing detail explains clinic time. |
| Weak month/date | Month weight/size increases, including the orbital date's phone month from 13px to 19px and desktop month from 14px to 24px. Full weekday/date/year remain. The start time leads while the end stays explicit. |
| Patient initials | Replaced with an original profile glyph beside سلمى حسن. Doctor stethoscope is redrawn on the same grid and its shaped holder refined. Both are decorative; names/clinic carry identity, without verified-credential claims. |
| Inconsistent icons | Twenty icon instances share thirteen original local 24-unit SVG symbols, consistent 1.65 stroke, rounded joins/caps and related shaped holders. Navigation, doctor/patient identity, source sections, quick access, actions and preview markers follow the same language; the existing orbit stays decorative. |
| Formal/technical wording | Follow-up becomes **الدكتور رشّح لك متابعة**; source prose becomes **دي توصية من الدكتور، مش ميعاد محجوز** and **تقدر تقرا الملخص اللي الدكتور شاركه معاك**. The no-link qualifier **هنا** and bounded history/prescriptions remain. Already natural navigation is retained. |
| Long policy helper | The page shows **الحجز لوحده مش بيشارك معلوماتك الطبية.** The original access meaning and both new-request approvals stay in the existing appointment preview, without a new action or permission flow. |
| Specimen noise | Header/footer use **معاينة تصميم · بيانات للتجربة** and **معاينة بس · مفيش خدمات شغّالة**. Repeated internal NOVA/revision labels and technical disconnected wording are removed from the page; honesty remains visible. |

The dark canvas, plum source surfaces, framed navigation, lime primary action, controlled asymmetric corners, typography and information architecture remain NOVA. Body prose stays 16px; source states 13px and provenance/privacy 14px. Phone length falls **2002→1907px** through simpler copy, not smaller body type or removed core content. Desktop is **1277→1295px**, giving the stronger date composition room. These are layout observations, not usability-study results.

## Language artifact and source meaning

[Egyptian Arabic UI Writing Note](EGYPTIAN_ARABIC_UI_WRITING_NOTE.md) documents the owner-directed default for future authorized work across the product, with examples and exact scope. It explicitly resolves the older CD07 24-hour/offset presentation rule for this ordinary patient surface, while preserving stored instants and necessary clinical precision. No full-project rollout or accepted clinical/security contract change occurs.

Same synthetic سلمى حسن, د. عمر علي, Nile Care Clinic; confirmed 12 November 2026, 14:30–15:00 Cairo UTC+02:00. Independent recommendation and released summary stay dated 5 November. Recommendation is not a reservation; no linked appointment is known here. The summary is only what the doctor shared. History is bounded; prescriptions are unavailable in this preview. No private-source hint, AI, medical advice, automatic booking, new clinical capability or operational service.

## Verified baseline and explicit loading

- Repository `abuhmaid28/egyhealth360`; fresh main/base **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**.
- Preserved primary source [PR #92](https://github.com/abuhmaid28/egyhealth360/pull/92), **`6e1d5aa011d2e229f17e22415bf3efe0aa035c49`**, verified DRAFT/OPEN. Required README/review/validation/HTML/CSS and both full images inspected.
- Isolated branch `design/72-nova-evolution-refinement-04`, based on main. Final HEAD, Draft PR and actual exact-head CI belong in the remote handoff. Current issue #72/recent PRs were checked; the latest direct Refinement 04 brief controls this scope and presentation amendment.
- Accepted UXD10–16, IA01–05/Patient B, product/source/privacy meanings and ordinary task terminology remain. The new note records the owner's content direction; no broad implementation follows.

**EXPLICIT_AUDITED_PLAYBOOK_LOADING**; native activation is unverified and not claimed. All eight pinned resources were explicitly loaded before authoring. [Exact commits, paths, hashes and baseline-resource fingerprints](evidence/provenance.json).

| Pin | Resources loaded |
| --- | --- |
| PR #89, `0886788bd6b395bb7cace8653ffe280da68af4b8` | `docs/zero-cost-design-pilot/PLAYBOOK.md`, `AUDIT.md`, `vendor/basic-ux-excerpts.json`, `vendor/upstream-lock.json`, `vendor/LICENSE` under that directory |
| PR #87, `b3eb9543a58d571968a16168d3492bf817792cb4` | `.agents/skills/eh360-visual-exploration/SKILL.md`, `.agents/skills/eh360-visual-qa/SKILL.md`, `docs/skills-pilot/REFERENCE_MAP.md` |

Older candidate/role/language counts yield to this one-screen brief. Local OFL fonts/notices are copied unchanged. No upstream installer/generator, native activation claim, new product dependency, paid API/asset/subscription/credit purchase or deployment.

## Review, validation and reproduction

[Independent review](INDEPENDENT_REVIEW.md) gives separate visual, content-language and technical judgments. [Validation](VALIDATION.md) records actual layout, content/time, keyboard, contrast, motion and preservation evidence with limitations. Stop for Product Owner review; no automatic finalist validation or final brand/system decision.

Serve repository root on localhost port 8765. With existing Playwright/Chromium, run the scripts in `tools/`: `render.mjs`, `content.mjs`, `contrast.mjs`, `motion.mjs`, `comparison.mjs`, then `verify.mjs`. `SPECIMEN_ORIGIN` / `CHROMIUM_PATH` select installed alternatives for specimen tests. No app/backend is needed for these renders; the owner can simply view the PNGs.
