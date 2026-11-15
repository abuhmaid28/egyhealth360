# Frontend V2 Package A — Issue 136

Bounded implementation candidate, authorized by [Issue #136](https://github.com/abuhmaid28/egyhealth360/issues/136); [roadmap](https://github.com/abuhmaid28/egyhealth360/issues/135). No merge, deployment, Package B or release approval.

**Current CD07 completeness follow-up:** `9274f2347c16a47c53672ea73f9eca601ce75ada`, app tree `a82bad433855aea7a574b5ff67c1a6f121e55071`,32 actual paths inside the amended50 ceiling. Demo appointment detail now reuses the same existing12h/IANA/DST component as Live; list/review/history/professional24h remain unchanged. Two added Demo320/text200 scans bring the primary matrix to46. Prior805/f725/3cf qualification hashes below are retained historical evidence; this follow-up and the final PR receipt control the eventual final source/CI identity.

## Source and G0 freeze (checkpoint 1/6)

- Sole parent: PR #134 `d268264b1d062c65425a223f8f25d6e72442586e`, tree `92fb45db0c933b7bfe47cc272d953950f10999ac`. Remote Draft/open/unmerged and baseline CI run 43643309450 success verified on 15 November 2026.
- Branch: `feat/136-frontend-v2-package-a`; final stacked Draft must target `integrate/133-bounded-candidates`. No historical code merge/cherry-pick.
- Visual references: #107 Patient date-led card/compact retrieval, Doctor current-source context/local task links. #101 audited Violet × Apricot A roles, licensed on-repo Inter/Plex. #105 Navigation A and Patient appointment-only12h; professional24h retained. #111 aliases are candidate presentation only, not final DS.
- Text wordmark retained: AP05 logo rights remain open. No new assets beyond eight authorized real-browser captures.
- T1: CSS system first paint, explicit System/Light/Dark in memory after mount; no persistence; clear on logout/account switch/reload. LocaleProvider, session, adapters and operation identities remain owners of their existing state.

### Source-to-screen and capability ownership

| Destinations | Production owners | Capability / boundary |
| --- | --- | --- |
| `/patient` | PatientMyCare, own profile/bookings, released readers | Own-source Live and explicitly separate synthetic Demo; no private/draft counts |
| `/patient/discover`, `/patient/doctors/:id`, `/patient/clinics/:id` | PatientScreen, availability | Existing public directory/finite availability; booking gives no clinical authority |
| `/patient/appointments`, `/patient/appointments/:id` | PatientScreen, LiveBookingList/Detail | Existing booking review/change/cancel/history; exact IANA/DST and appointment-only12h |
| `/patient/summaries`, `/patient/follow-up`, `/patient/history`, `/patient/record` | Existing documentation/follow-up and bounded source readers | Only existing released/own scopes; record is Demo where unsupported Live |
| `/patient/settings`, Demo medications/laboratory | Existing PatientScreen | Existing settings and explicit unsupported/Demo truth; no new Live prescription/lab |
| `/doctor`, `/doctor/schedule`, `/doctor/appointments/:id` | DoctorScreen, LiveBookingList/Detail | Minimum schedule logistics; no clinical grant inferred |
| `/doctor/consultation/:id`, `/doctor/consultation/:id/documentation` | Opening, LiveDocumentationWorkspace, consultation presentation | Exact current assignment/source; stable editor; independent sign/release/follow-up/close |
| `/doctor/availability`, `/doctor/summaries`, `/doctor/settings` | Existing availability/released readers/DoctorScreen | Existing supported functions only; care-relationship management unavailable in interface |

No new API call, clinical command, route, session behavior, automatic retry or Live→Demo fallback. Pending/uncertain outcomes stay with original keys. Backend/Auth/Session/CSRF/Clinical/DB and staff sources are outside this package.

### Exact maximum scope

Only these 50 paths may differ from the sole parent; paths are a ceiling, not a target. Everything outside must remain blob/mode/type identical.

1. `apps/web/app/globals.css`
2. `apps/web/app/layout.tsx`
3. `scripts/support/ui-live-journey-browser.mjs` (Owner-approved path substitution,15 November2026)
4. `apps/web/src/components/ui.tsx`
5. `apps/web/src/components/application.tsx`
6. `apps/web/src/components/portal-shell.tsx`
7. `apps/web/src/components/portal-shell.module.css`
8. `apps/web/src/components/v2/read-context.tsx`
9. `apps/web/src/components/v2/read-context.module.css`
10. `apps/web/src/components/patient-my-care.tsx`
11. `apps/web/src/components/patient-my-care.module.css`
12. `apps/web/src/components/patient.tsx`
13. `apps/web/src/components/availability.tsx`
14. `apps/web/src/components/live-home.tsx`
15. `apps/web/src/components/live-booking.tsx`
16. `apps/web/src/components/doctor.tsx`
17. `apps/web/src/components/clinician-consultation.tsx`
18. `apps/web/src/components/clinician-consultation-presentation.tsx`
19. `apps/web/src/components/clinician-consultation.module.css`
20. `apps/web/src/components/consultation-opening.tsx`
21. `apps/web/src/components/documentation.tsx`
22. `apps/web/src/components/live-documentation.tsx`
23. `apps/web/src/components/follow-up-intents.tsx`
24. `apps/web/src/components/consultation-close.tsx`
25. `apps/web/src/lib/i18n/context.tsx`
26. `apps/web/src/lib/i18n/ar.ts`
27. `apps/web/src/lib/i18n/catalog.ts`
28. `apps/web/src/lib/presentation.ts`
29. `scripts/test-ui-browser.mjs`
30. `tests/ui-v2-read-surfaces.test.mjs`
31. `tests/ui-locale.test.mjs`
32. `tests/ui-critical-booking-copy.test.mjs`
33. `tests/ui-patient-booking-time.test.mjs`
34. `docs/CURRENT_STATUS.md`
35. `docs/SOURCE_OF_TRUTH.md`
36. `docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md`
37. `apps/web/src/components/v2/frontend-v2-theme.tsx`
38. `apps/web/src/components/v2/frontend-v2-tokens.css`
39. `apps/web/src/components/v2/patient-doctor-layout.module.css`
40. `scripts/support/ui-v2-patient-doctor-browser.mjs`
41. `tests/ui-v2-visual-integration.test.mjs`
42. `docs/frontend-v2-slices/FRONTEND_V2_PACKAGE_A.md`
43. `docs/frontend-v2-slices/evidence/a-patient-ar-light-390.png`
44. `docs/frontend-v2-slices/evidence/a-patient-ar-dark-390.png`
45. `docs/frontend-v2-slices/evidence/a-patient-en-light-1440.png`
46. `docs/frontend-v2-slices/evidence/a-patient-en-dark-1440.png`
47. `docs/frontend-v2-slices/evidence/a-doctor-ar-light-390.png`
48. `docs/frontend-v2-slices/evidence/a-doctor-ar-dark-390.png`
49. `docs/frontend-v2-slices/evidence/a-doctor-en-light-1440.png`
50. `docs/frontend-v2-slices/evidence/a-doctor-en-dark-1440.png`

### Verified reference heads

- `origin/reference-107`: `56f4f700aa83297c9f5c164a5304135303137f75`
- `origin/reference-101`: `687f94074c0ac4d45610546517ea6aa228d36183`
- `origin/reference-105`: `82fbbe9fef28a6407947852d47473ea35cd057a8`
- `origin/reference-111`: `84e39a14a888686307562a5df383d2a475bfcd2f`

## Checkpoints, final source and handoff

| Checkpoint | Qualified result |
| --- | --- |
|1/6 Source/G0|7695dc8 pins exact #134 parent, selected visual sources, capability ownership and maximum allowance.|
|2/6 Shared foundation/T1|e2329ea introduces scoped audited Light/Dark pairs, Navigation A family, licensed Inter/Plex, focus and memory-only T1. Later startup fixes cover all neutral planes.|
|3/6 Patient|723fccc date-led My Care plus existing supported destinations; final9274f23 also aligns Demo detail with the same existing scoped12h renderer.|
|4/6 Doctor|abbe1bf source context before sustained editor, ordinary local task links, existing independent commands;7ce3e06 preserves measured anchor clearance.|
|5/6 Local/browser/evidence|Final source9274f23: build/types/lint,248 UI units, complete controlled suite,46 scans,8 primary axe scans,8 held-auth cases,2 noJS palettes and8 actual PNGs PASS.|
|6/6 Independent reviews/Draft/CI|Independent source verdicts bounded PASS. One stacked Draft #148; exact final-head/manual FULL CI and proposed-merge proof are maintained in its delivery receipt after execution. No release or next-package authorization.|

Qualified final production/test source: `9274f2347c16a47c53672ea73f9eca601ce75ada`; exact `apps/web` tree `a82bad433855aea7a574b5ff67c1a6f121e55071`. The eventual receipt-only commit must preserve all qualified app/script/test bytes and the8 approved PNG hashes. Final PR head/run/jobs/checkout and merge-tree proof belong in the PR/Issue136 receipt because this commit cannot self-reference its eventual SHA or later CI result.

Resume from the existing `feat/136-frontend-v2-package-a` branch and single [Draft #148](https://github.com/abuhmaid28/egyhealth360/pull/148); inspect its current head/CI first. Do not restart, reset/rebase, import parallel candidates, repeat completed work, or rerun successful FULL CI without a new source/failure reason. Raw evidence lives under `/tmp/eh136-*` and the outside-Git downloadable review bundle.

## Actual implementation and preserved ownership

Scoped tokens reuse #101's exact Violet × Apricot pairs and existing licensed Inter variable/Plex Arabic Regular/Semibold files and notices. No new font/logo/icon artwork or dependency. Neutral textual wordmark with a decorative Apricot underline avoids AP05 artwork assumptions. Staff/Admin/Lab mounted portals retain their original shell treatment; no Package B code is imported.

Patient My Care is date-led, with complete recorded doctor identity, localized named date,12h appointment clock, actual zone/fold offset and one detail CTA, followed by compact explicit retrieval. Existing discovery/provider/clinic/finite availability, booking review/detail/change/cancel/history, own released summaries/follow-up/bounded history/settings get the same presentation foundation. Demo appointment detail reuses existing `BookingTime` with `patientDetail`; Live detail was already scoped12h. List/review/professional/consequential24h defaults remain unchanged. No display label is parsed back into a command.

Doctor schedule/availability/opening/released/settings share the foundation. Consultation retains exact patient/visit/current-source context, source disclosure before the editor in DOM and ordinary Documentation / Follow-up / Review & Close hash links with native focus/Back. Editors remain mounted and preserve their values. Private signing, summary/follow-up release, history/privacy and irreversible close remain original separate commands; no new clinical authority or inferred completion.

T1 is layout-owned React memory: CSS System first paint, account-disclosure System/Light/Dark override, clear on logout/account/mode/reload and existing capability-epoch/session-expiry notifications. No theme localStorage/sessionStorage/cookie/account/server preference, identity-indexed preference, API call or new session contract. Neutral locale/noJS/generic/professional restoring shells, outer canvas, message and wordmark honor System without changing F04 markup or locale startup ordering. Theme/locale/task navigation never keys or remounts a command owner or retries a command.

Unsupported Live prescription/lab/relationship-management capabilities remain honestly unavailable or separately labelled synthetic Demo. No new API requests, backend features, clinical text translation/inference, hidden draft/private counts, wrong-patient source references or Live→Demo fallback.

## Actual qualification

Pinned Node24.21.0/pnpm10.34.6, Next16.4.1/React19.3.0, Playwright1.64.1; genuine Chromium154.0.8037.57, DPR1, reduced motion, viewport height1000. Frozen manifests/lockfile unchanged. Local axe-core4.11.0 was installed outside Git via optional `UI_V2_AXE_PATH`; CI keeps always-on contrast/reflow/keyboard/AX checks without adding a dependency.

| Gate | Actual result |
| --- | --- |
|Frontend lint/build/types|Existing pinned frontend ESLint, web/UI build/typecheck PASS.|
|UI units|248/248 PASS:245 inherited tests retained +3 new integration tests; no journey/privacy assertion or threshold removed. Historical source digests reconstruct only authorized presentation additions and still compare original hashes.|
|Full controlled suite|PASS at9274f23 through the final Golden Demo/role/privacy/reload/23-route/no-browser-exception assertion, including F03/F04, time/DST/history, booking, opening, documentation, follow-up and measured-offset Review & Close.|
|Primary browser matrix|46 scans:44 Patient/Doctor ×AR/EN ×Light/Dark ×320/390/768/1024/1440 +320/text200 cases, plus2 Demo-detail320/text200 scans. Explicit override against opposing System, Next/Back/reload/account/logout, original uncertain-operation/editor identity PASS.|
|First paint|Actual2 noJS System palettes and8 AR/EN ×Light/Dark ×generic/professional held-auth cases: body/shell/message/wordmark correct,0 task controls, no canary/theme persistence or personalized SSR. Original held-JS/hydration/locale tests retained.|
|Accessibility|8 primary axe WCAG2A/AA/2.1A/AA scans0 violations; actual text/control contrast, skip/hash/account/dialog keyboard/focus and CDP AX. Original independent reviewer adds20 zero-violation axe probes; fresh reviewer verifies final source/offset/startup/editor and320/text200. No physical AT/device certification.|
|Demo detail follow-up|Independent AR/EN ×normal/Cairo fold/cross-midnight6 actual cases PASS: both periods, actual IANA offsets/dates/bidi/order,0APIcalls/errors. Existing9 time-format units PASS;320/text200 title remains52px with document width320 and no clipping/shrinking; time contrast>=7.837.|
|Policy/docs/scope|30 existing policy tests, Markdown classification/local-reference and whitespace/scope checks PASS; final receipt checks repeated before commit.|
|Security/clinical/privacy|Independent76 focused units and EN/AR real-browser synthetic probes: exactly one deliberately503 uncertain original body/key survives theme/locale/hash/Back; controlled401 removes private DOM/AX and clears T1. No automatic writes/retries/fallback or new authority.|

Final raw qualification: `/tmp/eh136-demo12-full.log`, `/tmp/eh136-demo12-full/package-a-browser-receipt.json`, `/tmp/eh136-units-final.log`. This is local synthetic transport/presentation evidence, not hosted or backend persistence acceptance. Existing disposable PostgreSQL/Docker writes in final FULL CI are separate from local browser probes.

Routine actual findings corrected within scope: Dark legacy pairs, Arabic font cascade, EN320/text200 state/title overflow, inherited wide header geometry, all neutral startup planes, measured compact anchor clearance, approved-font assertion and consistent Demo detail12h. Intermediate failed/superseded logs remain outside Git; only qualified final runs establish PASS.

## Owner amendments and exact scope

The Product Owner explicitly accepted existing manual exact-head CI: «وافق على manual exact-head CI بالـworkflow الحالي». The unchanged workflow triggers pull-request CI only for main while this Draft targets `integrate/133-bounded-candidates`; therefore manual FULL on the frozen final head plus proposed-merge tree equality replaces automatic PR CI. Do not edit workflow triggers, invent skipped lanes or reuse #134's prior result.

The Product Owner also explicitly approved: «وافق على تبديل المسار وفحص Inter الأقوى». The unused `apps/web/app/loading.tsx` allowance is replaced by `scripts/support/ui-live-journey-browser.mjs`; the exact ceiling remains50. The stale English Manrope-download expectation contradicted the approved Inter direction. The patch changes only that expected font to Inter and adds actual CDP glyph-backed Inter/Plex verification. Reversing precisely that expectation and added block reconstructs the old helper byte-for-byte, preserving every journey/privacy/recovery/target-size assertion. No unused font is loaded merely to satisfy a stale expectation; no test/threshold is weakened.

Actual final inventory:32 paths,18 modified/14 added,0 deleted. All1,435 baseline paths remain;1,417 unmodified baseline mode/type/blob records are identical. No Backend/Auth/Session/CSRF/Clinical/DB/OpenAPI/dependency/workflow/policy/protected-artwork edit. Exact final tree and inventory are in the delivery receipt.

```text
apps/web/app/layout.tsx
apps/web/src/components/application.tsx
apps/web/src/components/clinician-consultation-presentation.tsx
apps/web/src/components/consultation-close.tsx
apps/web/src/components/doctor.tsx
apps/web/src/components/documentation.tsx
apps/web/src/components/follow-up-intents.tsx
apps/web/src/components/live-documentation.tsx
apps/web/src/components/patient-my-care.module.css
apps/web/src/components/patient-my-care.tsx
apps/web/src/components/patient.tsx
apps/web/src/components/portal-shell.tsx
apps/web/src/components/v2/frontend-v2-theme.tsx
apps/web/src/components/v2/frontend-v2-tokens.css
apps/web/src/components/v2/patient-doctor-layout.module.css
docs/CURRENT_STATUS.md
docs/SOURCE_OF_TRUTH.md
docs/frontend-v2-slices/FRONTEND_V2_PACKAGE_A.md
docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md
docs/frontend-v2-slices/evidence/a-doctor-ar-dark-390.png
docs/frontend-v2-slices/evidence/a-doctor-ar-light-390.png
docs/frontend-v2-slices/evidence/a-doctor-en-dark-1440.png
docs/frontend-v2-slices/evidence/a-doctor-en-light-1440.png
docs/frontend-v2-slices/evidence/a-patient-ar-dark-390.png
docs/frontend-v2-slices/evidence/a-patient-ar-light-390.png
docs/frontend-v2-slices/evidence/a-patient-en-dark-1440.png
docs/frontend-v2-slices/evidence/a-patient-en-light-1440.png
scripts/support/ui-live-journey-browser.mjs
scripts/support/ui-v2-patient-doctor-browser.mjs
scripts/test-ui-browser.mjs
tests/ui-v2-read-surfaces.test.mjs
tests/ui-v2-visual-integration.test.mjs
```

## Genuine browser captures and comparisons

All8 PNGs are actual browser full-page captures on final9274f23, not generated/edited images or copied prototype artwork. Patient uses existing `myCareDemoState()` in isolated Demo contexts. Doctor uses existing `clinicianMasterPage()` controlled GET fixtures through the production Live adapter: its Live indicator describes adapter mode, not a hosted/DB session. Capture precedes deliberate uncertain-write probes. No real patient data.

#107 is a hierarchy/character reference, not pixel parity: fixtures and rich current editors differ. Approved bounded differences include neutral text wordmark, actual recorded names, honest unsupported capability labels, richer existing documentation and explicit mode/theme controls. Other representative scans and before images stay outside Git.

| Final image | Viewport / locale / theme | SHA-256 |
| --- | --- | --- |
| [a-patient-ar-light-390.png](evidence/a-patient-ar-light-390.png) |390×1000 / ar / light| `3134ba58607ea3feb400f79d2475c67b7d799b4b10b678e28a5842dcc4c009a9` |
| [a-patient-ar-dark-390.png](evidence/a-patient-ar-dark-390.png) |390×1000 / ar / dark| `4a163a76fc9bd3c79bb71ed994341a2aef66c4cf0e2a1be0ef8f5d074b6bee98` |
| [a-doctor-ar-light-390.png](evidence/a-doctor-ar-light-390.png) |390×1000 / ar / light| `723550d91e7f974e2b74f1080ff1e67ac246fb5f7a441e0ed643bd7d4af72f12` |
| [a-doctor-ar-dark-390.png](evidence/a-doctor-ar-dark-390.png) |390×1000 / ar / dark| `53347b5bc9c50e688f4429d3445dcd1e6372a5f1a8db2cfbd6f7fc138ba6d273` |
| [a-patient-en-light-1440.png](evidence/a-patient-en-light-1440.png) |1440×1000 / en / light| `15f13d3314e0b0cf6b04a238d4ae9ffd0d0adab4115445d92977c1d0d52e9b29` |
| [a-patient-en-dark-1440.png](evidence/a-patient-en-dark-1440.png) |1440×1000 / en / dark| `001e60c8a7a88a52522d773f85b8d3378a5bde678cd7933821275ed1328b616d` |
| [a-doctor-en-light-1440.png](evidence/a-doctor-en-light-1440.png) |1440×1000 / en / light| `4c9f0e2054a4e80d40a959da72cec9c4477a86263b053adaaaea6cf69edf11b8` |
| [a-doctor-en-dark-1440.png](evidence/a-doctor-en-dark-1440.png) |1440×1000 / en / dark| `14dc4ca4efd0e53a7c0859d47d3eb09505f9a0a96abc20c515217bb816885f68` |

Matched before build is exact #134 `d268264b1d062c65425a223f8f25d6e72442586e`, its own detached checkout/build with same pinned toolchain, existing fixtures/viewports, DPR1/fullPage and original Light-only behavior. No reference runtime code was imported. An initial symlink-root build attempt failed; isolated frozen install/build succeeded before these captures.

| Before image (outside Git) | SHA-256 |
| --- | --- |
| `before-patient-ar-390.png` | `ee702ec2042a2f64e9789515acbf3954546c0e194e64755b2c44b282da9cde54` |
| `before-doctor-ar-390.png` | `3e0b1f854a0cd0fc2e16574be4637da249a48e4a260657f16cda40f7f7ac218f` |
| `before-patient-en-1440.png` | `34fd69061862ee431de553ef87bd2bac4893bd5c3314db203426eaf46bf56fe4` |
| `before-doctor-en-1440.png` | `25359390a8a7f2a85400fd97cc5c11d70159b259919deb80dd0e94ec5771d379` |

## Independent review verdicts

Two distinct independent agent reviews, not human GitHub/clinical/release certification:

- `/root/frontend_final_receipt_review`: bounded PASS at9274f23. Rechecked actual final source, #107 comparison and PNG identity, noJS/held-auth full canvas, source/offset/focus/editor, normal/fold/midnight Demo12h,320/text200 and approved rendered-font helper. Original `/root/frontend_review` broad evidence includes all8 visually inspected PNGs and20 axe probes. Optional P3: duplicated desktop source-disclosure heading; no blocking finding.
- `/root/security_review`: bounded PASS on Demo display wiring; exact reconstruction proves no Live route, command/state/authority/professional-time drift. Existing76-unit and EN/AR401/uncertain-command evidence remains applicable; subsequent heading change is CSS-only. Final delivery-head preservation is rechecked against qualified9274f23.

Raw independent receipts: `/tmp/eh136-final-frontend-receipt.json`, `/tmp/eh136-final-frontend-demo12.json`, `/tmp/eh136-independent-frontend-final-startup.json`, `/tmp/eh136-independent-frontend-narrow-review.json`, `/tmp/eh136-security-review.json`. The qualified805 receipt is separately archived as `/tmp/eh136-frontend-qualified-805.json` with hash `afb1336676a40d3fb4df5962dcd9216a53de900d7fce0ff849a360eb845b4697`; it is historical qualification, not the latest delivery hash. Current final-review hashes belong in the PR receipt to avoid self-referencing a later head.

## Parallel candidates, publication and final CI

These independent Drafts have zero changed-path intersection with both32 actual Package A paths and the amended50 ceiling. No edits/imports/merges/rebases/cherry-picks/pushes to their branches; do not wait for or integrate them here.

| Draft | Observed exact head | Paths | Intersection |
| --- | --- | --- | --- |
| [#139](https://github.com/abuhmaid28/egyhealth360/pull/139) | `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` |18|0|
| [#141](https://github.com/abuhmaid28/egyhealth360/pull/141) | `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` |3|0|
| [#147](https://github.com/abuhmaid28/egyhealth360/pull/147) | `2724a20e216ed893cba3cdf7bc866c6695dd66a8` |2|0|

Read-only prepublication Vercel Git context reports only unrelated `simple-ecommerce` Git linkage and no Origin connection in the available Hobby team; no EgyHealth Git linkage. Workflow has no deployment job. GitHub hook-list read returned403 under integration permission; no hook configuration is claimed inspected/changed. No Vercel setting/service/preview/deployment/domain action. Initial push reported0 GitHub deployment records for its head; final source publication is rechecked.

Earlier CI [43681806496](https://github.com/abuhmaid28/egyhealth360/actions/runs/43681806496) on3cfceb1 was explicitly cancelled/superseded when the final Demo-detail completeness gap was found; it is not final-head Green evidence. Keep the same [Draft #148](https://github.com/abuhmaid28/egyhealth360/pull/148), update only this issue branch with the qualified correction, and run the existing manual FULL workflow on the new frozen final head. Verify every selected job including validate, actual checkout head, and GitHub proposed merge parents/tree equality. Final head/run/jobs/checkout/review hashes and Issue136 receipt are maintained in that PR after execution; do not infer them in advance.

## Remaining gates and rollback

G0 is frozen for this bounded candidate only. Product Owner visual acceptance, Final DS, AP03 actual devices/AT, AP05 creator artwork rights, global F03 beyond accepted booking-create, F02/U03 hosted source/DB/identity parity, F06/E2/whole-project release and separately authorized combined A+B/C/S0 integration remain open. Lab backend/Live features, native participant/editorial review, print/PWA and physical accessibility are not claimed. No merge/Ready/auto-merge/deployment/F06/E2/E3 or release approval.

Rollback is a coherent source/build return to exact #134 only at a quiescent boundary after original pending/uncertain operations are reconciled. Never wipe keys/session/history, retry a clinical command automatically or treat main as a verified healthy Live fallback. No DB rollback is required by this frontend-only diff. No rollback or release is performed. Stop after the completed Draft/CI/receipt delivery for Owner review.
