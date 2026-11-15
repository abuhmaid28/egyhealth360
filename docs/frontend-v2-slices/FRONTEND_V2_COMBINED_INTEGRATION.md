# Frontend V2 Combined Integration — Issue135

**Current disposition: bounded LOCAL implementation/validation/reviews PASS; STOP BEFORE be2295f549abcdd3a5141b62d211c06cb5438f5b PUBLICATION.** Available current deployment-trigger metadata is insufficient to establish no automatic deployment. No remote branch push, new Draft PR, merge, Ready/auto-merge, CI dispatch, preview/deployment, hosted operation or clinical Live acceptance.

Authority: [Owner GO](https://github.com/abuhmaid28/egyhealth360/issues/135#issuecomment-6900321063), [exact plan](https://github.com/abuhmaid28/egyhealth360/issues/135#issuecomment-6899895854), [original C adversarial findings](https://github.com/abuhmaid28/egyhealth360/issues/144#issuecomment-6899792774), [resolved scope blocker/proposal](https://github.com/abuhmaid28/egyhealth360/issues/135#issuecomment-6900726065) and [Owner-approved permission substitution](https://github.com/abuhmaid28/egyhealth360/issues/135#issuecomment-6900745939).

## Source, ownership and six checkpoints

Sole baseline #134 `d268264b1d062c65425a223f8f25d6e72442586e`. Isolated worktree `/workspace/egyhealth360-integration-135`, branch `integrate/135-v2-candidates`; intended future single Draft target `integrate/133-bounded-candidates`. No historical branch merges/cherry-picks, resets or main restart. Original #134/#148/#139/#147/#141 branches/worktrees remain unchanged and Draft/Open/Unmerged at exact authorized pins; fresh GitHub reads repeated before sealing this receipt.

| Candidate | Exact pinned source | Scope |
| --- | --- | --- |
| #148 A | `f3c555220247829468c239c0ad84a94038300f76` |32 paths,Patient/Doctor/T1|
| #139 B | `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` |18 paths,staff Demo/unavailable/FUTURE|
| #147 S0 | `2724a20e216ed893cba3cdf7bc866c6695dd66a8` |2 paths,inactive GET contract/tests|
| #141 C | `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` |3 paths,standalone tool subsequently remediated offline|

Qualified production/helper/test source: `be2295f549abcdd3a5141b62d211c06cb5438f5b`, with `apps/web` tree `d5ba65a60e9c1c35e1ab3374a08cc9ac70cb80be`, scripts tree `8cd13b92eb4455b5c64f82b490c1531e5bba8730`, tests tree `d46f2bdca00ef0b382aefd337eb08a82dcd96650`. The final receipt-only commit must preserve these qualified trees and17 reference PNGs. Exact final local HEAD/full tree and final-head review extensions belong in the Issue135 delivery and external review bundle; this document cannot self-reference its own future commit SHA.

| Checkpoint | Actual state |
| --- | --- |
|1/6 pinned source/assembly|DONE:55 disjoint snapshots imported by exact path/blob/mode provenance from the four pins onto #134.|
|2/6 canonical T1/shared shell|DONE:all5 roles share A's sole provider/attribute/token/font contract; Patient/Doctor content selectors remain separately scoped.|
|3/6 C security remediation|DONE locally:37/37 offline tests, original16 groups retained/strengthened plus21 additional adversarial/CLI cases; fresh independent bounded C review PASS.|
|4/6 local regression/browser/evidence|DONE:323/323 UI,30 policy,frontend lint/build/types/docs/whitespace; complete controlled suite,A46/B96/Combined66;20 combined captures/20 axe plusA8 axe,0 violations.|
|5/6 independent source/visual/security reviews|DONE bounded local PASS:distinct Frontend/Visual/Accessibility and Security/Clinical/Privacy reviewers plus fresh C adversary; final docs-only head preservation rechecked before handoff.|
|6/6 safe publication/Draft/exact-head FULL CI|BLOCKED:current GitHub repository-hook listing403; available Vercel metadata cannot establish full no-deploy condition. No push, PR or CI performed; no tested proposed merge tree exists.|

## Final implementation and preserved capability boundaries

One unchanged A layout-owned `FrontendV2ThemeProvider`: System before hydration; explicit Light over OS Dark and Dark over OS Light; no explicit attribute in System and OS changes followed live. T1 remains memory-only, without localStorage/sessionStorage/cookie/server/DB/account preference or identity-indexed history. Existing mode/account/logout/null restore/capability-epoch owners reset it; no new provider/session/locale contract.

`PortalShell` now provides common shell/theme controls to all five roles. Shared header/footer/navigation/surfaces/fonts follow the canonical `data-frontend-v2-theme`; B's competing `data-theme` palette is removed, with B common roles aliased to A's audited token values. Existing decorative Apricot pair is retained without new clinical status meaning. Patient/Doctor-specific content layout has an explicit guard. Admin navigation now wraps at320/text200 with unchanged labels/order/targets; no text shrinking or clipped controls.

The token CSS itself remains byte/mode-exact #148 after the Owner permission swap; its generic data-attribute selectors already support all roles. Existing Inter/Plex binaries/notices and all17 candidate PNGs are unchanged. No new assets/dependencies/routes/config/CI/workflow/auth/session/CSRF/backend/database/clinical/existing API/locale-source edit.

Patient supported My Care/discovery/provider/clinic/availability/booking review/detail/change/cancel/history/released-summary/follow-up/settings remain original source-bound capabilities. Appointment-only12h/IANA/actual fold offset/cross-midnight preserved; professional/consequential/history24h unchanged. F03 Arabic fail-closed critical copy/original uncertain operation/body/key and F04 neutral SSR/startup/storage ordering/noJS/editor lifetime preserved. Doctor source/current assignment, same mounted editor/value/focus, local task Back/hash navigation, measured Review & Close offset, separate private signing/summary/follow-up release/close remain original owners. No command/retry on theme/locale/navigation, no inferred completion or Live→Demo fallback.

Pharmacy keeps original exact-artifact Demo operations and truthful unsupported Live fulfillment. ADMIN has no new membership grant/management/clinical authority; public directory is the original sole permitted Live read. Lab remains FUTURE/CONCEPT/NOT LIVE; inherited synthetic training/browser-local persistence is not T1 memory-only and not hosted results. S0 stays unimported/inactive, strict current source/purpose/decimal-string/history semantics unchanged; history `items:null` fails closed `INVALID_RESPONSE`, never invented `[]`. S1 transport/session/org/stale-read handling and backend discrepancy remediation remain separately gated.

## C closure and honest limits

All corrections stay in the three authorized C files. No actual hosted/public/private/DNS request was made by the tool or its tests.

| Finding | Implemented behavior and evidence |
| --- | --- |
|F1/P1 reporting secrecy|Rejected URL/host/path/port/credentials/query/fragment use fixed sentinels/categories. Accepted fixtures report static OFFLINE_WEB/OFFLINE_API identifiers only. Status must be numeric integer100–599 before processing/classifying; malformed fixture status never reaches JSON/stdout/stderr/terminal. Raw headers/body extras/exceptions/fixture paths/invalid SHA are not reflected; source SHA remains unattested.37-case suite includes actual spawned CLI channel checks.|
|F2/P2 bounded resources|Finite positive exported timeout/maxBytes capped; actual streaming bytes counted before decoding/materializing the next chunk; nonstreaming text fallback rejected. CLI fixture regular-file input is bounded before JSON processing and streams bounded encoded segments. Owned asynchronous fetch/read deadlines reject stalled/late/noncooperative outcomes. Abort precedes asynchronous observed cancellation; cleanup is never an unbounded await. First timeout latches report budget exhaustion, preventing a residual1ms follow-on probe.|
|F3/P2 origin/transport trust|OFFLINE-ONLY:CLI requires a local fixture; exported library requires explicit supplied mock transport and has no default/global fetch path. Only reserved static fixture identifiers allowed, no `egyhealth360-*` ownership inference or self-approval. Arbitrary injected functions are trusted code, not a sandbox or independently proven network-free.|
|F4 redirects|Entire numeric300–399 range rejected before body reader use; abort/cancel,exactly one fixture call,zero follow or Location reflection.|

The prescribed first independent run found a timing-dependent residual-budget second probe (36/37 PASS); root fixed the source latch while retaining the calls===1 regression assertion. Final independent suite37/37,5 extra probe groups and40/40 deadline repeats PASS, with no open P0/P1/contractP2 in the offline scope. A Promise race cannot forcibly terminate synchronous or arbitrary uncooperative injected JavaScript, undo external effects or prove DNS/socket safety; those limits are explicit. Fixture PASS is not a hosted security or clinical release gate. AP05/origin/DNS/source/clinical remain NOT_VERIFIED.

## Actual local qualification and evidence

Pinned Node24.21.0/pnpm10.34.6,frozen lockfile;Next16.4.1/React19.3.0,Playwright1.64.1,Chromium154.0.8037.57,optional axe-core4.11.0 installed outside Git. No dependency/config churn. The full controlled browser runner explicitly used the installed `EH_UI_CHROMIUM=/usr/bin/chromium`; an initial pre-assertion launch without this environment selection lacked managed Playwright binaries and is not qualification evidence.

| Gate | Actual result |
| --- | --- |
|UI units|323/323 PASS =316 retained composed UI cases +7 new cross-package/provenance/shell/no-activation cases.|
|C offline security|37/37 PASS =16 original regression groups adapted/strengthened for the authorized strict offline fixture boundary +21 extra adversarial/CLI/deadline groups; no removed byte/secrecy/redirect assertion or lowered threshold.|
|Policy/docs|30/30 existing policy cases; repository Markdown classification/reference and whitespace checks PASS. Final docs-only checks repeated when sealed.|
|Frontend lint/build/types|Focused frontend plus all changed scripts/tests ESLint,UI/web build and UI/web types PASS.|
|Complete controlled browser suite|PASS through final Golden Demo/role/privacy/reload/23-route/no-browser-exceptions assertion,including F03/F04,availability,booking/opening,documentation/private/release/follow-up/close and original-key recovery.|
|Package A|46 visual/reflow scans,8 actual captures,8 axe scans0 violations,uncertain editor/key lifetime and protected initial paint preserved.|
|Package B|96 visual cases,9 external captures,9 controlled Live negative contexts,original exact-artifact Demo transitions,0 browser errors; now serially invoked by the main browser runner.|
|Combined seams|66 cases:40 all5roles×AR/EN×4 System/opposing-explicit conditions at390;20 role/locale/Light-Dark320 text200;6staff1024. Existing A/B helpers retain768/1440 and A1024.|
|Combined startup/lifecycle|5 reload/account-role/logout/mode/controlled401 groups,10 route noJS cases,10 AR/EN held-auth contexts; no theme storage/cookie,no task controls/private SSR during restore,no clinical writes.|
|Combined accessibility/evidence|20 genuine AR390/EN1440 Light/Dark captures across5roles,20 axe scans0 violations;whole-shell contrast/clipping/44px controls,CDP actual Inter/Plex glyphs,keyboard/native select/focus/Back;true2x text simulation includes `!important` fonts,not physical AT certification.|

Local raw evidence is outside Git under `/tmp/eh135-execution`: `ui-units-amended.log`, `c-adversarial.log`, `full-browser.log`, `policy-tests.log`,lint/build/type/doc logs,qualification/scope/provenance JSON and`final-browser/combined/combined-browser-receipt.json`. The20 combined screenshots below are captured at qualified be2295f549abcdd3a5141b62d211c06cb5438f5b,not generated/edited images or relabeled old references. Doctor uses existing controlled GET Live-adapter fixtures,not a hosted authenticated clinical session; other roles use existing isolated Demo fixtures plus explicit synthetic canaries. Final delivery preserves the same app/helper/test bytes after receipt-only documentation updates.

### Independent bounded verdicts

- `/root/combined_frontend_visual`: BOUNDED_LOCAL_PASS,no P0/P1/contractP2;all20 final hashes match inspected captures,compared against17 preserved candidate images and5 exact #107/#109 prototype exports;independent10 role×locale font/menu/keyboard/skip/theme/settings/Back probes plus8 Doctor source/editor/ReviewClose geometry probes PASS.
- `/root/combined_security_privacy`: PASS_WITHIN_BOUNDED_LOCAL_FRONTEND_SCOPE,no material source findings;235 focused UI/security units +37 C cases PASS,14 own controlled browser groups covering staff limits,uncertain editor/body/key lifetimes,patient private-source DOM/AX/noJS/404 erasure;separate STOP_BEFORE_PUBLICATION verdict.
- `/root/combined_c_adversarial`: PASS_WITHIN_OFFLINE_ONLY_SCOPE,37 prescribed cases +5 additional groups +40 deadline regressions PASS;resolved initial sequencing finding retained. No hosted probes.

These are distinct independent agent reviews,not formal human GitHub reviews,physical-device/AT or WCAG certification. Raw receipts/source hashes/actual executed commands and limits are retained in the external bundle; final delivery-head preservation is checked against qualified be2295f549abcdd3a5141b62d211c06cb5438f5b without rerunning unchanged successful suites.

### Combined capture hashes

All DPR1/fullPage,viewport height1000;captured source be2295f549abcdd3a5141b62d211c06cb5438f5b,synthetic fixtures. Tools/fixture metadata is in the machine receipt. Reference17 PNGs remain their original source evidence,not combined captures.

| Image | Role / locale / appearance / viewport width | SHA256 |
| --- | --- | --- |
| `combined-patient-ar-light-390.png` |PATIENT / ar / light / 390| `69d86b1e8a7682d91db430b878f32ef05b95101400ef757ac20b243a836fab18` |
| `combined-patient-ar-dark-390.png` |PATIENT / ar / dark / 390| `ff262ab71a2bf2f9468f2aaf7f68ad0a8c8b48225a0409805be3707c7731e933` |
| `combined-patient-en-light-1440.png` |PATIENT / en / light / 1440| `d38c0f472c5371d204b4f4ac86a055b8a6a37f5c6d5d0a5cd495c6a11b80739f` |
| `combined-patient-en-dark-1440.png` |PATIENT / en / dark / 1440| `a18fb44f5bf9f25cab662f6d0bf234ebb1696316ba0d055b7b433dfca036b515` |
| `combined-clinician-ar-light-390.png` |CLINICIAN / ar / light / 390| `20448984ccf23f772a6a3aebcce45467f88518d1159d883498f88ffe75bddc75` |
| `combined-clinician-ar-dark-390.png` |CLINICIAN / ar / dark / 390| `3736262f1bdb87ae187a3c3733cd788ca000fcde3bd3acc8331a482c0c5ed29a` |
| `combined-clinician-en-light-1440.png` |CLINICIAN / en / light / 1440| `44d23525f51cc380ef09cc1b4dcac849b87cd5b70d338b240e890008f10097c8` |
| `combined-clinician-en-dark-1440.png` |CLINICIAN / en / dark / 1440| `0f1f3ea1686d4ce7d0b273c6633a7b16f4c7dcba8eb45c971b401d0fd22094fc` |
| `combined-pharmacy_staff-ar-light-390.png` |PHARMACY_STAFF / ar / light / 390| `a11affd1c53136359ef25d8b7415110935b16425762a7dc234a78c28a78c9fff` |
| `combined-pharmacy_staff-ar-dark-390.png` |PHARMACY_STAFF / ar / dark / 390| `49e8bb5718e8d3846038a50f07166a03968dadc95fcb2add539f470c09bd5aa5` |
| `combined-pharmacy_staff-en-light-1440.png` |PHARMACY_STAFF / en / light / 1440| `a7a3f50dc4b592a84a6ec7ee264ccb330de3e17665c48a9b05778ae48e2ae496` |
| `combined-pharmacy_staff-en-dark-1440.png` |PHARMACY_STAFF / en / dark / 1440| `83bc3d9b5e5b68a1318d7674e84752cba621cdea488d1b6426c43ee483077f0f` |
| `combined-admin-ar-light-390.png` |ADMIN / ar / light / 390| `ce62372339716211308c5699e6c1597e6a90a0dab750649fb3a4ca89aa597498` |
| `combined-admin-ar-dark-390.png` |ADMIN / ar / dark / 390| `f5755f45975b8448f03c4c50ee67f6b5f4024e3c93658313dbc9a91f036af2be` |
| `combined-admin-en-light-1440.png` |ADMIN / en / light / 1440| `2eb533268abd5e97fd6d8a94d5436a1f366b278af332c9ae1bf165e30c37f049` |
| `combined-admin-en-dark-1440.png` |ADMIN / en / dark / 1440| `0cc48094fdb945da27f9b013e97c9f2309f993ebd8d3622e3c3bb3ee42dbd08d` |
| `combined-lab_staff-ar-light-390.png` |LAB_STAFF / ar / light / 390| `9e144354fce208a84b883ee5935f8b045289e0d5689633027cab63a2808d7d4d` |
| `combined-lab_staff-ar-dark-390.png` |LAB_STAFF / ar / dark / 390| `49f0c09fc37cd7779c72fe88f4a2126510c0f0f03c8ba5345e09ee614a48fbc9` |
| `combined-lab_staff-en-light-1440.png` |LAB_STAFF / en / light / 1440| `3e0963fba269c8236821b410d2551e151d533be6e131f8a1cbd3ba9b3d73538a` |
| `combined-lab_staff-en-dark-1440.png` |LAB_STAFF / en / dark / 1440| `03e8ec49bb681a544441c9c1370582314025da57151fa6f87623e3d3d1831976` |

## Publication gate — precise unresolved blocker

Fresh read-only current metadata:

- GitHub repository `hooks` listing returns HTTP403 under available integration permission,both initial and final reads. Hook events/destinations cannot be inspected.
- Current Vercel Git deployment context lists only unrelated `simple-ecommerce` Git linkage and no Origin connection in the available Hobby team;no EgyHealth Git link observed in that context.
- All visible EgyHealth projects were separately listed/read, but the available project-detail projection omits Git-link/deploy-hook configuration. Missing fields are not evidence of null/disabled configuration.
- Vercel team outbound webhooks list is empty;this does not establish absence of GitHub ingress hooks or deployment hooks.
- Repository has only unchanged `ci.yml`:main push/main-target PR triggers and manual dispatch,no hosted deployment action. This cannot exclude external repository webhooks.

Accordingly publication safety is **NOT_ESTABLISHED**. The [Owner GO](https://github.com/abuhmaid28/egyhealth360/issues/135#issuecomment-6900321063) explicitly requires STOP before push/Draft if no automatic deployment cannot be established. No permission bypass/config change/test push/public probe was attempted. No remote branch/new Draft PR/exact-head CI/proposed merge tree exists for this combined candidate. Parent candidate CI success is not reused as combined proof.

To resume checkpoint6 only: obtain sufficient current read-only repository webhook/connected deployment trigger visibility or authoritative scoped disposition,then recheck pins/no-deploy condition. Preserve this candidate. Only after condition is satisfied,one safe branch push/stacked Draft and one existing manual FULL CI on frozen finalHEAD,all8 required jobs including validate,classifierFULL,actual checkout and proposed merge parents/tree equivalence. Do not rerun implementation or declare pending CI Green.

## Approved scope amendment and exact inventory

The original fixed shell-source test failed322/323 because its reconstruction strips only A's former three presentation clauses. Owner explicitly approved exchanging edit permissions:token CSS→import-only;`tests/ui-v2-read-surfaces.test.mjs`→narrow editable. Same58 ceiling/14editable/44import-only/17PNGs. Only3 normalization strings plus explanatory comment changed;all original assertions and shell SHA256 `7c4f8f07105d9b1854097938f3dd2ac7dda37cf86eac5bf7fbbc626284817ed8` and CSS-prefix SHA256 `a17947877e71c51799d6d28f9faf1784ca7fe968430f876a0c39d24cff3775da` remain unchanged. Actual full323 run then PASS;proposal preview was not substituted for qualification.

Actual final source inventory58 paths,19 modified baseline/39 added,0deleted;all1435 baseline paths retained,1416 outside candidate changes mode/type/blob-identical. The44 import-only owner blob/modes and17 PNGs are automatically checked by new unit case and standalone full-scope comparison;the narrowly amended test is additionally compared byte-for-byte to the reviewed patch. All other protected sources remain unchanged.

### Exactly14 editable paths

```text
apps/web/src/components/portal-shell.tsx
tests/ui-v2-read-surfaces.test.mjs
apps/web/src/components/v2/patient-doctor-layout.module.css
apps/web/src/components/v2/staff-workspaces.module.css
scripts/support/ui-v2-staff-browser.mjs
scripts/test-ui-browser.mjs
scripts/lib/public-preview-safety.mjs
scripts/verify-public-preview.mjs
tests/public-preview-safety.test.mjs
scripts/support/ui-v2-combined-browser.mjs
tests/ui-v2-combined-integration.test.mjs
docs/CURRENT_STATUS.md
docs/SOURCE_OF_TRUTH.md
docs/frontend-v2-slices/FRONTEND_V2_COMBINED_INTEGRATION.md
```

### Complete58-path ceiling

```text
apps/web/app/layout.tsx
apps/web/src/components/application.tsx
apps/web/src/components/clinician-consultation-presentation.tsx
apps/web/src/components/consultation-close.tsx
apps/web/src/components/doctor.tsx
apps/web/src/components/documentation.tsx
apps/web/src/components/follow-up-intents.tsx
apps/web/src/components/live-documentation.tsx
apps/web/src/components/operations.tsx
apps/web/src/components/patient-my-care.module.css
apps/web/src/components/patient-my-care.tsx
apps/web/src/components/patient.tsx
apps/web/src/components/portal-shell.tsx
apps/web/src/components/v2/admin-workspace.tsx
apps/web/src/components/v2/frontend-v2-theme.tsx
apps/web/src/components/v2/frontend-v2-tokens.css
apps/web/src/components/v2/laboratory-future.tsx
apps/web/src/components/v2/patient-doctor-layout.module.css
apps/web/src/components/v2/pharmacy-workspace.tsx
apps/web/src/components/v2/staff-copy.ts
apps/web/src/components/v2/staff-workspace.tsx
apps/web/src/components/v2/staff-workspaces.module.css
apps/web/src/lib/api/pharmacy-read.ts
docs/CURRENT_STATUS.md
docs/SOURCE_OF_TRUTH.md
docs/frontend-v2-slices/FRONTEND_V2_COMBINED_INTEGRATION.md
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
docs/frontend-v2-slices/evidence/b-admin-ar-dark-390.png
docs/frontend-v2-slices/evidence/b-admin-ar-light-390.png
docs/frontend-v2-slices/evidence/b-admin-en-light-1440.png
docs/frontend-v2-slices/evidence/b-lab-ar-dark-390.png
docs/frontend-v2-slices/evidence/b-lab-ar-light-390.png
docs/frontend-v2-slices/evidence/b-lab-en-light-1440.png
docs/frontend-v2-slices/evidence/b-pharmacy-ar-dark-390.png
docs/frontend-v2-slices/evidence/b-pharmacy-ar-light-390.png
docs/frontend-v2-slices/evidence/b-pharmacy-en-light-1440.png
scripts/lib/public-preview-safety.mjs
scripts/support/ui-live-journey-browser.mjs
scripts/support/ui-v2-combined-browser.mjs
scripts/support/ui-v2-patient-doctor-browser.mjs
scripts/support/ui-v2-staff-browser.mjs
scripts/test-ui-browser.mjs
scripts/verify-public-preview.mjs
tests/public-preview-safety.test.mjs
tests/ui-pharmacy-read.test.mjs
tests/ui-v2-combined-integration.test.mjs
tests/ui-v2-read-surfaces.test.mjs
tests/ui-v2-staff.test.mjs
tests/ui-v2-visual-integration.test.mjs
```

### Pinned import provenance

Original source blob/mode below records ownership for all55 imported snapshots. All44 marked import-only still exactly match;editable entries may differ only within authorized reconciliation. Three new paths have no imported owner and appear in the ceiling above. Final per-file blobs/modes and14 editable diffs are in the external delivery manifest/bundle.

| Path | Owner | Exact pin | Original Git blob | Mode | Permission |
| --- | --- | --- | --- | --- | --- |
| `apps/web/app/layout.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `cf11c161291dc48d00a0ea2c5d3336bc2f4bfa63` | `100644` |import-only|
| `apps/web/src/components/application.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `97f31c86733e0d49c0df42ca53f037232f17ae62` | `100644` |import-only|
| `apps/web/src/components/clinician-consultation-presentation.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `34c8c5b26f678593c92ca77b32c412558eb1f7be` | `100644` |import-only|
| `apps/web/src/components/consultation-close.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `49939ccc881bc19db0c458a931bfaa01d9e95591` | `100644` |import-only|
| `apps/web/src/components/doctor.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `e8303427ff22725e7cca6a6196b866970f0913b7` | `100644` |import-only|
| `apps/web/src/components/documentation.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `21d7810f3c98a9bf7ccb552e9e2114674060e238` | `100644` |import-only|
| `apps/web/src/components/follow-up-intents.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `3284ac58a5969150c77cccc6b94a4571084606b2` | `100644` |import-only|
| `apps/web/src/components/live-documentation.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `89a7f3e5e4d8a2e1caaa1765d922dd810acce333` | `100644` |import-only|
| `apps/web/src/components/operations.tsx` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `1ae5a4e71f8e0e1e9580fc7cfdef5731599572bd` | `100644` |import-only|
| `apps/web/src/components/patient-my-care.module.css` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `2dda0dd42dcd968e0dcb41291d9f9a55728e604c` | `100644` |import-only|
| `apps/web/src/components/patient-my-care.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `4976aa08959797b7b241372756f1a9fae84ca2e1` | `100644` |import-only|
| `apps/web/src/components/patient.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `cdfb5bd6bdf717bbf90765626397e328751bad1b` | `100644` |import-only|
| `apps/web/src/components/portal-shell.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `a285520b6cd26eb312692fba6eff7aa221862014` | `100644` |editable|
| `apps/web/src/components/v2/admin-workspace.tsx` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `620322133e2fdedf6f5242c44e1eea0ecd5e6dd2` | `100644` |import-only|
| `apps/web/src/components/v2/frontend-v2-theme.tsx` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `4b8228b773d3594cf1b2463eb501a2ee860cd3c2` | `100644` |import-only|
| `apps/web/src/components/v2/frontend-v2-tokens.css` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `f0f6ea6b778d48216d5cb98a7de3442340b74936` | `100644` |import-only|
| `apps/web/src/components/v2/laboratory-future.tsx` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `ac90cb2936ed950bf349313f4da07fedb00d33a7` | `100644` |import-only|
| `apps/web/src/components/v2/patient-doctor-layout.module.css` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `fa7d1c53ac1f5c6c57c2c52119c411e9ac1357a8` | `100644` |editable|
| `apps/web/src/components/v2/pharmacy-workspace.tsx` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `c5431ef386542199b705fffe9ec44e53e8812adb` | `100644` |import-only|
| `apps/web/src/components/v2/staff-copy.ts` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `96fd7fc0dfd837be325f59f7afa9b1eeab1ea3fe` | `100644` |import-only|
| `apps/web/src/components/v2/staff-workspace.tsx` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `5956496fb599e7c632cbbc758919e9c746ade44b` | `100644` |import-only|
| `apps/web/src/components/v2/staff-workspaces.module.css` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `6db9097412e5654ebf86cdd9f6ccb4f4a0092824` | `100644` |editable|
| `apps/web/src/lib/api/pharmacy-read.ts` |#147| `2724a20e216ed893cba3cdf7bc866c6695dd66a8` | `c13ec07c276d180695ad25ea16ce09ab2b0733cf` | `100644` |import-only|
| `docs/CURRENT_STATUS.md` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `5660fc222c4f98f4bb8be2410f7f1747465f321a` | `100644` |editable|
| `docs/SOURCE_OF_TRUTH.md` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `8451d75ba580483fd4082d77d56da407a083d982` | `100644` |editable|
| `docs/frontend-v2-slices/FRONTEND_V2_PACKAGE_A.md` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `deb8c41ce3af042c200c121e52a0414796dee5c0` | `100644` |import-only|
| `docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `50accda85343e274e08e4d3784839f5b7d2fc6dd` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-doctor-ar-dark-390.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `8430e187510a0ad9b7986d1c01783d18ee4571ff` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-doctor-ar-light-390.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `d2724b72f64ecab12d4a2ca933f0386b45151969` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-doctor-en-dark-1440.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `f5c05578978c75ddc69708fc61fea1b3113214e5` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-doctor-en-light-1440.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `9e8d7686332498fe8f31df7960dedbe7138806ca` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-patient-ar-dark-390.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `d53081ff7c71beb62cddb287584de7e08164bc78` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-patient-ar-light-390.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `f844897aa36313c6d50daa4abd2ec4a079d06283` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-patient-en-dark-1440.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `c6b9f0839d6e15ee8669ebb0decb3641001552a3` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/a-patient-en-light-1440.png` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `3331bd26b6f8a0e50acf6494f4c6d26a6b177bb2` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-admin-ar-dark-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `afa0acb733d810bd52074fbe25873eac2c219f00` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-admin-ar-light-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `dd964fa9884a9bad173dbcaa66d1f0b282eedc93` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-admin-en-light-1440.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `4d072d483c26204d0cbfa3bb59f1b93c74dc27fa` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-lab-ar-dark-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `515b6b0c22a0aacc9932937a6f52c3148f62c515` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-lab-ar-light-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `a7011ced309822025d4437f42ad222135b162633` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-lab-en-light-1440.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `04f74e8d818399c450708f5bef5b869e7dd7d5fd` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-pharmacy-ar-dark-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `2c3fc7426ef0d209039c7896d0acff1f2213c9da` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-pharmacy-ar-light-390.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `5845d86b50bb177ed4dbf368ad260ea1951d2ca6` | `100644` |import-only|
| `docs/frontend-v2-slices/evidence/b-pharmacy-en-light-1440.png` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `83e7ca8363db3e7de8003a8ec06be81217200a9f` | `100644` |import-only|
| `scripts/lib/public-preview-safety.mjs` |#141| `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` | `da791264cf7f7792d0a7511fbfadf2a6f827c4a4` | `100644` |editable|
| `scripts/support/ui-live-journey-browser.mjs` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `a63d32c81dd12b16ec62cc4682bfeb9b5d612e6c` | `100644` |import-only|
| `scripts/support/ui-v2-patient-doctor-browser.mjs` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `3b48d89a8891ce59c54e1ddab5a5e39b345edd1d` | `100644` |import-only|
| `scripts/support/ui-v2-staff-browser.mjs` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `20cba7808da7ee27eea2e1cf96d6a62f49ebb02c` | `100644` |editable|
| `scripts/test-ui-browser.mjs` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `2af5f1aea27a14efc247ded2d770be632baa4dea` | `100644` |editable|
| `scripts/verify-public-preview.mjs` |#141| `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` | `b7ed02eba8abc363fdd3684ca62d5a098def7017` | `100644` |editable|
| `tests/public-preview-safety.test.mjs` |#141| `8bf1a928b2bd45d2371fc857789c6141ddb08a4f` | `78c75af0b1f14b4c8bed83dede8977789f5a1bf2` | `100644` |editable|
| `tests/ui-pharmacy-read.test.mjs` |#147| `2724a20e216ed893cba3cdf7bc866c6695dd66a8` | `52d75afcc261ab1b543ab9bb606d6f6aeface4cb` | `100644` |import-only|
| `tests/ui-v2-read-surfaces.test.mjs` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `09df6e8c0e021c9b6d7d4d3ff87c9394264664cf` | `100644` |editable|
| `tests/ui-v2-staff.test.mjs` |#139| `17fa1c9ff51cf980e406e2a5fa79d0bc276728d1` | `a187f8e628ae5d20af7f57d67c5072da67c6a957` | `100644` |import-only|
| `tests/ui-v2-visual-integration.test.mjs` |#148| `f3c555220247829468c239c0ad84a94038300f76` | `dc2d534d3323d5748a3a803746fb207027fb34c5` | `100644` |import-only|

## Rollback, handoff and still-open gates

Rollback is a coherent source/build return to exact #134 at a quiescent boundary after original pending/uncertain operations reconcile. Never wipe keys/session/history,automatically replay a clinical command or treat main/Live→Demo as a verified healthy fallback. No DB/schema/data rollback is required or executed by this frontend/tool-only diff. Inactive S0/C removal is source-only;do not partially swap shell/providers during an uncertain task.

Local commits and the external Git bundle preserve all checkpoints. Another account should verify exact final localHEAD,58/14/44manifest,qualified subtree identity,20 screenshot hashes and publication blocker;resume only the blocked publication gate when sufficient evidence exists. Do not reset/rebase/recreate/cherry-pick over preserved work,repeat completed qualification without changes,create a competing PR or alter source candidates.

F06/E2 #124 remains NO-GO;Run08 exact cause unresolved,no assumed CSRF_EMPTY fix. F02/U03 hosted frontend/API/DB/identity parity,globalF03 beyond accepted booking-create,Final DS,AP03 actual devices/AT,AP05 creator/logo rights,Pharmacy S1/org/transport/history-null discrepancy,Admin Live management,Lab backend and every hosted/clinical/privacy/release gate remain OPEN. No merge,Ready/auto-merge,Vercel/deployment/alias/domain/env/hosting mutation,Live activation,E2/E3 or release approval. Stop at the precise publication blocker;no subsequent sprint is authorized.
