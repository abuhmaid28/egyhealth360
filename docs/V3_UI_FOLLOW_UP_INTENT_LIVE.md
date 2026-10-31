# Live Follow-up Intent — graduation journey

Frontend-only integration under [Issue #48 authorization 6536467435](https://github.com/abuhmaid28/egyhealth360/issues/48#issuecomment-6536467435), from verified base `b8ed01e4546ac94e52f9fcbec2f23e90b6fc6262` / Bootstrap `41146078616` SUCCESS. Branch: `feat/v3-ui-follow-up-intent-live`. The resulting PR stays OPEN / UNMERGED with auto-merge OFF. The PR records exact head and CI run.

This integrates the already-merged [Slice 6 contract](V3_I2_SLICE6.md). Older UI documents describing general follow-up as Demo-only are historical for this capability. No backend behavior, clinical authority, schema, migration, OpenAPI, backend test or CI workflow is changed. No I3 or EACCE work is included.

## Present the Live journey

With synthetic Live accounts and an independently established current clinical relationship:

1. Clinician schedule → appointment → explicit Consultation Opening → **Open clinical documentation**.
2. Document the visit using the existing Slice 5 workspace. Use the section navigator to reach **Follow-up instructions**.
3. Enter the clinician instruction; optionally provide a desired start/end with explicit offsets and the exact IANA time zone. Nothing is inferred from a diagnosis or summary. Save a separate immutable draft.
4. Choose **Review follow-up release**, review the saved instruction/window, confirm the correct patient, then **Sign and release follow-up**. Summary release and follow-up release are independent actions.
5. Sign in as the patient → **Read released follow-up instructions** from the dashboard/released-care entry, or **Follow-up** in record/navigation. This reader works independently of the older HTN record sources.
6. When needed, the author can **Correct released follow-up** with a complete replacement instruction/window and a reason. Review and confirmation precede immediate signed release. The earlier version stays in backend history; this bounded screen displays the latest permitted version.

The desired window is explicitly a preference, never a booking, automatic reminder, CareAction completion or EACCE evidence. Each draft save creates a new root; no draft-update route is invented. Clinician full reload still loses the genuine opening receipt: the backend has no consultation recovery/read route. Existing explicit recovery guidance remains. Patient released reads work after fresh authentication.

## Exact transport and privacy boundary

All paths below use the existing credentialed same-origin `/api/v1` transport, no-store responses and in-memory CSRF. The server derives identity and enforces current authority.

| Surface | Route / exact body |
| --- | --- |
| Author latest-page list | GET `/consultations/{consultationId}/follow-up-intents?page=N&pageSize=20` |
| Draft | POST same collection: `{instruction,desiredWindow,operationKey}` |
| Explicit release | POST `/{intentId}/sign-release`: `{expectedVersion,operationKey}` |
| Reasoned released correction | POST `/{intentId}/corrections`: `{expectedVersion,predecessorId,reason,instruction,desiredWindow,operationKey}` |
| Own released reader | GET `/me/follow-up-intents?page=N&pageSize=20` |
| Current-related adapter reader | GET `/patients/{patientId}/follow-up-intents?page=N&pageSize=20`; transport supported, no new clinician patient-browser UI |

`desiredWindow` is null or exactly `{startAt,endAt,timeZone}`. The backend validates real instants, offset/zone compatibility, canonical values and the actual contract. Correction prefills convert normalized UTC response instants back to the declared zone's explicit offsets independently at each end, including DST transitions; no date or window is inferred.

The allowlist presentation model omits consultation/root/operation/actor IDs, author-only sequence numbers, draft predecessors, raw DTOs and hidden counts. The current version key is transient component/command identity, never displayed. A permitted booking ID is used only for a patient appointment link. Drafts or author sequence fields in a released DTO are rejected. Restricted roots are absent from ordinary backend projections; a refresh removes the entire entry, booking and author command target. No forensic detail or privacy override is offered.

Current linked booking state is read directly from the Slice 6 projection: BOOKED, CANCELLED, RESCHEDULED, NO_SHOW or IN_CONSULTATION. The patient can open the existing appointment detail. Cancelled/rescheduled linkage never claims an active booking. Link creation/replacement is deliberately omitted: this consultation workspace has no trustworthy existing-booking picker. Fixture setup in the real browser proof uses the merged service to establish a link, then verifies actual UI reads and cancellation. No backend gap is filled with a fabricated UI action.

Commands use canonical UUIDv4 operation keys and the 16 KiB actual JSON byte budget. An unchanged explicit retry retains identical bytes/key; changed payloads receive fresh keys. Pending fingerprints use SHA-256 rather than stored narrative. There is no automatic mutation retry, `Idempotency-Key` header or optimistic success. Malformed/lost mutation responses remain uncertain, and successful writes are followed by ordinary authorized reads. Scoped failures clear command targets. Session expiry, identity change, logout and disposed scopes invalidate editors, pending commands and delayed reads. Clinical payloads never enter browser storage, URLs, analytics or logs.

## Demo / Live evidence

The synthetic Demo adapter and its patient/clinician Golden Demo are unchanged. `/patient/follow-up` selects the new reader only in Live mode; Demo retains its existing browser-only follow-up journey. Live read/transport errors remain Live, with safe authored loading/error/empty/session recovery states. No failure selects the Demo adapter or fabricates success.

`tests/ui-follow-up-intents-live.test.mjs` covers exact commands, retries, malformed responses, allowlist privacy, released-only validation, paging, correction provenance, DST offset conversion, scalar/control-character limits, disposal/session invalidation, failed-refresh target removal and safe HTTP failures. The existing localization test checks Arabic catalog coverage.

`scripts/support/ui-follow-up-intents-browser.mjs`, called by the existing browser runner, proves controlled loading/empty/released/error/expiry states, unchanged free text, EN/AR/RTL at 1440/834/390, patient read-only projection, safe payload handling and Live mode remaining selected on failure. This is presentation proof, not persistence proof.

`scripts/support/ui-follow-up-intents-real.mjs` extends the existing real documentation journey with the actual merged Nest persistence, through Browser → Next → Nest → PostgreSQL 18.6. No follow-up HTTP route is mocked. It checks draft exclusion from patient output, explicit release, a genuinely lost committed response and exact unchanged retry with one version, desired-window persistence, linked booking/cancellation, reasoned correction/preserved predecessor, whole-root privacy suppression, subsequent-command relationship revocation/editor clearing, no clinical browser storage, EN/AR/RTL responsive screens and unchanged EH-012/CareAction rows. Existing Booking, Opening and Slice 5 proofs remain enabled in the same runner.

## Validation and captures

Use Node **24.21.0**, pnpm **10.34.6**, the unchanged lockfile and a disposable PostgreSQL database for the real suite.

| Check | Result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS |
| `node --test tests/*.test.mjs` | PASS, 282/282 |
| `pnpm test:ui:browser` | PASS, Golden Demo and controlled Live matrices |
| `pnpm test:ui:real` | PASS; real Availability/Booking/Opening/Slice 5 + Slice 6, disposable PostgreSQL 18.6 |
| `pnpm audit --prod --audit-level high` | PASS, 0 HIGH / CRITICAL; 2 LOW / 3 MODERATE |
| `pnpm audit --audit-level high` | PASS, 0 HIGH / CRITICAL; 2 LOW / 5 MODERATE |

No dependency or lockfile changes. Advisory counts describe the registry response at validation time.

Real synthetic-data screenshots:

- [English desktop release review](ui-screenshots/follow-up/live-en-release-desktop.png)
- [English mobile patient](ui-screenshots/follow-up/live-en-patient-mobile.png)
- [Arabic mobile patient / RTL](ui-screenshots/follow-up/live-ar-patient-mobile.png)
- [Arabic mobile clinician / RTL](ui-screenshots/follow-up/live-ar-clinician-mobile.png)

These captures use actual persisted synthetic data, not HTTP stubs. Historical captures are preserved. No hosted deployment or real-patient readiness is claimed. Independent review and successful exact-head Bootstrap remain required; no merge is authorized here.
