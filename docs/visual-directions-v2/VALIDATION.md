# Visual Directions V2 — evidence and review limits

Scope: [explicit owner V2 brief](evidence/owner-request.txt); [preserved GitHub authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568574368). Base main: `0a0e9c2038ecad420e95c2c67ae367129e195839`. Previous PR #79 visual head: `2dfc69aec4263c5e9fd56bd84a18328cf1bc2353`. Date: 2 November 2026. No automatic aesthetic approval follows from technical checks.

## Actual validation

Final local checks PASS: **54 actual rendered screens**, **24 reflow checks at 320px**, **6 text-resize checks at 200%**, **6 actual keyboard-focus checks**, **46 explicit contrast roles** and **494 per-screen rendered text/background pairs** (minimum **5.16:1**). No detected horizontal overflow, missing fonts, browser errors or external requests. Static HTML validation covers **348 local references**. Existing repository CI-policy tests pass **30/30**; renderer ESLint and whitespace checks pass. Preservation proves **596 main-baseline files** and **136 prior visual artifacts** byte-identical, including all **18 protected V1 files**. Baseline main CI [41384993898](https://github.com/abuhmaid28/egyhealth360/actions/runs/41384993898) is SUCCESS; main remains `0a0e9c2038ecad420e95c2c67ae367129e195839`.

The final observed results are in [browser-results.json](evidence/browser-results.json), [contrast-results.json](evidence/contrast-results.json) and [preservation.json](evidence/preservation.json). `check.py` verifies them rather than inventing skipped gates. Remote CI is recorded against the exact final head in the PR handoff; the unchanged repository classifier selects full regression for these isolated static artifact paths.

| Check | Method and evidence | Limit |
| --- | --- | --- |
| Required scope | [54-entry inventory](evidence/inventory.json): nine full screen types in both languages for each of exactly three directions | Static proposals, not a working product |
| Actual typography | Chromium renders the committed HTML using locally bundled fonts; no external font requests or missing-font errors | Linux Chromium is not Safari/iOS/Android; fallback/device differences need later proof |
| Bilingual / mixed script | Full Arabic RTL and English for every screen type; `bdi dir=ltr` on exact medication, quantity, references, dates/time/zone and observations | Native Egyptian clinical editorial, speech/copy/selection and screen-reader testing remain outstanding |
| Mobile | Real 390×844 viewport captures, full-page exports and 320px reflow checks on all Patient/mobile Doctor task specimens in both languages | Static appearance does not establish native-app task success or gesture behavior |
| Text resizing | 200% computed text-size stress check on each 390px Patient My care language/direction, without increasing the container width | Focused stress check, not full browser/assistive WCAG certification |
| Contrast | CSS-derived role pairs for text/status/action/focus and necessary control borders; thresholds 4.5:1 text and 3:1 controls | Sampled roles, not exhaustive future interaction states; decorative dividers are not necessary control boundaries |
| Keyboard | Actual Tab reaches a read-only field with a visible solid focus outline in each direction/language | Product buttons are inert; no implemented booking/clinical keyboard flow is claimed |
| Loading/error/uncertainty | Seven visibly distinct states per direction/language; text and structure supplement color | No optimistic clinical success or automatic mutation retry |
| Logos | Six new vector constructions; literal 16/24/32px, monochrome, light/dark, app and Arabic-context lockups | Preliminary visual screening; no measured recognition or legal clearance |
| Scope preservation | SHA-256 inventory and byte equality against main and previous visual head | Current deployment health/parity is not re-established by static capture |
| Reproduction | Standard-library Python generator/checker; existing Playwright + Chromium renderer; font sources/licenses retained | No new package dependency or production component is introduced |

Full-page mobile images position navigation in the footer so it does not obscure the scrollable reading artifact. Separate `-viewport.png` files preserve the actual sticky navigation at 390×844. Review presentation boards use those viewport crops; individual full PNGs retain every source and safety explanation.

## Semantic review

Author second-pass check of EN/AR content against accepted foundations:

| Meaning that must not drift | Where it is visible |
| --- | --- |
| Booking grants zero medical authority | Patient appointment helper, booking-review explanation and Doctor selected-visit context |
| Current assignment governs clinical work | Consultation badge and Schedule/mobile visit-review context; role/membership are never presented as grants |
| Private note stays private after signing | Private note heading, author-only explanation and separate signing review action |
| Shared summary is distinct from private notes | Independent signed/shared state, recipient wording, author/time/source |
| Follow-up recommendation is not a booking | Separate recommendation content explicitly says no linked appointment |
| Prescription signing is not stock/readiness/dispensing | Separate signed-source state, pharmacy responsibility and no recorded dispense; quantity is a synthetic display value, not a dose |
| Explicit close does not save/sign/share | Closure review consequence text, with stable patient identity |
| Allergy not reviewed is not a negative finding | Persistent warning beside clinical context |
| Unknown mutation outcome must not cause automatic re-signing | Uncertain-state source-verification action, with no generic mutation retry |
| Unavailable sources disclose no hidden identity/count | Generic unavailable copy; all identifiable patients in Schedule are synthetic permitted examples |
| Future capabilities stay future | No Lab results, integrated full longitudinal history, AI/EACCE, reminders, emergency or production-healthcare claims |

Patient My care, Find care, summary/prescription/history retrieval and Doctor Schedule/People in your care retain accepted IA. Mobile Doctor work is selected-visit review; signing and closure are deliberately directed to the full workspace. State and typography pages are visual-review boards rather than new product destinations.

## Whole-project health checkpoint and review verdict

The accepted project health disposition **B — HEALTHY WITH NON-BLOCKING DEBT** remains the inherited baseline. This review changes isolated visual artifacts and current documentation only; it introduces no observed runtime P0/P1 defect and does not revalidate all deployed services. Accepted architecture, clinical/security/privacy contracts, schema/migrations/OpenAPI, dependencies, CI policy, production frontend and protected V1 evidence remain byte-identical. Stage 1.5 remediation is not newly established as necessary by this scope.

Existing gaps remain: current Live integration coverage, pre-final deployment parity, native Egyptian patient/clinician review, real-device/assistive testing, measured usability/recall and trademark checks. Final Brand V2, Design System, high-fidelity product prototypes and implementation remain separate owner gates. No palette, font, logo, UI treatment, direction or hybrid is selected.

**Independent-review verdict: PENDING.** Author visual/semantic review and deterministic technical checks are documented; they are not represented as an independent designer, native Egyptian clinician or participant study. Product Owner Visual Directions V2 review is the next gate. The quality reaction requested is “I would want to use and show this product”; only the owner can give that disposition. Technical Green never constitutes it.
