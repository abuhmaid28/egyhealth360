# Patient My Care V2 integration candidate — Issue #127

**13 November 2026 · UI-only candidate; Product Owner visual review remains required.** [Issue #127](https://github.com/abuhmaid28/egyhealth360/issues/127) and [explicit implementation authorization](https://github.com/abuhmaid28/egyhealth360/issues/127#issuecomment-6853069783) supersede historical planning-only restrictions solely for the listed14paths, controlled validation, two independent reviews, one Draft PR and existing exact-head CI. No final Design System, hosted/Live, accessibility or release acceptance.

## Source and checkpoint identity

- Direct main base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; branch `feat/127-patient-my-care-v2`.
- Qualified R0 reconciliation: `6318af5e94dfafd76d1dc212680d6c186499f2f1` ([qualification](https://github.com/abuhmaid28/egyhealth360/issues/127#issuecomment-6853307340)).
- R1 runtime/browser-evidence source: `3d5c920ca3a9fc14f7587f8296a19fcd3e894d43`. Later receipt-only commits do not change these11 runtime/style/test paths. The final PR and exact-head CI identity are recorded in the PR/issue delivery comment, avoiding a self-referential commit hash here.
- Patient #119 `4270a682ae3973385ca2c4c86f587d1ca9f1ca03` and detail #126 `800b9aded58cce50cbf5fe714484bf733484510a` remain separate unmerged references. No full-branch merge/cherry-pick or Doctor source import.
- Preferred #107 `56f4f700aa83297c9f5c164a5304135303137f75`; Brand #101 `687f94074c0ac4d45610546517ea6aa228d36183`; consolidated #111 `84e39a14a888686307562a5df383d2a475bfcd2f`. These are design references, not implemented runtime inventories.
- CD07 #113 `9ba6ea54a0ca2facd75bc962b953d62a2df75449`, OptionA frontend architecture #117 `eb02e1d76b3e363e88878f679ae1217de2c81bf8`. Preserve Patient overview/detail12h and professional/consequential history24h.

## Exact file inventory and source-hunk ledger

All paths below are relative to the repository root. Nine existing files modified; five new files. No15th file, assets, dependencies or policy changes. Final review budget1264changed text lines; page-coherence runtime/style delta beyond R0 is119added/143deleted lines (well within350new-line allowance).

| Path | Source and final responsibility |
| --- | --- |
| `apps/web/src/components/patient-my-care.tsx` | #119 AppointmentAnchor retained exactly; R1 CareScreen return/composition and local CareIndex only. Resource/projection/scopeStamp preparation and all other declarations remain main-equivalent. |
| `apps/web/src/components/patient-my-care.module.css` | Main prefix preserved; #119 append retained; R1 append explicitly guarded by opted-in root. |
| `apps/web/src/components/portal-shell.tsx` | Minimal optional presentation prop; requires PATIENT+exact `/patient`; scoped skip-focus handler and duplicate navigation removal. Existing readers/account/session handlers untouched. |
| `apps/web/src/components/portal-shell.module.css` | Main4671-character prefix unchanged; guarded Light page presentation only. |
| `apps/web/src/components/v2/read-context.tsx` (new) | Byte-exact #119 neutral display primitive; no state, policy or request dependency. |
| `apps/web/src/components/v2/read-context.module.css` (new) | Byte-exact #119 paired static card treatment; no theme runtime. |
| `apps/web/src/components/live-booking.tsx` | Byte-exact #126 Patient BookingDetails optional endpoint branch; no further redesign. |
| `tests/ui-v2-read-surfaces.test.mjs` (new) | All #119 behavior tests retained; deliberate bounded preservation guards and actual CareIndex/shell render cases. |
| `tests/ui-patient-booking-time.test.mjs` (new) | Byte-exact #126 nine fixed-expectation render/caller-scope tests. |
| `scripts/support/ui-staging-time-browser.mjs` | #126 enhanced helper plus #119 overview12h assertion only; professional block unchanged. |
| `scripts/support/ui-my-care-browser.mjs` | Updated geometry without deleting inherited safety checks; native screenshots, computed fonts/contrast, keyboard/Back, denied rereads and account reload proof. |
| `docs/frontend-v2-slices/PATIENT_MY_CARE_INTEGRATION.md` (new) | This single integration receipt. |
| `docs/CURRENT_STATUS.md` | Add current bounded task/evidence pointer; preserve historical records. |
| `docs/SOURCE_OF_TRUTH.md` | Classify this receipt; preserve accepted/historical source entries. |

### Shared browser-test collision and preservation

Start from #126's complete helper, retain #119's exact `11:30 م` / `11:30 pm` overview-fold expectation. Detail endpoint periods, both dates, IANA zones, actual Cairo fold offsets, chronological order, mobile200%, 401/403/404/503, DOM/AX suppression, GET-only and no-Demo assertions survive. Doctor/context/list/history remain24h; the entire professional helper block is hash-frozen (`8d0664648f994efc0b0d09816bea2d3149b27d3cae513384c59afce16010b5b3`).

The obsolete #119 whole-helper hash is replaced deliberately, not blindly refreshed. Tests freeze non-target Patient declarations, the complete CareScreen pre-return preparation, whole Doctor TSX/CSS and inherited CSS prefixes. Exact reverse-hunk reconstruction of PortalShell hashes back to original main (`7c4f8f07105d9b1854097938f3dd2ac7dda37cf86eac5bf7fbbc626284817ed8`); render cases cover2locales×2modes×5roles×4paths, with explicit opt-in required. Outside the14allowlist, tracked modes/types/blob identities must equal main.

## Resulting behavior and visual boundaries

Exact PATIENT `/patient` only: intro → accepted appointment → compact retrieval → unchanged source-specific RecentCare. Mobile primary MyCare/FindCare navigation stays visible in normal flow; the page's duplicate secondary/fixed navigation is removed. Account, language, mode, skip, logout and collapsed Demo controls remain reachable. Keyboard skip focuses/scrolls main without adding native hash history, avoiding the observed skip→FindCare→Back stale-content sequence; other shells retain native skip behavior.

Existing Inter and IBM Plex Sans Arabic400/600 assets are reused. The scoped Light Violet roles use existing local variable names; no new semantic token system, font/logo asset, global theme, Dark/T1 runtime or semantic badge recolor. Existing wordmark/Icon and accepted artwork references remain separate. Raw recorded names are not translated. The generic follow-up destination remains `/patient/follow-up`; Demo contextual follow-up remains `/patient/record`. Live summaries use `/patient/summaries`; Demo summary uses `/patient/record`. No released-source claim is inferred from a generic retrieval link. Live prescriptions stay unavailable; medications and Laboratory links remain Demo-only. Laboratory/Pharmacy/Admin are not newly integrated Live consoles.

## Actual local verification

Runtime: Node24.21.0, pnpm10.34.6; Playwright1.64.1, system Chromium154.0.8037.57; production Next16.4.1. Synthetic controlled fixtures only, no API/DB service or real session/clinical writes.

| Check | Actual result |
| --- | --- |
| Qualified R0 | 19/19 focused;185/185 allUI; UI+web build/web typecheck; combined time and original MyCare controlled browser helpers PASS. |
| Final focused units | 22/22 PASS, including nine unchanged #126 cases. |
| Final allUI units | 188/188 PASS; zero skipped/cancelled. |
| Frontend lint | Exact existing frontend-check ESLint scope PASS. |
| Build/types | UI+Next production build and UI/web typechecks PASS. |
| Focused MyCare browser | EN/AR, widths1600/1440/1200/1024/834/768/390/320; text200 at320/390/1440, states, controls, keyboard/menu/skip/Back/Forward, actual fonts/contrast PASS. |
| Policy unit checks | 30/30 PASS. |
| Full existing controlled browser suite | PASS, exit0: Golden Demo/23route-state variants, operational portals/mode, combinedtime, availability, MyCare, clinician, RTL, Phase3, Live journey, Slice6, booking, opening, documentation and Close. Controlled/local proof only. |
| Docs/policy/scope | Final receipt/index/reference and exact14-path preservation checks are recorded with final delivery. |

CDP platform-font inspection proves Inter glyph use in English appointment/clock and wordmark; Arabic appointment/clock uses IBM Plex Sans Arabic SemiBold. Computed visible text contrast minimum6.0385:1 in both languages; focused primary outline7.1311:1 and mobile primary border4.7197:1. These are measured local specimens, not a comprehensive WCAG audit. Inherited meaningful state colors were retained.

Controlled Live fixtures prove a valid released summary first, then fresh ordinary rereads with401/403/404/503 hide its released-source claim and suppress private/wrong-patient canaries in DOM and AX while independently permitted appointment logistics remain. Account reload switches actual fixture identity/profile and removes previous account's booking/name/link; expired-session recovery is bounded. Only the eight expected GET paths are used; no Demo storage fallback. These reload/fresh-mount checks do **not** prove realtime revocation, in-place actor replacement, backend authorization, racing network recalls or real sessions. Unchanged adapter/security tests and source-preparation guards complement, not replace, backend evidence.

## Actual visual evidence

Before: qualified R0 `6318af5…`; after: R1 `3d5c920…`. Six matched specimens each: AR390, EN1440, AR1440, EN390, AR320text200 and EN390text200 (long mixed-direction doctor name on enlarged specimens). All12 captures have zero browser errors, zero API requests and no horizontal overflow. Mobile is native full-page; desktop is native viewport, height1000/DPR1/reduced motion. No injected screenshot CSS, overlay hiding, compositing or image generation.

Evidence is preserved **outside Git** in delivery bundle `egyhealth360-127-evidence.zip`: original PNGs, `r0.json`/`r1.json` with full source/input/PNG SHA-256, measured QA JSON and self-contained `comparison.html`. Viewer validation rendered all6pairs. Browser-local file navigation is environment-blocked; the same embedded viewer was verified with browser setContent. The handoff links the downloadable local artifacts; they are not falsely described as GitHub-hosted attachments. GitHub delivery comments retain the provenance/hash manifest. No protected historical screenshot bytes/paths were changed.

Historical asset present at main (not a fresh main rendering): [AR390](https://github.com/abuhmaid28/egyhealth360/blob/5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3/docs/ui-screenshots/doctor-demo/patient-dashboard-ar-390.png). Selected refined #107 reference: [AR mobile Light](https://github.com/abuhmaid28/egyhealth360/blob/56f4f700aa83297c9f5c164a5304135303137f75/docs/design-system-v2/high-fidelity-pilot/evidence/refinement/patient-ar-light-390.png). Retained earlier #107 prototype evidence (not a newly rendered refined desktop): [EN desktop Light](https://github.com/abuhmaid28/egyhealth360/blob/56f4f700aa83297c9f5c164a5304135303137f75/docs/design-system-v2/high-fidelity-pilot/evidence/patient-en-light-1440.png). [#126 historical receipt](https://github.com/abuhmaid28/egyhealth360/blob/800b9aded58cce50cbf5fe714484bf733484510a/docs/frontend-v2-slices/PATIENT_BOOKING_DETAIL_CD07.md) remains at its own source; it is not copied or claimed as new evidence.

## Independent review and CI boundary

Separate `frontend_review` (Architecture/UX) and `safety_review` (Security/Clinical/Privacy) independently reviewed runtime `3d5c920…`: both PASS, no bounded-slice blocker. Each independently reran22focused cases; Frontend exercised actual skip/Back/Forward/default-route/44px/fonts, Security reran MyCare+combinedtime browser proofs and source invariants. Security corrected the account fixture before this checkpoint. Independent final14-path/CI confirmation belongs in the PR/Issue127 delivery comment. Technical Green does not grant Product Owner visual approval.

Frontend visual limit: AR390 standard Demo full-page height1810px versus R0 1606px; claim reduced duplicate navigation/no overlay, **not shorter reading depth**. Long mixed names at320/text200 remain tall and can wrap within words under the accepted card rules; names stay complete without horizontal overflow. This is a nonblocking owner visual-review tradeoff, not native zoom or assistive-technology proof.

The unchanged policy for14known FRONTEND+DOCS paths selects classify/docs-check/frontend-check/validate; backend-check/postgres/docker-runtime/dependency-audit should be explicit policy skips. Only actual remote results at the final PR head count. No manual full-regression labels or dispatch, F06/E2/E3/Docker acceptance, merge, ready transition, auto-merge or deployment.

## Rollback and remaining dependencies

At a safe quiescent boundary, revert page-coherence changes to qualified R0 while retaining Patient overview/detail12h, professional24h and reconciled tests. Do not discard unsaved editor state, uncertain clinical commands, operation keys or session-recovery state in another route. Re-run affected browser/time/privacy/shell checks. This is a UI source rollback boundary; **no rollback rehearsal, hosted rollback, DB downgrade or credential/session reset was performed**. A full return to main restores legacy Patient24h and requires explicit disposition.

F02/U03 (hosted provenance/parity), F03 (missing critical Arabic-key fallback), F04 (initial EN/LTR locale flash), F06/E2 and AP03/AP05 remain OPEN. Scoped authored keys and client fonts do not fix F03/F04; initial server markup/locale behavior is unchanged. Immutable #123 stays `94f3b75476a43ac0118665aecf75a2ce471190b0`; [#124](https://github.com/abuhmaid28/egyhealth360/issues/124) remains E2 NO-GO. Real devices/AT/PWA/print, artwork distribution rights, hosted integration, ThemeT1/Dark and final Design System approval remain outside this candidate. Stop at one Draft/Open/Unmerged PR for owner visual review.
