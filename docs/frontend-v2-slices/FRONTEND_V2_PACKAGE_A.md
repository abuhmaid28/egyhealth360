# Frontend V2 Package A — Issue 136

Bounded implementation candidate, authorized by [Issue #136](https://github.com/abuhmaid28/egyhealth360/issues/136); [roadmap](https://github.com/abuhmaid28/egyhealth360/issues/135). No merge, deployment, Package B or release approval.

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

## Checkpoint ledger and resumption

1. Source/G0 freeze complete at `7695dc8`; exact source references,50-path maximum and capability ownership pinned. Baseline later captured from its own detached checkout/build using matched synthetic fixtures.
2. Shared foundation/navigation/T1 implemented at `e2329ea` (later first-paint/focus fixes are recorded below): scoped audited Light/Dark pairs, CSS System first paint, memory-only override, session/account/capability reset without remount. Original source/CSS preservation tests retained. Build/typecheck/focused lint PASS; real Chromium baseline captured outside Git. Full visual QA remains checkpoint5.
3. Patient presentation complete at `723fccc` on existing journeys: date-led single-CTA My Care, supported discovery/provider/clinic/availability, booking review/detail/history/released/follow-up/settings via scoped foundation. Original adapters/data preparation and all Patient12h/DST/privacy assertions preserved;25 focused tests and production build PASS. Responsive/functional matrix follows in checkpoint5.
4. Doctor presentation complete at `abbe1bf` on existing schedule/availability/opening/consultation/documentation/follow-up/close/released/settings. Source context is before the editor in DOM and responsive disclosure; editor and all command-owning children remain mounted. Ordinary task links gain native focusable destinations. All245 inherited UI tests plus3 new integration tests pass; production build/focused lint pass. Full browser matrix remains checkpoint5.
5. Full local QA/screenshots: final runtime source `f725ed051fdf28765a44d2d2ada078194b25cbd8`; full amended local suite PASS at805bb955172777c833705efe7ba34d1b44f38d85;44 scans,8 primary axe scans,2 noJS palettes,8 held-auth cases and8 browser screenshots PASS. Hashes are recorded below.
6. Independent reviews: bounded PASS on the final runtime source, with final docs/evidence preservation recheck. Single stacked Draft and exact-head manual CI/merge-tree receipt are maintained in the delivery PR; no merge/deploy or Package B.

Resume from the branch and latest checkpoint commit, inspect the single Draft PR and its current CI first, and preserve every original assertion. Local raw evidence is under `/tmp/eh136-*`; the downloadable outside-Git review bundle also contains matched before images and machine receipts. Final PR head/CI identities belong in the delivery PR because this source commit cannot self-reference its eventual hash. Do not rerun a successful final full CI without a new failure/source change.


## Final implementation and preserved behavior

The production application reuses its existing catch-all route, adapters, service instances and command owners. No historical design code is merged or cherry-picked. New scoped CSS maps the audited Light/Dark Brand roles into existing components; Staff/Admin/Lab retain their original shell. English uses the existing licensed Inter variable file; Arabic uses the existing IBM Plex Sans Arabic Regular/Semibold files and notices. A neutral textual wordmark with a decorative Apricot underline replaces no artwork and assumes no AP05 rights.

Patient My Care leads with a full localized appointment date, complete recorded doctor name, scoped12h time and one detail action, then compact explicit source retrieval. Discovery/provider/clinic/availability, review/detail/history, released summary/follow-up and settings inherit the same actual foundation. Unsupported Live prescription/lab/relationship-management capabilities remain honestly unavailable or explicitly separate Demo. No new API request or backend capability is invented.

Doctor schedule/availability/opening/released/settings share the professional foundation. The actual consultation keeps its current identity and source context, three ordinary local task links and rich existing documentation. Source context comes before the editor in DOM and becomes a compact native disclosure on narrow screens; the editor remains mounted. Focusable task targets preserve Enter/Back/hash semantics. Private note signing, explicit summary/follow-up release, history/privacy and irreversible Review & Close remain independent original commands. Professional times remain24h; no clinical text is translated or inferred.

T1 is layout-owned React memory, CSS System first paint and an explicit native System/Light/Dark select in the account disclosure. There is no theme localStorage/sessionStorage/cookie/account/server preference, identity-indexed preference or API call. Explicit logout/account/mode entry and existing capability-epoch notifications clear the override; reload starts System. Theme/locale/task navigation never keys or remounts the command-owning subtree, changes a payload/key, or retries a command.

## Validation and genuine browser evidence

Toolchain: Node24.21.0, pnpm10.34.6, Next16.4.1, React19.3.0, Playwright1.64.1; actual Chromium154.0.8037.57, DPR1, reduced motion, viewport height1000. Existing frozen lockfile/dependency manifests unchanged. Local axe-core4.11.0 is test tooling installed outside Git, supplied through `UI_V2_AXE_PATH`; CI retains the always-on browser contrast/reflow/AX assertions without adding a dependency.

| Gate | Actual evidence |
| --- | --- |
| Frontend lint/build/typecheck | Existing pinned commands for `apps/web` and `packages/ui`; PASS on final production code. |
| UI units |248/248 PASS: all245 inherited tests retained plus3 new integration tests. Historical scope digests reconstruct only explicitly authorized presentation additions and still compare original source/prefix hashes; no journey/privacy assertion or threshold removed. |
| Full controlled browser suite | PASS at7ce3e06, then affected F04 +entire Package A matrix PASS atf725ed0. The full f725 repeat exposed only the stale Manrope expectation; the Owner-approved test-only amendment is805bb9, with unchanged runtime tree. Final amended full-suite PASS at805bb955172777c833705efe7ba34d1b44f38d85, including the original Review & Close matrix;0 browser exceptions. Includes F03/F04 startup/critical copy/pending-editor lifetime, real built Patient→booking→detail integration, Live/Demo boundaries, time/DST/history, privacy/denial and all existing controlled opening/documentation/follow-up/close flows. Synthetic HTTP fixtures, not hosted E2. |
| New Package A matrix |44 measured visual/reflow scans: Patient/Doctor ×AR/EN ×Light/Dark ×320/390/768/1024/1440, plus320/text200 with Doctor context expanded. System both media choices, opposing explicit override, Next navigation/Back/reload/account/logout reset, editor DOM/value and original uncertain operation preservation. |
| First paint | Actual JavaScript-disabled System Light/Dark on neutral bilingual F04 shell/body/message and8 held-auth AR/EN ×Light/Dark ×generic/professional restoration cases;0 task controls, no theme attribute/cookie or personalized SSR. Original held-JS/noJS/hydration/locale tests remain. |
| Accessibility |8 primary axe WCAG2A/AA/2.1A/AA scans, actual text/control contrast checks, native keyboard/skip/hash/account/dialog focus, CDP AX checks; independent reviewer adds20 axe probes and expanded context/focus checks. Bounded browser evidence, no physical AT/device certification. |
| Policy/docs/scope |30/30 existing policy tests; Markdown classification/local references and whitespace PASS. Exact final path/blob ledger recorded below. |
| Security/clinical/privacy | Original adapter/command code unchanged. Independent EN/AR probe retains exactly one deliberately503 uncertain original body/key across presentation changes; controlled401 suppresses private DOM/AX and clears T1. No automatic writes/retries/fallback or new authority. |

Routine defects found by actual tests were corrected in scope: Dark legacy colors on navigation/filter/date/map/count/body-copy surfaces; Arabic font cascade; EN320/text200 consultation-state overflow; wide-screen inherited header geometry; neutral first-paint selector specificity; and compact anchor clearance. Inherited assertions/thresholds remain, with one expressly authorized approved-font correction described below. Intermediate failing logs are retained outside Git; only final qualified runs establish PASS.

### Capture method and source attribution

All eight approved PNGs are real browser full-page captures from the built final source. Patient uses the existing `myCareDemoState()` fixture in an isolated Demo browser context; Doctor uses the existing `clinicianMasterPage()` controlled GET fixture through the production Live adapter. The Doctor screen's Live indicator describes adapter mode, not a real hosted/DB session. Captures introduce no clinical write; deliberate uncertain-write probes occur after screenshots. No real patient data, generated image, copied prototype artwork, new fonts or icons.

Reference #107 establishes hierarchy and character, not pixel parity: fixtures and rich current editors differ. Approved differences include the neutral text wordmark, honest unsupported capability labels, actual recorded names, richer current documentation and explicit mode/theme controls. Eight final images and metadata/hashes follow. Other representative scans and four matched baseline screenshots stay outside Git as authorized.

### Matched before evidence

The before build is exact parent `d268264b1d062c65425a223f8f25d6e72442586e`, detached checkout `/tmp/eh136-baseline`, independently built with the same pinned toolchain. It uses the same existing fixtures/viewports, original Light-only behavior, DPR1 and full-page capture. No reference branch runtime is imported. The first attempted shared-node_modules baseline build failed Turbopack's symlink-root check; a proper isolated frozen install/build succeeded before these captures.

| Before image (outside Git) | SHA-256 |
| --- | --- |
| `before-patient-ar-390.png` | `ee702ec2042a2f64e9789515acbf3954546c0e194e64755b2c44b282da9cde54` |
| `before-doctor-ar-390.png` | `3e0b1f854a0cd0fc2e16574be4637da249a48e4a260657f16cda40f7f7ac218f` |
| `before-patient-en-1440.png` | `34fd69061862ee431de553ef87bd2bac4893bd5c3314db203426eaf46bf56fe4` |
| `before-doctor-en-1440.png` | `25359390a8a7f2a85400fd97cc5c11d70159b259919deb80dd0e94ec5771d379` |

## Independent reviews

These are two distinct independent Codex agent reviews, not human GitHub approvals or clinical/release certification.

| Reviewer / scope | Source and actual verdict |
| --- | --- |
| `/root/frontend_final_receipt_review` — final Frontend/Visual/Accessibility (with original `/root/frontend_review` broad review) | Bounded PASS. Inspected all8 actual PNGs and #107, source/preservation, inherited Doctor geometry, keyboard/focus and expanded320/text200 in AR/EN.18 initial independent axe probes had0 violations; the follow-up noJS/focus recheck adds2 more with0. Fresh final review independently rechecks noJS,8 held-auth cases, source/offset/focus/editor and320/text200, the actual approved-font helper and all8 PNG hash identities. Narrow post-review fixes, including final consultation offset and complete noJS/held-auth startup canvas, are independently rechecked atf725ed0; the final amended source805bb9 and artifact preservation are bound in the final PR receipt. Optional P3: desktop source disclosure repeats its internal source heading; no blocking finding. |
| `/root/security_review` — Security/Clinical/Privacy | Bounded PASS at805bb9 (runtime unchanged fromf725ed0);76 focused unit tests and independent EN/AR actual browser lifecycle/401 probes. Same editor DOM/value and original uncertain body/key,0 automatic commands, private DOM/AX suppression and T1 reset. Final runtime tree `497d4be8be414a03459f18c943dce0513abc4462`; no unresolved security/clinical/privacy finding. |

Final independent Frontend receipt: `/tmp/eh136-final-frontend-receipt.json` (SHA-256 `afb1336676a40d3fb4df5962dcd9216a53de900d7fce0ff849a360eb845b4697`). Final Frontend startup receipt: `/tmp/eh136-independent-frontend-final-startup.json`; the final8 PNG hashes exactly match all8 independently visually inspected PNGs in the broad receipt. Independent raw receipts: `/tmp/eh136-independent-frontend-review.json`, `/tmp/eh136-independent-frontend-narrow-review.json`, `/tmp/eh136-security-review.json`, `/tmp/eh136-security-browser.log`; copied into the outside-Git review bundle. Final hashes and final-head recheck are in the single PR receipt.

## Publication and CI provenance

Owner explicitly accepted on15 November2026: «وافق على manual exact-head CI بالـworkflow الحالي». The unchanged `.github/workflows/ci.yml` only triggers pull-request CI for main, whereas this authorized Draft targets `integrate/133-bounded-candidates`. Therefore run the existing workflow once by workflow_dispatch on the frozen final branch head, with all normal FULL lanes, and prove the PR's GitHub merge checkout has the same tree as that tested head. Do not change workflow triggers, invent skips, claim automatic PR CI, or relabel #134's earlier run as new proof.

Read-only publication preflight: repository public; Vercel `get_git_deployment_context` lists only unrelated `simple-ecommerce` Git linkage and no Origin connection in the available Hobby team. No EgyHealth Git deployment linkage was reported; unchanged GitHub workflow contains no deploy job. No Vercel setting, deployment, preview, alias, service or domain action was performed. GitHub repository-hook listing returned403 (integration permission); no hook configuration is claimed inspected or changed. The explicitly requested Vercel Git integration check was available and repeated before publication. Recheck before the single final push/PR if configuration changes.

Exact final base/head, PR URL, workflow run/jobs/conclusions/checkout log and merge-tree equivalence are in the delivery PR body after execution. They must not be inferred from historical baseline CI or this earlier receipt text. Keep Draft/Open/Unmerged and auto-merge off.

## Remaining gates and rollback

G0 is frozen for this bounded candidate only. Product Owner visual acceptance, Final Design System decisions, AP03 real devices/AT, AP05 creator artwork rights, global F03 beyond the accepted booking-create slice, F02/U03 hosted source/DB/identity parity and F06/E2/whole-project release gates remain open. Package B is not included in this candidate; its separate Draft #139 remains unchanged, and combined integration requires separate authorization. Native participant/editorial review, print/PWA/physical accessibility and hosted E2 are not claimed. No backend, database, authentication, session, CSRF, clinical-contract or policy change; no release approval.

Rollback is a coherent source/build reversion to exact #134 at a quiescent boundary after original pending/uncertain operations have been reconciled. Do not wipe storage/session/operation keys, silently retry a clinical command, or treat main as a verified healthy Live fallback. No DB rollback is required by this frontend-only diff. No rollback, merge or deployment is performed here. Stop after delivery for Owner review.


## Parallel-candidate preservation (resumption verification)

The continuation request requires preserving these independent Drafts. Their real changed-file lists have zero intersection with both this candidate's31 actual paths and the entire #13650-path ceiling. No imports, merges, rebases, cherry-picks, pushes or edits to those branches were performed. They are not prerequisites for this delivery; any combined integration remains a separate task.

| Draft | Observed exact head | Changed paths | Intersection with #136 |
| --- | --- | --- | --- |
| [#139](https://github.com/abuhmaid28/egyhealth360/pull/139) | `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` |18|0|
| [#141](https://github.com/abuhmaid28/egyhealth360/pull/141) | `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` |3|0|
| [#147](https://github.com/abuhmaid28/egyhealth360/pull/147) | `2724a20e216ed893cba3cdf7bc866c6695dd66a8` |2|0|

### Actual changed-path inventory

31 total:17 existing paths modified,6 new source/test/docs files and8 authorized browser PNGs. No baseline path deleted. Exact mode/type/blob preservation is verified after final commit; all1,435 baseline paths remain and all1,418 unmodified baseline files are identical.

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
scripts/support/ui-v2-patient-doctor-browser.mjs
scripts/test-ui-browser.mjs
scripts/support/ui-live-journey-browser.mjs
tests/ui-v2-read-surfaces.test.mjs
tests/ui-v2-visual-integration.test.mjs
```

### Final browser captures

Source `f725ed051fdf28765a44d2d2ada078194b25cbd8`; Chromium154.0.8037.57, DPR1, height1000, fullPage, original existing synthetic fixtures, actual explicit theme selection. SHA-256 records verified against the actual final PNG bytes.

| Image | Viewport / locale / theme | SHA-256 |
| --- | --- | --- |
| [a-patient-ar-light-390.png](evidence/a-patient-ar-light-390.png) |390×1000 / ar / light| `3134ba58607ea3feb400f79d2475c67b7d799b4b10b678e28a5842dcc4c009a9` |
| [a-patient-ar-dark-390.png](evidence/a-patient-ar-dark-390.png) |390×1000 / ar / dark| `4a163a76fc9bd3c79bb71ed994341a2aef66c4cf0e2a1be0ef8f5d074b6bee98` |
| [a-doctor-ar-light-390.png](evidence/a-doctor-ar-light-390.png) |390×1000 / ar / light| `723550d91e7f974e2b74f1080ff1e67ac246fb5f7a441e0ed643bd7d4af72f12` |
| [a-doctor-ar-dark-390.png](evidence/a-doctor-ar-dark-390.png) |390×1000 / ar / dark| `53347b5bc9c50e688f4429d3445dcd1e6372a5f1a8db2cfbd6f7fc138ba6d273` |
| [a-patient-en-light-1440.png](evidence/a-patient-en-light-1440.png) |1440×1000 / en / light| `15f13d3314e0b0cf6b04a238d4ae9ffd0d0adab4115445d92977c1d0d52e9b29` |
| [a-patient-en-dark-1440.png](evidence/a-patient-en-dark-1440.png) |1440×1000 / en / dark| `001e60c8a7a88a52522d773f85b8d3378a5bde678cd7933821275ed1328b616d` |
| [a-doctor-en-light-1440.png](evidence/a-doctor-en-light-1440.png) |1440×1000 / en / light| `4c9f0e2054a4e80d40a959da72cec9c4477a86263b053adaaaea6cf69edf11b8` |
| [a-doctor-en-dark-1440.png](evidence/a-doctor-en-dark-1440.png) |1440×1000 / en / dark| `14dc4ca4efd0e53a7c0859d47d3eb09505f9a0a96abc20c515217bb816885f68` |


## Owner scope amendment — approved-font regression check

On15 November2026 the Product Owner explicitly approved: «وافق على تبديل المسار وفحص Inter الأقوى». The unused `apps/web/app/loading.tsx` entry is replaced by `scripts/support/ui-live-journey-browser.mjs`; the maximum allowlist remains exactly50 paths. The old full-suite English font assertion required the unused legacy Manrope to have downloaded, contradicting the approved Inter production direction. The actual f725 full run failed at `testLiveJourney:131` on that expectation; no application behavior, privacy or clinical assertion failed there.

The authorized patch changes only the English font-availability expectation to Inter and adds an actual CDP rendered-heading Inter/Plex check with nonzero glyph counts. Every existing journey/privacy/recovery/target-size assertion stays intact. A standalone preview through the real built app passed EN/AR before applying the patch. No unused legacy font is loaded merely to satisfy a stale assertion, no test is skipped and no threshold is lowered. Final full-suite/CI outcomes below supersede the intermediate failing log. The amendment adds one actual modified test path (31 total candidate paths), not a new asset or dependency.


## Completed local qualification — checkpoint 5/6

Qualified final source/test head: `805bb955172777c833705efe7ba34d1b44f38d85`; production runtime source `f725ed051fdf28765a44d2d2ada078194b25cbd8`, exact `apps/web` tree `497d4be8be414a03459f18c943dce0513abc4462`. The test-only approved-font amendment changes no production byte. The final receipt/evidence commit must preserve that runtime tree, every tested source/helper/unit byte and these8 PNG hashes; remote FULL CI then tests the eventual exact final head.

- Pinned frontend ESLint, web/UI build/typecheck and248 UI units: PASS.
- Complete unchanged-flow controlled browser suite plus approved-font amendment and Package A assertions: PASS on805bb9. It reaches the final Golden Demo/role/privacy/reload/23-route-state/no-browser-exception assertion, including documentation, follow-up and Review & Close. Final log `/tmp/eh136-amended-full.log`; exact-copy machine receipt `/tmp/eh136-amended-full/package-a-browser-receipt.json`.
- Final Package A:44 visual/reflow scans,8 axe scans with0 violations,2 noJS System palettes and8 held-auth canvas cases, explicit override/reload/account/logout resets, original uncertain operation/DOM/value/Back preservation: PASS. No backend/DB/auth clinical probe.
- All8 screenshots recaptured again at805bb9 are byte-identical to the final authorized PNGs and to the independently inspected images; compiled application tree is identical across those captures.
-30 existing policy tests,938 local references/57 Markdown files at qualification, whitespace and amended-scope checks: PASS. Final docs-only checks are repeated before commit.
- Both independent final source reviews: bounded PASS on805bb9; fresh Frontend receipt and prior startup/screenshot/keyboard/axe evidence are retained, as are Security's independent76-unit and EN/AR401/uncertain-command probes. No unresolved in-scope P0/P1/P2. Optional P3 duplicate desktop source heading remains disclosed.

The only remaining execution step is the one stacked Draft, its proposed merge-tree proof and the already authorized unchanged-workflow manual FULL CI on its exact frozen final head, followed by a complete Issue136/PR receipt. No remote run or release result is inferred in advance.
