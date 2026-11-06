# Patient — My Care implementation review

Authority: [Issue #72 / Premium Synthesis implementation gate](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6574268901), [execution prompt](CODEX_PROMPT.md), [written specification](PREMIUM_SYNTHESIS_SPEC.md) and [committed SVG](reference/patient-my-care-reference.svg). Implementation base: `04311ba44336f164ca13c8ced310a64d957f2ed3`. Main base remains `0a0e9c2038ecad420e95c2c67ae367129e195839`. Only the real `/patient` My Care surface is authorized. PR #79 stays open/unmerged, auto-merge off.

## Conflicts recorded before implementation

The accepted product/clinical contracts take precedence, followed by written behavior/tokens, then reference composition. These are required bounded adaptations, not a new visual direction.

| Reference detail | Classification | Required implementation |
| --- | --- | --- |
| Six desktop primary destinations, including Lab | Intentional/required — accepted IA | Keep My care / متابعتي and Find care / دور على دكتور primary. Existing appointment, summary, available-history and account retrieval stays secondary. No new Lab destination or capability. |
| Refill, pending Lab, care-plan actions; complete-record and active-prescription counts | Intentional/required — capability/clinical truth | Preserve the short action-list and lightweight shortcut composition, but populate only supported source retrieval and released follow-up. No invented refill, Lab result, care-plan task, hidden-source count or complete-record claim. Live prescription integration remains unavailable. |
| SVG 2025 date and 12-hour time | Intentional/required — accepted content | Render actual adapter events with Latin digits, named Gregorian months, 24-hour time and explicit event timezone. Never infer visit completion from the clock. Source events without a provided clinic zone retain explicitly labeled UTC. |
| SVG text omits the base font class on light-on-dark content and names Inter in its style | Intentional/required — written type specification | Use Manrope + IBM Plex Sans Arabic, pinned local font assets already present in this review branch, with Inter/Noto/system fallbacks. No runtime font service. |
| SVG 24–34px mobile/desktop CTA and tiny status text | Intentional/required — written accessibility rules | Preserve placement, white appointment CTA and hierarchy, with 44px desktop / 48px mobile actions and readable metadata. |
| Bright semantic success/warning swatches are insufficient for small text on pale surfaces | Intentional/required — accessibility | Retain the supplied semantic colors for marks/backgrounds. Use primary text plus semantic icon/wording on status surfaces, not unreadable small colored text. No substitute brand palette. |
| Board/device frames, design-intent panel and drawing notes | Intentional/required — presentation versus product | These remain reference annotations, not product UI. Preserve appointment + next-actions alignment, shortcuts, recent-source list and mobile priority. |
| Shared-summary exact-detail deep link is not an existing patient route | Intentional/required — bounded routing | Open the existing shared-summary reader with explicit list-oriented action wording; do not invent a new detail route or modify its workflow. |

Additional pre-change mobile resolution: preserve the SVG's four compact icon shortcuts rather than carrying desktop tiles onto the phone. Their full accepted names remain in accessible labels and native titles. Live's unavailable prescription shortcut keeps visible unavailable-state wording. Mobile shows the first two prioritized action rows; appointment retrieval remains explicit in the shortcut row and appointment anchor. This follows the reference's mobile hierarchy without adding capabilities.

Validation correction recorded before adjustment: the first CI real-browser pass caught an Arabic mode-label drift from accepted `رعاية متصلة`; the accepted wording is restored. The subsequent disposable-PostgreSQL browser proof found that the utility mode label was hidden below 1200px. A single visible mode label moves to the greeting's supporting line at every width, preserving the 72px reference header and explicit Demo/Live boundary. No test expectation or authority behavior is weakened.

## Scope and evidence

The implementation enters only for the authenticated Patient role at exact `/patient`. The existing Application, routes, providers, adapters and workflows remain intact outside that insertion. The slice reads existing own-profile, own-booking, public-directory, released-summary and follow-up interfaces. It makes no mutation on entry. Current source invalidation suppresses old shared metadata immediately without restarting unrelated logistics reads; an expired Live session retains the existing refresh-session recovery.

Tokens, typography and visual primitives are local to this slice. Existing local Manrope and IBM Plex Sans Arabic files and their original SIL OFL licenses are copied byte-for-byte; there is no new package, external font service or dependency change. Mixed-direction source names, dates, times and zones are isolated with `bdi`; source names are not automatically translated.

No production promotion, broader shell rollout, Clinician redesign, backend/API/database/security change, Final Brand V2 or Design System V2 freeze is authorized.

### Review evidence

All paths below are relative to this document's directory. Captures are synthetic data rendered by the actual production-built frontend, not mockups. See [comparison page](evidence/patient-my-care-review.html), [comparison image](evidence/patient-my-care-review.png), [browser assertions](evidence/patient-my-care-browser.json), [measured visual/contrast results](evidence/patient-my-care-visual.json) and [byte-preservation inventory](evidence/patient-my-care-preservation.json).

| Evidence | English | Arabic RTL |
| --- | --- | --- |
| Desktop, 1600×1000 | [EN](evidence/patient-my-care-desktop-en.png) | [AR](evidence/patient-my-care-desktop-ar.png) |
| Mobile, 390×844 | [EN](evidence/patient-my-care-mobile-en.png) | [AR](evidence/patient-my-care-mobile-ar.png) |
| Mobile full reading export | [EN](evidence/patient-my-care-mobile-en-full.png) | [AR](evidence/patient-my-care-mobile-ar-full.png) |
| 320px reflow | [EN](evidence/patient-my-care-320-en.png) | [AR](evidence/patient-my-care-320-ar.png) |
| 200% text, 390px | [EN](evidence/patient-my-care-text-200-en.png) | [AR](evidence/patient-my-care-text-200-ar.png) |
| Keyboard focus | [EN](evidence/patient-my-care-focus-en.png) | [AR](evidence/patient-my-care-focus-ar.png) |
| Loading | [EN](evidence/patient-my-care-loading-en.png) | [AR](evidence/patient-my-care-loading-ar.png) |
| Empty | [EN](evidence/patient-my-care-empty-en.png) | [AR](evidence/patient-my-care-empty-ar.png) |
| Read error | [EN](evidence/patient-my-care-error-en.png) | [AR](evidence/patient-my-care-error-ar.png) |
| Source verification / uncertain | [EN](evidence/patient-my-care-uncertain-en.png) | [AR](evidence/patient-my-care-uncertain-ar.png) |
| Controlled Live reads | [EN](evidence/patient-my-care-live-desktop-en.png) | [AR](evidence/patient-my-care-live-desktop-ar.png) |
| Live read failure | [EN](evidence/patient-my-care-live-error-en.png) | [AR](evidence/patient-my-care-live-error-ar.png) |

The unmodified supplied SVG is also rasterized as [original board](evidence/reference-board.png), [1110×800 desktop window](evidence/reference-desktop-window.png) and [314×674 mobile window](evidence/reference-mobile-window.png). Equal-window implementation captures are [desktop EN](evidence/patient-my-care-matched-desktop-en.png), [desktop AR](evidence/patient-my-care-matched-desktop-ar.png), [mobile EN](evidence/patient-my-care-matched-mobile-en.png) and [mobile AR](evidence/patient-my-care-matched-mobile-ar.png). Device/board chrome is excluded only from window comparisons. Required 390×844 viewport captures retain the actual sticky navigation; full-page reading exports temporarily move it to the footer to avoid repeated overlay in an export.

### Final discrepancy register

The pre-implementation conflict table above remains part of this register. Pixel-perfect parity is **not** claimed.

| Observed difference | Classification | Reason / review consequence |
| --- | --- | --- |
| Original board embeds an 1110px desktop window; the actual app also fills the required 1600px viewport. | Intentional/required | Preserve the supplied 40px desktop padding, 24px grid gap, approximately 8:4 column balance, 72px header and 16px appointment radius. Compare equal-window captures as well as required viewports. |
| Appointment height is 258.38px EN / 266.16px AR at 1600px, versus the SVG's 205px illustrative anchor. Mobile is also taller than the illustrated 170px anchor. | Intentional/required | Actual 24-hour event time, explicit timezone/offset, booking/access boundary, readable type and 44/48px controls need space. The anchor remains the strongest element; no arbitrary clipping or shrinking of these meanings. |
| Recent care and shortcut content differs from illustrative Lab, active-Rx and completeness counts. The original doctor/date/avatar are replaced by actual adapter values and a neutral initial avatar. | Intentional/required | No fabricated clinical capability, photograph, source, count or visit status. Recent care lists only permitted current released summary metadata and completed visit logistics, not a duplicate future booking. |
| Mobile uses two supported prioritized actions and four compact icon shortcuts; full shortcut names are accessible labels/titles. Live Rx explicitly says unavailable. | Intentional/required | Preserve reference mobile hierarchy while keeping integration boundaries visible. Existing destination screens remain unchanged. |
| Language, Demo/Live label, sign-out and Demo-only workspace/state controls supplement the illustration. | Intentional/required | Preserve existing language/session/demo operations and explicit mode boundaries. No Demo control or fallback appears in Live. |
| Released Demo summaries do not provide an author/timestamp; Live prescriptions are not integrated. | Implementation debt — existing integration limit | Missing source metadata is explicitly stated, and the Live Rx shortcut is unavailable. Resolving these needs a separately authorized integration task; this slice does not invent values or change contracts. |
| Arabic composition is derived from the written RTL/content rules; no separate owner-supplied Arabic SVG exists. Platform/font rendering may differ outside Linux Chromium. | Unresolved — review coverage | Independent Arabic visual review, native-device/browser and assistive-technology evaluation remain pending. No owner acceptance or accessibility certification is inferred from these checks. |

### Validation and reproduction

Changed-file inventory relative to the implementation base: **60 paths** (10 modified existing files and 50 additions). The preservation JSON lists every exact path. Grouped review scope:

| Paths | Purpose |
| --- | --- |
| `apps/web/src/components/application.tsx` | Seven-line exact Patient home dispatch/import; other behavior preserved byte-for-byte. |
| `apps/web/src/components/patient-my-care.tsx`, `patient-my-care.module.css` | Scoped screen, semantic primitives, reference tokens, responsive RTL and states. |
| `apps/web/src/lib/patient-my-care.ts`, `patient-my-care-copy.ts` | Minimized read projections, date/time and bilingual authored labels. |
| `apps/web/public/fonts/README.md`, five files under `apps/web/public/fonts/my-care/` | Local fonts, original licenses and provenance. |
| `scripts/test-ui-browser.mjs`; `scripts/support/ui-live-journey-browser.mjs`, `ui-polish-browser.mjs`, `ui-rtl-browser.mjs`, `ui-my-care-browser.mjs` | Preserve existing regression coverage and add bounded My Care browser checks. |
| `scripts/capture-patient-my-care.mjs`, `scripts/check-patient-my-care-scope.py`, `tests/ui-my-care.test.mjs` | Reproducible browser/reference evidence, byte-preservation proof and four meaningful projection tests. |
| `docs/CURRENT_STATUS.md`, `IMPLEMENTATION_ROADMAP.md`, `PROJECT.md`, `SOURCE_OF_TRUTH.md` | Current authorization, scope, next gate and reference classification. |
| This document and 36 files under `docs/ui-reference/evidence/` | Handoff, screenshot inventory, comparison and measured QA/preservation reports. |

- Production Next build and web TypeScript typecheck pass. Actual frontend ESLint gate and full repository ESLint pass.
- UI tests: **161/161 pass**, including new projection tests for appointment status/time ordering, missing Live directory identity, source minimization/current release and Cairo DST conventions.
- Full existing browser regression passes: Demo Golden Flow, EN/AR navigation and role surfaces, booking, documentation, source privacy, follow-up, Live contracts and storage boundaries. Existing checks were adapted only where the exact My Care root changed; legacy drawer checks still exercise the unchanged Appointments shell.
- Complete real browser → Next → Nest → disposable PostgreSQL 18 proof also passes locally: actual booking lifecycle, relationship-gated opening, signing/release, correction/addendum, private/wrong-patient/session suppression, follow-up and close/retry. Existing real-browser tests are unchanged. Their generated historical screenshots were restored before the preservation check; only the new My Care evidence is delivered. The two mode-label findings above are corrected and covered by explicit EN/AR narrow-width visibility assertions.
- New My Care browser checks pass: EN/AR desktop/mobile, 14 width/locale reflow cases down to 320px, both 200% text cases, visible keyboard focus, touch targets, four state families and controlled Live transport. Live uses only seven existing GET paths. Independent profile failure preserves appointment logistics; summary denial removes stale shared metadata; transport/session failures stay Live; session expiry has recovery and no request loop.
- Actual rendered text sampling covers **26 roles, minimum 4.51:1**; appointment white text is checked against the lighter endpoint of the approved gradient (5.91:1). Visible solid focus, semantic HTML, skip link, logical RTL layout, bidi isolation and reduced-motion rules are present. These are bounded automated/author checks, not a complete WCAG or assistive-technology audit.
- Repository document sanity/reference classification and `git diff --check` pass. Preservation script checks all pre-existing bytes outside the ten explicitly allowed source/test/document entries, the exact-route Application insertion, original owner handoff, 18 protected V1 files, all previous visual artifacts and font provenance. Exact paths and hashes are in the linked JSON.
- Local environment: Node 24.19.0, Chromium 154.0.8037.57. The repository requires Node 24.21.0 / pnpm 10.34.6; required remote CI supplies those pinned versions. Remote exact-head results belong in PR #79 and the final handoff, rather than claiming local version parity.

After the repository's ordinary install/build setup, reproduce with `node --test tests/ui*.test.mjs`, `EH_UI_CHROMIUM=/usr/bin/chromium node scripts/test-ui-browser.mjs`, `node scripts/capture-patient-my-care.mjs`, `python3 scripts/check-patient-my-care-scope.py` and `node scripts/ci/check-docs.mjs`. The capture command requires a production web build and uses isolated synthetic browser state/controlled transport. It starts and stops its own local server; it does not deploy or mutate a production API/database. For the existing real-browser proof, use `pnpm test:ui:real` with a disposable PostgreSQL `DATABASE_URL`, built API/DB/web, pinned pnpm and Chromium available; restore its generated historical screenshot outputs afterwards.

### Whole-project health and next gate

No new P0/P1 foundation defect is established. Existing integration and native/accessibility/research gates remain non-blocking debt for this bounded review candidate, not permission to expand implementation. Backend, API/OpenAPI, DB/schema/migrations, security/authorization, CI policy, hosting/deployment configuration and unrelated clinical workflows are byte-identical to the implementation base. Booking still grants no clinical authority. No Lab/I4/I5/EACCE/AI behavior is added.

Independent visual implementation verdict: **PENDING**. Product Owner acceptance: **PENDING**. Author verification is not independent approval, and technical Green does not select final brand or freeze Design System V2. PR #79 must remain **OPEN / UNMERGED / AUTO-MERGE OFF**; independent implementation review and Product Owner review of this slice are the next gate.
