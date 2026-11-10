# One bounded visual refinement — PR #109

**HIGH-FIDELITY CANDIDATE ONLY. STOP FOR PRODUCT OWNER VISUAL APPROVAL.** Same Draft/Open/Unmerged [PR #109](https://github.com/abuhmaid28/egyhealth360/pull/109), branch `design/108-staff-admin-review`. Auto-merge off. No deployment, production change, final Design System acceptance or subsequent design round is authorized.

## Verified authority and scope

Owner authorization: [6773923460](https://github.com/abuhmaid28/egyhealth360/pull/109#issuecomment-6773923460), latest applicable comment at execution. Read AGENTS → Issue #108 / current owner decisions → CURRENT_STATUS → FOUNDATION_CHARTER / SOURCE_OF_TRUTH → accepted I1/I3/Slice2/security/IA/content/Arabic references → source/schema/OpenAPI/Live guards and original design evidence before editing. Rechecked controlling #101 Brand, #105 DSV2-01–04 and #107 preferred-reference decisions. No superseding decision or material capability/contract discrepancy found.

Base/current main: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. Before head: `87535bb1682b934ec90ed6bff9e66ba3140e331d`. Exact new head and remote run/jobs are recorded in the PR receipt, avoiding a self-referential commit hash here. Only this isolated review folder changes relative to the before head. The original 18 PNGs and 23 original evidence files remain byte-identical; pinned Brand assets/fonts and protected historical evidence remain unchanged. [Preservation inventory](evidence/refinement/preservation.json).

The existing [capability matrix](CAPABILITY_AND_AUTHORITY.md) still applies. Pharmacy controller/persistence/OpenAPI implement exact-route fulfillment but the Live adapter and operations guard explicitly lack staff fulfillment. Lab order/result models/routes/Live UI remain unimplemented. Admin inspect/status/membership internal services do not constitute a public Live management console. Hosting parity remains unverified. No new capabilities, clinical values or results are represented.

## What changed and why

- **Pharmacy:** a compact selected-route/status disclosure replaces the tall mobile queue, with both A/B routes retained and the desktop queue initially expanded. Exact selected route, synthetic identity/source and omitted-item/eligibility caveat precede the review action. Detail retains exact signed-source requirements, professional date/time/zone, separate accept versus full-item dispense, current authority checks and bounded history. No committed outcome is simulated.
- **Laboratory:** a narrower order context leads into numbered, distinct order/draft/final stages and an empty result plane. Verification-boundary review follows these stages; attribution and visibility detail remain below. FUTURE / CONCEPT / NOT LIVE remains on the wrapper and task panel, including standalone images. No result, medical value, automatic sign-off or doctor-release queue exists.
- **Admin:** People/Organizations and selected row lead directly into the same account–organization membership. Account, organization and current membership states remain distinct; membership status precedes the operational review action. Grant provenance/consequences remain visible. Selecting the pharmacy organization retains Organizations context; the secondary account/org opens uniform unavailable rather than a mismatched membership.
- **Shared:** replace editorial hero slogans with compact task headings; reduce repeated prose/spacing, keep authored Light/Dark and the source-exact Violet × Apricot identity/Inter/Plex. Refine the selector and keyboard dialog containment. No navigation destination is removed. Staff shells/theme behavior remain candidates, not final DS decisions.

This is a noncommitting review layout, not authorization to put a real dispensing control before exact medication/quantity/instructions. Those fields must be presented and verified in a later separately approved clinical implementation; this specimen deliberately omits their values.

## Real-browser Before/After evidence

Six PNGs were captured directly by Chromium: before and after pages rendered in adjacent natural-width iframes. No image generation or raster compositing. Each frame retains its own disclosure. Both frames share the taller page height so bottom-of-page whitespace truthfully shows the shorter reading path. Screenshot dimensions and hashes are in [comparison-results.json](evidence/refinement/comparison-results.json).

| Comparison | Frame width | PNG dimensions |
| --- | --- | --- |
| [pharmacy / ar / light](evidence/refinement/pharmacy-ar-light-390-comparison.png) | 390px | 804 × 2142 |
| [pharmacy / ar / dark](evidence/refinement/pharmacy-ar-dark-390-comparison.png) | 390px | 804 × 2142 |
| [laboratory / ar / light](evidence/refinement/laboratory-ar-light-390-comparison.png) | 390px | 804 × 2181 |
| [admin / ar / dark](evidence/refinement/admin-ar-dark-390-comparison.png) | 390px | 804 × 2006 |
| [laboratory / ar / dark](evidence/refinement/laboratory-ar-dark-768-comparison.png) | 768px | 1560 × 1745 |
| [admin / en / light](evidence/refinement/admin-en-light-1440-comparison.png) | 1440px | 2904 × 1351 |

## Measured mobile action and reading depth

Both heads were served locally with the same pinned fonts in Chromium 154.0.8037.57. Width 320/390, viewport height 900 CSS px, root text 100%, initial scroll zero. Y is the top of the existing primary **review** action from document origin; page is total scrollHeight. Scroll is the minimum displacement to reveal the whole action. Tab is actual keyboard presses from initial document focus, including skip/navigation/disclosures. Values are rounded CSS px; scroll uses unrounded bounds. Both themes returned identical geometry for each row below. These are 24 before/after measurements, not timing/user-study results.

| Role / locale / width | Action Y before → after | Page height before → after | Scroll to reveal before → after | Tabs before → after |
| --- | --- | --- | --- | --- |
| pharmacy / ar / 320 | 1535 → 687 | 2195 → 1628 | 687 → 0 | 7 → 6 |
| pharmacy / ar / 390 | 1486 → 687 | 2094 → 1582 | 638 → 0 | 7 → 6 |
| pharmacy / en / 320 | 1698 → 729 | 2395 → 1764 | 850 → 0 | 7 → 6 |
| pharmacy / en / 390 | 1490 → 656 | 2118 → 1596 | 642 → 0 | 7 → 6 |
| laboratory / ar / 320 | 1622 → 1038 | 2305 → 1764 | 774 → 188 | 6 → 6 |
| laboratory / ar / 390 | 1502 → 989 | 2133 → 1663 | 654 → 138 | 6 → 6 |
| laboratory / en / 320 | 1733 → 1124 | 2436 → 1914 | 912 → 301 | 6 → 6 |
| laboratory / en / 390 | 1549 → 963 | 2179 → 1627 | 701 → 113 | 6 → 6 |
| admin / ar / 320 | 1556 → 968 | 2135 → 1677 | 708 → 117 | 6 → 6 |
| admin / ar / 390 | 1404 → 942 | 1958 → 1596 | 556 → 92 | 6 → 6 |
| admin / en / 320 | 1730 → 1095 | 2400 → 1931 | 909 → 272 | 6 → 6 |
| admin / en / 390 | 1436 → 915 | 1986 → 1580 | 588 → 65 | 6 → 6 |

At AR390, Pharmacy action depth falls **54%** (799px), Lab **34%** (513px), Admin **33%** (462px). Selected-detail start moves Pharmacy 739→342px, Lab 645→383px, Admin 809→536px. Headings before action are Pharmacy 5→2, Lab 4→4, Admin 5→4. Pharmacy action is fully visible initially at both widths/locales/themes; Lab/Admin still need 65–301px of scroll depending on locale/width. Lab/Admin keyboard depth is unchanged. The route list requires one extra disclosure activation on small screens; ordinary browser Back and route re-selection remain available. No claim of measured staff task efficiency.

## Executed validation and corrected findings

[Full matrix/axe/contrast/font report](evidence/refinement/qa-results.json), [supplemental keyboard/content/state report](evidence/refinement/supplemental.json), [comparison/interaction/network report](evidence/refinement/comparison-results.json).

- **60/60** layout cases: 3 roles × 2 locales × 2 themes × widths 320/390/768/1024/1440; expected direction, no horizontal document overflow, local GET assets only, no page errors.
- **12/12** cases at 390 with 200% root text; **38/38** alternate state/theme cases at 320: empty, denied, revoked (same uniform unavailable specimen), error, uncertain, history, accepted Pharmacy and Admin Organizations. Revoked query is a presentation alias; no backend revocation was tested.
- **24 axe audits**, zero violations in measured main states; incomplete/manual checks retained. **28 computed theme pairs** pass: text minimum observed 6.27:1, essential control boundaries minimum 3.87:1, focus minimum 5.22:1. Report retains exact colors/ratios, primary hover and adjacent canvas/surface/raised planes. Decorative dividers are not sole control cues. This is not WCAG certification.
- **12 primary dialogs:** keyboard Enter opens, Escape closes and focus returns; focused supplemental Tab/Shift+Tab loops stay on the single close control. **12** keyboard sequences start with visible skip-link focus; **12** long-label, **12** text-spacing, **12** opened-disclosure cases, reduced-motion and forced-colors emulation pass without overflow. **16** safe/history payload-absence checks pass.
- Accepted B opens remaining-item/dispense review, not acceptance; history retains terminal reversed FULLY_DISPENSED meaning with no patient/source instructions or action. Admin second record stays uniformly unavailable. Browser/source review confirms Organizations selection stays in Organizations.
- Comparison run observed **624 local GET requests**, zero external/non-GET requests, localStorage/sessionStorage both empty. No production API, clinical write, retry or persisted preference exists. The main matrix independently records local GET-only requests.
- Gallery ESLint, `git diff --check`, repository documentation/reference sanity and **30/30 CI-policy tests** pass. Temporary tooling only: Playwright 1.64.1, axe-core 4.10.3, ESLint 9.39.5; no dependency/lockfile changes. Required exact-new-head remote CI and all selected jobs must be checked in the PR receipt; old-head green is not reused. Current classifier selects full regression for these isolated unmapped review assets; no gate was weakened.

Independent reviewer [verdict and evidence](evidence/refinement/independent-review.md) is separate from implementation. Findings corrected within this single round: restore pre-action Admin membership status and Pharmacy source/eligibility caveat; retain Organizations context on selection; explicitly contain dialog Tab/Shift+Tab. Final review inspects actual refreshed images and independently reproduces the principal metrics and provenance checks. A passing technical/reviewer result is not Product Owner visual acceptance.

## Reproduce without overwriting historical evidence

Prepare pinned inputs using `python docs/design-system-v2/staff-admin-pilot/prepare-reference.py`; serve the current review folder on loopback port 8768. For before comparisons, extract this folder from before head `87535bb1682b934ec90ed6bff9e66ba3140e331d` to a temporary directory, copy the same verified ignored `.reference/` there, and serve it on loopback 8769. Do not replace the working gallery with the before version.

```sh
AXE_PATH=/tmp/egyhealth-tools/node_modules/axe-core/axe.min.js node docs/design-system-v2/staff-admin-pilot/verify.mjs
node docs/design-system-v2/staff-admin-pilot/supplemental.mjs
node docs/design-system-v2/staff-admin-pilot/refinement.mjs
node node_modules/eslint/bin/eslint.js docs/design-system-v2/staff-admin-pilot
node scripts/ci/check-docs.mjs
node --test tests/ci/*.test.mjs
git diff --check
```

Use an installed compatible Playwright and local Chromium (`CHROMIUM_PATH` supported by verify/refinement); AXE_PATH is temporary tooling, not a repository dependency. Scripts preserve the original evidence and write only to `evidence/refinement/`.

## Remaining owner choices and limitations

Owner must accept/refine this single candidate's visual hierarchy, mobile selector/density, staff/Admin shell, exact labels/content and clinical-context placement; no further refinement round is implied. Theme default/system/override/persistence/SSR/shared-device policy remains OPEN. Later exact screen/content/frontend architecture and capability exposure require separate authorization and whole-project health/release gates. Laboratory remains future. No final High-Fidelity or Design System approval.

**NOT TESTED:** physical Android/iOS, installed PWA, Safari/Firefox products, native 400% zoom, actual screen-reader speech, OS text/virtual keyboard, print/PDF, clinic/native Egyptian participants, real clinical source legibility, populated real result entry, backend authority/privacy/revocation/concurrency, hosting/deployment parity or rights clearance. AP03 physical platform/install/print and AP05 artwork rights/trademark remain OPEN. Synthetic QA cannot replace those gates. Original protections and clinical/privacy contracts remain binding.
