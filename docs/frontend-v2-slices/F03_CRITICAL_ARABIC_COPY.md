# F03 — Live booking confirmation critical Arabic copy

Bounded implementation under [explicit authorization](https://github.com/abuhmaid28/egyhealth360/issues/129#issuecomment-6865929699), following the [completed technical review](https://github.com/abuhmaid28/egyhealth360/issues/129#issuecomment-6862964934). Main/base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. Branch: `fix/129-critical-arabic-booking-copy`, directly from main. The final Draft PR / Issue #129 delivery receipt owns final head, actual CI and reviewer disposition; this document does not predeclare a remote CI result.

The recovered checkpoint and prior local logs were preserved before further work. Recovery commit `70a537f` contains the same five implementation/test paths whose hashes are below. No reference-branch code was imported. PR #128 stays Draft/unmerged at `37b9b644ffd3ee544280c2894889019a11e8db5e`; its Patient12h/professional24h candidate is neither incorporated nor altered.

## Behavior and boundaries

- `criticalCopyState` is a pure typed per-task completeness check: own nonempty string entries, strict brace/token syntax and matching placeholder multisets before interpolation. It returns readiness and fixed missing-key metadata without logging or values. The global translator and already-Arabic second pass are unchanged.
- The booking task registry includes identity/title/target, mode/consequence, confirm/busy/retry/success, receipt handoff, exit/session recovery, all eight booking API errors and generic safe-error copy. Existing presentation helpers probe only selected authored fictional aliases and zone labels. Recorded names, instructions, exact values and necessary IANA identifiers never become keys.
- Exactly four static progress labels are optional: `Booking progress`, `Choose a time`, `Review details`, `Booking confirmation`. Missing optional copy omits that list, leaving an otherwise complete task eligible. No other context becomes optional.
- Missing critical AR shows `المهمة دي مش متاحة بالعربي دلوقتي.` independently of the faulty dictionary, a native-disabled primary action and associated polite status explanation. The actual handler rechecks current completeness synchronously; stale handlers and rapid repeated activation cannot create, generate keys, notify or navigate while blocked. Missing English keys are not placed in DOM, AX or hidden diagnostic attributes. Native Modal and existing exit wording/focus behavior are reused.
- A narrow local weak adapter/session task store retains only this booking task's original public target, pending flag, permitted receipt/error and listeners. It is not an authority cache or persistent operation store. Close/reopen does not discard an uncertain or suppressed committed result. Session/account identity and component-scope checks suppress old notifications/navigation.
- The adapter has one `CREATE` command slot. Another availability slot cannot replace an unresolved original task and then masquerade as unchanged recovery. A 503 uncertainty latch survives later 403/404/409 feedback until authoritative success or session disposal. After 401 invalidates command memory, prior uncertain recovery is disabled; approved original-request-unavailable guidance and existing session recovery remain available. No recovery across reload/logout/login is promised.
- If EN changes to incomplete AR while a request is in flight, retain its actual receipt or uncertainty. No language change cancels/undoes a commit or creates a noncommit claim. A retained receipt displays its original provider/clinic/time, not a subsequently selected target. When copy is complete, explicit `View booking` hands off that receipt without another create. Normal successful handoff consumes retention so a later independent task is not blocked by historical state; stale mounted callbacks remain spent.
- Intact AR/EN retain the existing normal confirmation flow. No automatic retry, language switch, Live-to-Demo fallback, API/session/clinical rule or data change is introduced. Original operation keys remain owned by the unchanged adapter.

The accepted [Arabic UX](../ARABIC_UX.md), [content recovery](../CONTENT_SYSTEM.md), [security](../SECURITY.md), [booking](../V3_I2_SLICE3.md) and [consultation/logistics](../V3_I2_SLICE4.md) contracts remain unchanged. No currently absent production critical key or booking incident was proven; fault injection demonstrates and verifies the boundary.

## Exact eight-path inventory

| Path | Change |
| --- | --- |
| `apps/web/src/lib/i18n/critical-copy.ts` | NEW pure classification/completeness API and independent fallback copy |
| `apps/web/src/components/live-booking.tsx` | LiveCreateReview plus narrow task-lifecycle support/imports only |
| `tests/ui-locale.test.mjs` | Retain existing tests; recursive/conditional and explicit finite error/key coverage |
| `tests/ui-critical-booking-copy.test.mjs` | NEW actual-source component/helper/adapter regressions |
| `scripts/test-ui-critical-booking-copy.mjs` | NEW standalone disposable native-browser fixture and shared test-source loader |
| `docs/CURRENT_STATUS.md` | Bounded status pointer |
| `docs/SOURCE_OF_TRUTH.md` | Classify this record |
| `docs/frontend-v2-slices/F03_CRITICAL_ARABIC_COPY.md` | NEW implementation/evidence/rollback record |

Exactly four allowed baseline modifications and four additions: all 1,423 baseline paths retained, 1,419 pre-existing entries outside the allowlist mode/blob-identical. There is no ninth changed tracked path. All pre-existing booking functions other than LiveCreateReview remain byte-identical in their function bodies. Catalog/dictionary/locale provider/shared UI/presentation/API/session/auth/clinical code, database/schema/migrations/OpenAPI, CSS/fonts/assets, dependencies/lockfile, route/SSR/cookies, CI/infrastructure and historical evidence retain their base blobs.

## Local verification and provenance

Pinned Node **24.21.0**, pnpm **10.34.6**, frozen existing lockfile, TypeScript **5.9.3**. Dependency installation changed no tracked dependency/configuration file. Source and catalog faults exist only inside disposable fixtures; there is no shipped injection switch. Browser uses actual compiled component, helper, UI/Modal, presentation, catalog and booking adapter sources with React; only locale/app/router/transport seams are controlled. No real credentials, backend server, database, seed or clinical write is used by these focused tests.

| Proof | Result / limit |
| --- | --- |
| `node --test tests/ui-critical-booking-copy.test.mjs tests/ui-locale.test.mjs` | 54/54 PASS; every required key individually missing; optional omission; blank/nonstring/inherited/malformed-placeholder rejection; direct/stale handler, no key/notification/navigation side effects; EN/AR interpolation and double translation; selected aliases/zones; 401/403/404/503; unchanged503 method/body/key; locale/close/reopen/account/unmount; uncertainty latch,401 barrier and cross-slot attribution |
| `node --test tests/ui*.test.mjs` | 218/218 PASS, zero failures/skips |
| Existing frontend ESLint command plus the new standalone script | PASS |
| UI/web build and typecheck | PASS; existing time formatter/callers unchanged |
| `EH_UI_CHROMIUM=/usr/bin/chromium node scripts/test-ui-critical-booking-copy.mjs` | 69 cases PASS; Chromium154.0.8037.57; zero external requests/page errors; existing Inter/Noto font requests200, wait for fonts.ready |
| Browser matrix | Required/optional/corrupt copy; intact/missing AR/EN; long mixed names;320/390/1440; measured100/200% text; disabled click/direct handler; Tab/Shift+Tab/native dialog wrap, Escape/focus return and busy Escape; status/description/DOM+AX canaries; raw errors and401/403/404/503; retained original-target receipts, recovery, account disposal and no Demo substitution |
| Existing controlled browser regression suite | Completed after recovery: PASS, exit0, including operational mode, availability/My Care, clinician master, Arabic/RTL, journeys, booking, opening, documentation, close and final Golden Demo/23 route variants; no browser exceptions. Interrupted partial logs were not used as completion evidence |
| Existing CI-policy tests | 30/30 PASS; no classifier/test assertion weakened |

**Baseline overflow, measured rather than waived:** the focused fixture independently compiles main's original LiveCreateReview at the pinned base. With existing fonts loaded, EN320/200% static progress list measures `clientWidth=286`, `scrollWidth=351`. The candidate matches that exact main measurement/text; other measured scenarios, including new Arabic fallback at320/200%, have no internal horizontal overflow. Primary/exit controls remain visible and reachable. The verifier fails any additional overflow or changed baseline geometry. No CSS change or screenshot-hiding correction was applied. Earlier fallback-font measurement332 is superseded by the loaded-font351 measurement. This is preserved layout debt, not a new F03 regression.

Native Chromium may briefly put focus in browser chrome (`document.body`) at the native dialog Tab boundary; the test asserts the inert opener is not focusable and the next traversal returns inside. This is not a custom focus trap or native screen-reader certification. Computed text enlargement is not native browser zoom. No OS/device/PWA/print, full accessibility, hosted authority, F06/E2 or release certification is claimed.

## Independent review and CI boundary

Two separate reviewers cover Frontend/Content/Accessibility and Security/Clinical/Privacy. The interrupted session's findings were corrected with regression tests: malformed braces; verifier recursion/UTF-8/font/scaling/timing errors; retention after normal handoff; original-target attribution; cross-slot key replacement; and uncertainty across later denial/session reset. Both recovered-source reviewers independently reran 54/54 focused unit/locale tests and 69 browser cases and returned bounded PASS with no remaining material finding; both also verified the eight-path preservation and documentation. Their final exact-head verification is recorded durably in Issue #129's final receipt. Partial/interrupted reviewer messages are not substituted for final signoff.

Existing CI policy classifies the exact authorized standalone script path as unmapped infrastructure, so **FULL existing CI** is expected: classify, docs-check, frontend-check, backend-check, postgres, docker-runtime, dependency-audit, validate. No policy skips are expected; report actual conclusions from the final run. Existing workflow PostgreSQL/Docker/API/browser effects remain disposable synthetic CI; no hosted F06/E2 campaign, manual workaround or policy/configuration change is authorized. One stable final Draft PR triggers required exact-head CI; final run/head/jobs are linked in the PR and Issue #129 rather than creating another post-CI source commit merely to restate CI.

## Source receipt

SHA-256 of the reviewed implementation/test inputs:

| File | SHA-256 |
| --- | --- |
| `apps/web/src/components/live-booking.tsx` | `f642516aad16a56290c9d0b7ed38bd821ce30d873f88fa6dca6d819eb6dc986f` |
| `apps/web/src/lib/i18n/critical-copy.ts` | `38f5c7a54499cd2fa234a68c77eab68d84e79e9a7445325c817b20dab2aeeb58` |
| `tests/ui-critical-booking-copy.test.mjs` | `9192528cd870b0f8048ba499b38e923078dd1c9ac42c8618513cd1df0149d192` |
| `tests/ui-locale.test.mjs` | `d6be3e7076bf7101060c8b571890948e1e39c629a82f096003b89bdc19171e3f` |
| `scripts/test-ui-critical-booking-copy.mjs` | `64e7318e0c6c363d1efb75b3d46f87202a1bf0ca41b75821050ee402858d9279` |

## Rollback and remaining gates

Rollback is a coherent revert of this eight-path slice at a quiescent boundary. Preserve actual booking receipts/history and unresolved original commands; never reset adapter/session/key state or resubmit to simulate recovery. No hosted rollback, durable recovery or database rollback is introduced or rehearsed. Reverting re-exposes this F03 boundary; it is not release-safety proof.

**F03 remains OPEN globally** for Doctor sign/release/close, other booking/publication flows, Demo fulfillment and V2 read-table protection. F02/U03, F04, F06/E2 NO-GO, AP03/AP05 and all release gates remain OPEN. No merge, ready-for-review, auto-merge, deployment, broader Frontend V2, final Design System or automatic next sprint. Stop at the independently reviewed Draft PR for advisor/Product Owner disposition.
