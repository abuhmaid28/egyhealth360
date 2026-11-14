# F04 — neutral initial locale shell (Option B)

CURRENT AUTHORITATIVE for this bounded candidate. [Issue #131](https://github.com/abuhmaid28/egyhealth360/issues/131) and its [explicit owner authorization](https://github.com/abuhmaid28/egyhealth360/issues/131#issuecomment-6870265872) supersede the former read-only stop only for these eight files. [Completed research/specification](https://github.com/abuhmaid28/egyhealth360/issues/131#issuecomment-6870223983) supplies diagnosis. Technical Green is separate from owner acceptance and release approval.

## Source and exact inventory

Freshly fetched main/base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. One branch, `fix/131-initial-locale-shell`, starts directly from main. Final commit is the commit containing this report; its full SHA and actual CI receipt are recorded in the Draft PR and Issue #131 final handoff. No reference branch imported, merged or cherry-picked.

Separate Draft/Open/Unmerged references reverified: Patient #128 `37b9b644ffd3ee544280c2894889019a11e8db5e`; bounded F03 #130 `535cc76af5383a8d31b00f1327e4bf051499d907`. Their shared baseline locale Git blob is `1afe8ec1d907fe4ee3c15a045c2c7f71692c7054`. Their overlapping docs/tests require future explicit reconciliation; neither unmerged implementation is included.

| Authorized file | Change |
| --- | --- |
| `apps/web/app/layout.tsx` | Explicit initial EN/LTR attributes; server-visible bilingual informational noscript |
| `apps/web/src/lib/i18n/context.tsx` | Null-only startup gate; bilingual status/wordmark; restore before persistence; layout-effect document semantics |
| `tests/ui-locale.test.mjs` | Preserve original assertions; add real React SSR no-child-mount and literal/interpolation coverage |
| `scripts/test-ui-browser.mjs` | Add isolated helper to complete controlled suite; all existing assertions retained |
| `scripts/support/ui-initial-locale-browser.mjs` | ADD: built-frontend synthetic matrix and actual Live editor/pending-command lifetime proof |
| `docs/CURRENT_STATUS.md` | Current bounded delivery and residual gates before historical snapshots |
| `docs/SOURCE_OF_TRUTH.md` | Current reference/index classification |
| `docs/frontend-v2-slices/F04_INITIAL_LOCALE.md` | ADD: acceptance/evidence/review/rollback receipt |

No dictionary/catalog, CSS/tokens/fonts/assets, API/auth/session/CSRF, clinical/schema/database, endpoint, Next/CSP, dependencies, CI policy or infrastructure change. Existing proper wordmark/style classes and EN/AR loading copy are reused. No cookie, Accept-Language selection, server locale preference, new storage key, hidden English task subtree or hydration-warning suppression.

## Implementation and acceptance

SSR and first client render both select `locale === null`: visible wordmark plus a polite atomic status containing explicitly EN/LTR and AR/RTL text. Layout emits matching `lang=en dir=ltr` and approved bilingual noscript copy without controls. **Option B does not provide personalized Arabic SSR HTML**. The informational no-JS fallback cannot open a workspace. The existing English tab title remains adjacent metadata debt outside this scope.

A mount effect reads existing `eh360-locale` with unchanged enum/parser/default. Missing, invalid or denied reads resolve English; failed persistence does not prevent manual selection in memory. A layout effect does nothing for null; once resolved it updates document language/direction then persists the resolved enum, before browser paint. Stored Arabic has `get(ar) → set(ar)` without initial `set(en)`. No browser storage read occurs during SSR or initial React render.

The null gate never returns after startup. The same Context.Provider position continues to wrap the existing children; no locale key, provider recreation, retry or navigation effect exists. LiveSessionProvider/Application/adapters retain their lifetime during later language changes. Language remains presentation, never authority, identity, role, consent or capability. Recorded names/clinical text and literal entered values remain exact.

| Acceptance check | Evidence/limit |
| --- | --- |
| Neutral SSR/first-client parity | Raw SSR shell and hydrated shell captured at storage read; no task controls/clinical canaries in HTML/RSC; private/no-store and RSC Vary retained; no Set-Cookie |
| Resolved first task language/direction before paint | Mutation checkpoints and requestAnimationFrame samples assert root lang/dir, computed body direction and authored login controls; no hydration warnings/page errors |
| Preference order and denial | Stored AR never incurs initial EN write; missing/invalid/read-denied→EN; setter-denied AR→AR; manual choice/reload follow retained storage |
| Roles and isolation | Anonymous/deep links, Demo Patient/Doctor, Live wrong-role and auth401/403/404/503; intercepted synthetic transport only, no Live→Demo substitution |
| Delayed/disabled JS and reflow | Held JS at320/390/1440, no-JS with AR storage/anonymous/Demo, measured text200, CPU4× and CSS1s delay; no horizontal overflow of tested startup shell |
| Accessibility/focus | Explicit lang/dir, polite atomic status, DOM/AX and keyboard/focus checks; no real screen reader or announcement timing certification |
| Session/editor/command lifetime | Actual Live private editor DOM/value retained during AR→EN→AR and pending synthetic request; no auth restart or automatic retry; explicit uncertain replay retains exact command/key/path/body |

Instrumentation/CPU load affect timings; these observations are not a universal perceived-flash/performance guarantee. Computed CSS text scaling is not native browser zoom. No non-Chromium/physical-device/real AT/AP03 certification, backend authority, real clinical write, DB, credentials, hosted test or F06/E2 execution is claimed. Existing release limitations remain.

## Actual local validation

Pinned Node24.21.0 / pnpm10.34.6 were installed outside Git because host initially supplied Node24.19.0/pnpm11.25.0. Frozen lockfile install; Next16.4.1 default Turbopack production build, React19.3.0, Playwright1.64.1 and system Chromium154.0.8037.57. Next runs only on `127.0.0.1:3100`; startup-matrix contexts block external requests and intercept every API call; the separate editor lifetime fixture intercepts its synthetic API commands. No API server/database starts.

- Focused locale/React SSR tests: **4/4 PASS**, all pre-existing assertions retained.
- Complete UI unit suite: **168/168 PASS**, zero skipped/failed tests.
- Frontend scoped lint, UI/web build and UI/web typecheck: **PASS**.
- Focused built-browser matrix: **33/33 PASS**, plus actual Live editor/pending/uncertain replay proof.
- CI policy tests: **30/30 PASS**. Docs/reference check and outside-allowlist preservation: **PASS** (final counts below).
- **Complete affected controlled browser suite PASS**, exit0: every existing helper plus F04, Golden Demo, role/privacy boundaries, EN/AR, mobile/tablet/desktop, Live HTTP stubs, availability/booking, consultation/documentation/follow-up/close.
- Docs/reference checker: **912 local references /54 current-or-changed Markdown files PASS**; whitespace and exact scope/preservation PASS.

Reproduce with the existing CI frontend commands in `.github/workflows/ci.yml`; `pnpm test:ui:browser` calls `testInitialLocale` before every existing browser test. Optional `UI_SCREENSHOT_DIR` records held/no-JS PNGs and `f04-results.json`. Local `/tmp/f04-evidence` and `/tmp/f04-*.log` are supporting workspace artifacts, **not GitHub-hosted uploads**. No product test flag/endpoint is introduced. Evidence/provenance summaries remain durable in this document and Issue #131.

Harness development failures: initial Vary expectation was case-sensitive (actual `rsc`); a strict locator matched nested Patient roots; inherited text scaling initially compounded. Those harness assumptions were fixed without removing product assertions. Final text200 snapshots original computed sizes, scales after shell attachment and asserts exact doubling before capture. Review also distinguished Playwright's omission of noscript from its snapshot from the native CDP accessibility tree, which contains the visible bilingual notice. No application defect was hidden by those harness fixes.

## Independent reviews and exact-head CI

Two separate read-only agents: `frontend_review` (architecture/UX/accessibility) and `security_review` (privacy/session integrity). Both independently inspect actual source and perform isolated focused checks. Their final prepublication verdicts are recorded below; exact-head remote CI verification is added to Issue #131 after the final run. These are agent reviews, not formal GitHub approvals or professional certification.

The unchanged classifier predicts DOCS_GOVERNANCE + FRONTEND_ONLY, full=false: classify/docs-check/frontend-check/validate selected; backend-check/postgres/docker-runtime/dependency-audit policy-skipped. Actual final run/head/job URLs and conclusions are recorded in Issue #131 and the Draft PR after completion, avoiding a later documentation-only commit that would invalidate the checked SHA. No manual dispatch, policy override, backend/E2 proof or deployment is inferred from frontend Green.

## Preservation and rollback

Verify all baseline paths/modes/blobs outside this exact allowlist before publication; original unit/browser assertions are retained with additions only. Source hashes and final check counts are recorded below. No protected screenshots/assets are regenerated in Git.

Rollback means one coherent eight-file revert of this candidate **at a quiescent boundary**, after pending/uncertain actions are safely reconciled under existing contracts. Never wipe localStorage, sessions, editor state or original operation keys; never retry a clinical action as part of rollback. No cookie migration/DB rollback exists. Reverting restores the previous English-first/transient-write defect. No reload/logout recovery guarantee or hosted rollback rehearsal is claimed.

F04 remains an implementation candidate pending owner/advisor disposition. F03 globally outside #130, F02/U03, F06/E2 #124 NO-GO, AP03/AP05 and all release gates remain **OPEN**. No merge, Ready, auto-merge, deployment, domain promotion, ThemeT1/wider V2 work or next sprint.

## Source SHA-256 receipt

| Path | Base input | Candidate output |
| --- | --- | --- |
| `apps/web/app/layout.tsx` | `a91cf19a6f7a1d50eb321283d40e99ae6d0ff216846228c0c964fc3a981e9eb7` | `2a16465f09ea7c066f4639e920001fd47c8bb09fc6fb3f42e966c4468d6ba8f2` |
| `apps/web/src/lib/i18n/context.tsx` | `7f0dece242653a7dd84d25b05f75fc12fdc29c8bd4b954714ea0cd48ed56ec34` | `4fa88110062f779bbd9ac83a3a9daf6a0c8b26e7c655e2002921414ca97a73dc` |
| `tests/ui-locale.test.mjs` | `25772671a9a33bc47e401e7c51a721df757967ecbe46be5022a4c3a094836f21` | `4cf25509648edbd333dc56dc6946debf2f445fc4f703fc5b19102139102cc005` |
| `scripts/test-ui-browser.mjs` | `b40b8bf6689a7ed31b4df55696eb35ed893b0a483a86207eafbb83d58b93cae5` | `16996eb15de5cc92051456529f419fea4cf7034d322eee0c4adbc729181e3601` |
| `scripts/support/ui-initial-locale-browser.mjs` | `NEW` | `3ee4c347fedd01ffdd781824e41c8838243e2b71689926ecdecebe4bfe96829d` |
| `apps/web/src/lib/i18n/catalog.ts` | `08bb9d92fa5bb0af42bb375b40b3520ed2ea4d43c808877b189311709bb25f69` | `08bb9d92fa5bb0af42bb375b40b3520ed2ea4d43c808877b189311709bb25f69` |
| `apps/web/src/components/live-session.tsx` | `c6ab44fe43e7dd99c8f47ac136911b684f2b83d8f555124699343033148954f6` | `c6ab44fe43e7dd99c8f47ac136911b684f2b83d8f555124699343033148954f6` |
| `apps/web/src/components/application.tsx` | `81b7cb9867b9492a1aef5026787e46795112e7de5d8607d3e57520d00d00382c` | `81b7cb9867b9492a1aef5026787e46795112e7de5d8607d3e57520d00d00382c` |

All **1,423** baseline paths retained; **1,417** outside the six allowed pre-existing modifications remain mode/type/blob-identical. The two additions produce exactly eight changed files. Existing locale-test/browser-runner lines are retained in original order; no old assertion removed or weakened. Full final eight-file hashes (including governance docs) are added to the Issue #131 final receipt, because this document cannot contain its own hash.

## Independent prepublication verdicts

- **Frontend Architecture / UX / Accessibility — bounded PASS, no remaining blocker.** Independent `frontend_review` inspected source/contracts/staged eight-file diff, ran 4/4 locale units and four separate browser contexts (held AR320/text200, held EN1440, noJS320/text200, storage denial390). Verified actual doubled text/reflow visually, native CDP noJS AX, first-content frame direction, keyboard/focus, input DOM/value preservation and exact shell/storage order. The initial helper scaling-timing finding is fixed; final helper/source hashes match. Local independent receipt SHA256 `42153d8a6b5eba1d54f8cc444bf4617b8429dc792eb1d70fb87019a8c7f3d6f0`; native noJS AX `157142ad89d8f5b28e324fb782ab2e3ab9b9ffad5348ba2b23302685405f412c`.
- **Security / Privacy / Session Integrity — bounded PASS, no actionable defect.** Independent `security_review` inspected unchanged session/application/auth/data boundaries and staged docs/source, ran 4/4 locale units and four separate browser contexts (stored AR, missing preference, getter denial/manual AR, ADMIN wrong workspace). Only four intercepted auth GETs, zero external/write/cookie/page/hydration activity; private SSR contains no account/private canaries. Filled input DOM/value and auth count survived repeated language switches. Reviewed actual pending/uncertain command test and exact operation-key/body retention. Both reviewers independently confirmed1423/1417 preservation and retained original test lines.

Both verdicts are source/local candidate reviews. Each reviewer verifies the exact committed head and automatic CI after publication; that final remote verification is durably appended to Issue #131 without changing source. No professional AT/clinical or formal GitHub approval is implied.

## Local evidence hashes

| Local supporting artifact | SHA-256 |
| --- | --- |
| `/tmp/f04-full-evidence/f04-results.json` | `d6c156e5fbb64bf792afd95bd88efa4cf223e574c66d66615f2382d81b34a49d` |
| `/tmp/f04-full-evidence/f04-no-js-320-text200.png` | `b60f318a9a83b8b2cfd02dda25a6ae460f9688c357df41401b2f3232a765e167` |
| `/tmp/f04-security-probe.json` | `da273e632c6e47e9643784473588f179904535a76e467fda320055cf975c4b7b` |
| `/tmp/f04-browser.log` | `e48a36db5594ff31df09b8b4e67ddbea4a7554c36b6fe6c8c448738603599582` |

The 33-row browser result includes startup storage traces and first meaningful-content snapshots. The separate lifetime assertions execute in the same helper and are attested by its PASS log. Local image/JSON files are not remote attachments. Actual CI and postpublication independent exact-head verdicts are reported on Issue #131/the Draft PR, not retroactively inferred from these local receipts.

Security reviewer additionally reran the final helper independently: **33/33 startup cases plus pending/uncertain editor/key lifetime PASS**, reviewer-owned loopback server closed in finally. Separate local log SHA256 `7062e6457efb95df91864e256254cac6846485facf749421ddf66173c5048a0c`; result JSON SHA256 `7858c1b0d5c85c019c4f86f34ac834145a1ce0388f3628d59a2c9a1d66691e02`. This rerun includes final native noJS AX and actual operation-key assertions.
