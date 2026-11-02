# Patient — My Care visual/content refinement

Authority: [independent review 6577639703](https://github.com/abuhmaid28/egyhealth360/pull/79#issuecomment-6577639703) and the user's explicit instruction to implement only those refinements. Refinement base: `218887c5d15b88bbad6e5bb5a336202305fe655e`; main remains `0a0e9c2038ecad420e95c2c67ae367129e195839`. PR #79 stays OPEN / UNMERGED / AUTO-MERGE OFF. No deployment.

## Bounded resolutions recorded before implementation

- The review supersedes the SVG's static morning greeting: use `Welcome back,` / `أهلاً يا` without reading browser time or inventing a patient timezone.
- Keep the approved appointment gradient, radius, all source facts, 24-hour event time, timezone/offset, status, access-boundary meaning and 44px desktop / 48px mobile primary actions. Tighten spacing and group date/time; let content wrap and grow rather than imposing a clipping height.
- Replace the generic clinician glyph with neutral name-derived initials, omitting a known honorific and using a deterministic dash when no usable name exists. Keep the full displayed name and bidi isolation; do not invent a photograph or identity.
- Keep all four shortcut destinations and the explicit unavailable Live prescription state. Desktop shortcuts become compact, unboxed quick-access modules. Preserve the existing mobile four-icon strip.
- The initial refinement capture exposed an empty area below the shorter anchor because the taller next-actions rail sized the shared grid row. Let that existing rail span the first two left-column rows so the appointment/shortcuts flow compactly; preserve the rail's content, styling and priority, and the mobile sequence.
- Darken only the slice-local muted role from `#64748B` to `#526178`, as explicitly requested for contrast margin. Keep the existing brand colors, fonts and all other tokens.
- Preserve all existing adapter/read projections, IA, current-source invalidation, Live/Demo isolation, privacy/security semantics, source absence wording and booking-is-not-authority meaning. No clinical/backend/API/schema/security/configuration or unrelated-surface changes.

The original owner handoff, SVG, initial implementation report and every prior evidence file remain byte-identical. New captures and before/after/reference comparisons belong under `refinement-evidence/`.

## Review evidence and outcome

The five requested refinements are implemented in the existing `/patient` slice. Independent refinement review and Product Owner visual acceptance remain **PENDING**. Technical Green is not design approval; no pixel-perfect parity is claimed.

| Requested refinement | Result |
| --- | --- |
| Neutral greeting | `Welcome back, {name}` / `أهلاً يا {name}`. No clock lookup, timezone inference or event-time behavior change. |
| Compact appointment | At 1600×1000, EN **258.38 → 210.53px**, AR **266.16 → 216.53px**. Date/time share one grouped line; real zone/offset, clinic, source identity, visit status and booking/access boundary remain visible. CTA stays **44px desktop / 48px mobile**. At 390×844 the anchor is 310.03px EN / 296.64px AR, with no fixed clipping height. |
| Lightweight shortcuts | Four desktop modules are **80px**, down from the reviewed 128px minimum. No filled card backgrounds or enclosing borders; restrained baseline separators and source labels remain. The mobile four-icon strip, accessible destination names and visible Live-unavailable Rx wording are preserved. |
| Clinician identity | A neutral monogram derives from the available display name, omits a known honorific and uses `—` when no usable name is available. Full source name remains unchanged and bidi-isolated. No portrait asset or synthetic identity is introduced. |
| Contrast cushion | Local muted role changes to `#526178`. Support on canvas measures **5.96:1**, up from 4.51:1. **26** sampled rendered text/background roles now have a minimum of **5.36:1**; white appointment text remains 5.91:1 against the lighter gradient endpoint. |

## Evidence

Actual production-built frontend captures, synthetic data only. [Before/after and matched-reference review page](refinement-evidence/patient-my-care-review.html), [rendered comparison](refinement-evidence/patient-my-care-review.png), [measurements/contrast](refinement-evidence/patient-my-care-visual.json), [browser assertions](refinement-evidence/patient-my-care-browser.json), [exact changed-path and preservation inventory](refinement-evidence/patient-my-care-refinement-preservation.json).

| Evidence | English | Arabic RTL |
| --- | --- | --- |
| Desktop, 1600×1000 | [EN](refinement-evidence/patient-my-care-desktop-en.png) | [AR](refinement-evidence/patient-my-care-desktop-ar.png) |
| Mobile, 390×844 | [EN](refinement-evidence/patient-my-care-mobile-en.png) | [AR](refinement-evidence/patient-my-care-mobile-ar.png) |
| Mobile full reading export | [EN](refinement-evidence/patient-my-care-mobile-en-full.png) | [AR](refinement-evidence/patient-my-care-mobile-ar-full.png) |
| Matched desktop window, 1110×800 | [EN](refinement-evidence/patient-my-care-matched-desktop-en.png) | [AR](refinement-evidence/patient-my-care-matched-desktop-ar.png) |
| Matched mobile window, 314×674 | [EN](refinement-evidence/patient-my-care-matched-mobile-en.png) | [AR](refinement-evidence/patient-my-care-matched-mobile-ar.png) |
| 320px reflow | [EN](refinement-evidence/patient-my-care-320-en.png) | [AR](refinement-evidence/patient-my-care-320-ar.png) |
| 200% text, 390px | [EN](refinement-evidence/patient-my-care-text-200-en.png) | [AR](refinement-evidence/patient-my-care-text-200-ar.png) |
| Keyboard focus | [EN](refinement-evidence/patient-my-care-focus-en.png) | [AR](refinement-evidence/patient-my-care-focus-ar.png) |
| Loading | [EN](refinement-evidence/patient-my-care-loading-en.png) | [AR](refinement-evidence/patient-my-care-loading-ar.png) |
| Empty | [EN](refinement-evidence/patient-my-care-empty-en.png) | [AR](refinement-evidence/patient-my-care-empty-ar.png) |
| Read error | [EN](refinement-evidence/patient-my-care-error-en.png) | [AR](refinement-evidence/patient-my-care-error-ar.png) |
| Uncertain/source verification | [EN](refinement-evidence/patient-my-care-uncertain-en.png) | [AR](refinement-evidence/patient-my-care-uncertain-ar.png) |
| Controlled Live reads | [EN](refinement-evidence/patient-my-care-live-desktop-en.png) | [AR](refinement-evidence/patient-my-care-live-desktop-ar.png) |
| Live read failure | [EN](refinement-evidence/patient-my-care-live-error-en.png) | [AR](refinement-evidence/patient-my-care-live-error-ar.png) |

The review page includes the original SVG rasterized without editing and equal-window comparisons, plus the previous implementation alongside each updated desktop/mobile locale. Viewport captures retain actual sticky navigation. Full reading exports temporarily move that navigation to the footer to avoid overlaying exported content.

## Short discrepancy register

| Difference from supplied study | Classification | Disposition |
| --- | --- | --- |
| Neutral greeting, clinician initials, darker muted text and unboxed shortcuts replace the illustrative treatment. | Intentional/required | Explicit independent-review requests; no new direction or identity asset. |
| Desktop anchor remains 5.53px EN / 11.53px AR taller than the illustrative 205px, and mobile is taller than the illustrative 170px. | Intentional/required | Preserve real metadata, readable type, 44/48px controls and explicit safety meaning. Text wraps and height grows; no clipping or tiny metadata to force parity. |
| The next-actions rail spans the first two left-column rows. | Intentional/required | Removes the empty area left by the compact anchor. The same 8:4 composition, next-action contents/priority, four shortcuts and mobile order remain. |
| Supported actions/destinations and actual source data differ from illustrative Lab/refill/counts, doctor/date and photographs. | Intentional/required | Preserve the implementation decisions explicitly marked good: accepted IA, real adapters, timezones, truthful capability boundaries and source privacy. Original implementation conflict register still applies. |
| Existing Demo summaries lack author/time; Live prescription integration is unavailable. | Implementation debt — unchanged | Continue to show absence/unavailability explicitly. No new capability or clinical claim. |
| Native-device, cross-browser, assistive-technology and independent Arabic visual acceptance are not established by these Linux Chromium captures. | Unresolved review coverage | Retain existing gates; author checks and CI do not substitute for independent refinement review or Product Owner acceptance. |

## Changed files and preservation

**51 paths** relative to the refinement base: 12 modified files and 39 additions (36 evidence files, this report, the monogram helper and preservation checker). Every exact path is listed in the preservation JSON.

- Presentation only: `apps/web/src/components/patient-my-care.tsx`, `patient-my-care.module.css`, `apps/web/src/lib/patient-my-care-copy.ts`, new `patient-my-care-avatar.ts`.
- Affected checks: `tests/ui-my-care.test.mjs`, `scripts/test-ui-browser.mjs`, `scripts/support/ui-live-journey-browser.mjs`, `scripts/support/ui-my-care-browser.mjs`, `scripts/capture-patient-my-care.mjs`, new `scripts/check-patient-my-care-refinement-scope.py`.
- Current scope/reference updates: `docs/CURRENT_STATUS.md`, `PROJECT.md`, `IMPLEMENTATION_ROADMAP.md`, `SOURCE_OF_TRUTH.md`; this report and new `docs/ui-reference/refinement-evidence/` outputs.

The byte-preservation check retains **971** other existing files, including all **18** protected V1 files and **36** original implementation evidence files. The original owner handoff/SVG, initial implementation report, fonts/licenses, Application guard, API/adapters/read projections, backend, OpenAPI, database/schema/migrations, security/authorization, CI policy, hosting/deployment and unrelated clinical workflows remain byte-identical to the refinement base. The read/state/session composition is also unchanged inside the edited component; shortcut/recent-care route and source/status logic is preserved.

## Validation and reproduction

- Production Next build, web TypeScript typecheck and actual frontend ESLint gate: PASS.
- UI tests: **162/162 PASS**, including actual-name monograms for Latin/Arabic/Unicode, honorific handling, deterministic absence, and the unchanged appointment/source/timezone/identity-minimization cases.
- My Care browser checks: PASS for 14 width/locale reflow cases to 320px, both 200% text cases, visible keyboard focus, unchanged touch targets, all state families, mode visibility, monogram rendering and read-only Live/Demo isolation. Existing source invalidation, expired-session recovery and private-canary suppression remain checked.
- Full existing browser regression: PASS for Golden Demo, EN/AR/RTL, role/booking/documentation/source/follow-up/close boundaries and responsive navigation. Only the three affected English Patient home greeting expectations changed; the global locale catalog and unrelated surfaces remain unchanged.
- Capture assertions: desktop anchor ≤225px in both locales, transparent desktop shortcuts ≤96px, support contrast ≥5.5:1 and all sampled text contrast ≥4.5:1. Measured results above exceed those margins. This is bounded author verification, not accessibility certification.
- Repository document classification/references, diff whitespace and scope-preservation checks: PASS. Exact-head remote CI results are recorded in PR #79 and the final handoff; no CI policy is changed.

Local environment: Node 24.19.0 / Chromium 154.0.8037.57; remote CI supplies repository-pinned Node 24.21.0 / pnpm 10.34.6. No new package or dependency is added.

After normal repository setup, build the frontend, then run `node --test tests/ui*.test.mjs`, `EH_UI_CHROMIUM=/usr/bin/chromium node scripts/test-ui-browser.mjs`, `MY_CARE_REFINEMENT=1 node scripts/capture-patient-my-care.mjs`, `python3 scripts/check-patient-my-care-refinement-scope.py` and `node scripts/ci/check-docs.mjs`. The refinement flag writes only the new evidence directory. The old capture directory and preservation report remain the original review baseline.

## Health and next gate

No new P0/P1 foundation defect is established; the previously accepted healthy-with-non-blocking-debt disposition remains. This refinement does not authorize broader rollout, final Brand/Design System freeze, Lab/I4/I5/EACCE/AI, deployment or merge. Independent **visual refinement review is PENDING**, followed by Product Owner review. Keep PR #79 **OPEN / UNMERGED / AUTO-MERGE OFF**.
