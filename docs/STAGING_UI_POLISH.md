# Pre-final staging UI polish — 5 November 2026

Current bounded work under the Product Owner's **EgyHealth 360 — UI Polish, Arabic Localization, and Staging Stabilization** brief in this chat. This authorizes polishing the existing deployed experience and preparing repository alignment. No redesign, merge, new capability, credential recovery, R1 change or final-domain promotion.

## Exact starting line

Fresh platform reads of the **current** stable pre-final aliases report both deployments READY and attribute both to `fix/r1-portal-integration-72` at **`1b5c5c643f56cff74b3db32543df41845965bdb6`**:

| Service | Current deployment | Project |
| --- | --- | --- |
| Frontend | `dpl_8KA923iSCxvBX3j1qhc6cAcpJQXZ` / `egyhealth360-pre-final-staging-4vld6kjwo.vercel.app` | `prj_TNmytD2ihZpA2XXgM7mscUG9dZ5q` |
| API | `dpl_HGxm7obpsohD3eZGeyCZrLCbpwkR` / `egyhealth360-pre-final-csrn9t5rt-abuhmaid2810gmailcoms-projects.vercel.app` | `prj_C2mPhVlSMWRDZ4K0oOSGALdCAgbF` |

The metadata attributes the candidate; it is not a claim of independently reproducible build-byte identity. The deployed five-portal Demo UI was inspected directly and captured before edits at the [stable pre-final URL](https://egyhealth360-pre-final-staging-abuhmaid2810gmailcoms-projects.vercel.app). No historical deployment investigation or credential recovery was performed. No hosted authenticated Live acceptance is claimed.

Work branch **`fix/pre-final-staging-ui-polish`**, exact base **`1b5c5c643f56cff74b3db32543df41845965bdb6`**. This is the actual deployed candidate line, not current main or the preflight branch.

## Fix inventory

- Center shared empty-state icons, headings, descriptions and actions as a single column. Use consistent gaps, readable 16px headings / 14px body, bounded text width and full available card width. Keep the separate search reset action centered.
- Localize the known directory taxonomy (`Internal medicine`, `Cardiology`, `Dermatology`, `Cairo`, `New Cairo`) in filters, chips, profile badges, appointment rows and the Admin directory. Preserve recorded person/clinic names, clinical text, instructions and unknown source labels exactly.
- Refine existing Arabic interface messages toward the accepted modern Egyptian register, including discovery, placeholders, filters, empty/error/loading messages, appointment help, Doctor and Laboratory terminology. Keep the accepted existing navigation, type family, colors and wordmark.
- Give directory counts a complete Arabic sentence that also works for zero. Isolate clinic/city name runs with visible separator spacing in RTL/LTR.
- Use concise **Cairo time / بتوقيت القاهرة** in ordinary appointment, availability, My Care and consultation context; remove the Demo fixture/offset explanation. Unknown event zones remain identifiable. Actual instants and IANA payload values remain unchanged; detailed clinical provenance timestamps retain offsets where necessary.
- Apply the selected locale to shared date/time readers across Patient, Doctor, booking history, availability, released summaries, consultation and follow-up. Use named Gregorian months, Latin digits and 24-hour time. Isolate published time ranges so endpoints keep their order in RTL. Preserve existing timezone and DST calculations.
- Replace developer-oriented scheduling/account/Demo copy with short explanations of available actions and boundaries. Keep the required explicit-offset input format and all server validation unchanged.
- Add selected-state announcements for specialty chips and 44px minimum touch targets for shared filter/tab buttons.
- Retain explicit Demo vs Live indications, Live failure behavior, unsupported Pharmacy/Laboratory/Admin limits, existing real readers/commands and independent clinical signing/release/close actions.

## Evidence and validation

[Matched before/after viewer](staging-polish-evidence/review.html). Before images come from deployed staging; after images come from the local production build of this branch, using the same fictional Demo data and viewport. They are not a claim that the stable staging alias has been refreshed.

- Node **24.21.0**, pnpm **10.34.6**; dependency lock and manifests unchanged.
- Production Next build, web/UI typecheck and repository ESLint: PASS.
- UI tests: **165/165 PASS** (164 existing + one taxonomy/name preservation regression). CI-policy tests: **30/30 PASS**. Documentation/reference checks and `git diff --check`: PASS.
- Production browser regression covers EN/AR, RTL/LTR, desktop/tablet/390px, 320px reflow, 200% text, account/focus/dialog behavior, loading/empty/error states, booking/consultation/documentation/follow-up, private-text preservation, retained explicit retries and Live isolation. **PASS** against the final immutable production build; committed validation logs contain the result.
- Added actual empty-state geometry assertions at 1440/390px, Arabic specialty checks, and all operational Live destinations at 1440/390/320px in EN/AR. Operational Live proof uses controlled HTTP fixtures, not hosted credentials. Updated the real PostgreSQL/browser assertion to require the translated UTC label **and exact fixture-zone date/time** instead of the old raw `UTC` text; that complete journey runs in required remote CI.
- Fresh five-portal deployed-before and production-build-after captures: no horizontal overflow in the captured matrix. [Provenance](staging-polish-evidence/provenance.json) pins runtime and image hashes and verifies protected source/evidence paths unchanged.
- Remote exact-head full CI is linked in the PR handoff. Technical Green does not constitute Product Owner visual acceptance.

## Independent-review time-display corrections

The independent review of `d11fb5fbc4a7798fdfb6d24c21d3d1a0a216823b` returned **CHANGES REQUIRED**. The owner then authorized the bounded correction on this same PR, without release or merge authority.

- **New P2 regression corrected:** My Care appointment context and the clinician visit ribbon again distinguish repeated local clock times. On 29 October 2026, Cairo `23:30` occurred at both `20:30Z` (`UTC+03:00`) and `21:30Z` (`UTC+02:00`). The UI adds the actual offset only when another instant shares that local date/time; ordinary dates retain concise Cairo-time copy. No instant, zone, command, parser, scheduling rule or eligibility predicate changes. Detailed clinical source provenance stays intact.
- **Pre-existing P2 display defect corrected:** the shared Live `BookingTime` range now has explicit LTR chronology with independently isolated locale-specific date labels and numeric times. Both same-day endpoints and both dates across midnight retain their order in Arabic and English, including booking review/detail/history/rescheduling uses of the shared component.
- Source regression checks cover both occurrences in Cairo and New York, the half-hour rollback in Lord Howe, adjacent unambiguous times, spring-forward, UTC and a fixed non-hour-offset zone. Focused presentation tests: **4/4 PASS**. Production web/UI build, typecheck and repository ESLint: PASS on Node **24.21.0** / pnpm **10.34.6**.
- The new required browser regression checks actual Patient/Clinician routes using **read-only controlled HTTP fixtures**, both Cairo occurrences and ordinary copy in EN/AR at **1440/390/320px**, visible booking endpoint geometry and cross-midnight date preservation, zero writes and no Demo fallback. Focused local production-browser run: PASS. [Validation log](staging-polish-evidence/review-fixes/targeted-browser.log), [source/image hashes and screenshot inventory](staging-polish-evidence/review-fixes/provenance.json). Screenshots are local production captures of synthetic HTTP-controlled Live presentation; they are not deployed or authenticated hosted acceptance.
- The stock local UI unit command initially passed 104 checks but could not start two existing test files because they invoke extensionless `node_modules/.bin/tsc` with `execFileSync` on Windows (`ENOENT`). An external, temporary Windows launcher mapping that exact compiler invocation to `node node_modules/typescript/bin/tsc` (same arguments/assertions) then passed **166/166**. [Adapted local UI-unit log](staging-polish-evidence/review-fixes/ui-tests-windows-launcher.log). Repository tests remain unchanged except the new presentation regression; unadapted Linux exact-head CI is the authoritative complete gate. **30/30 CI-policy checks pass** with the isolated checkout materialized as LF; the existing docs checker assumes POSIX path separators and is deferred to that Linux gate. No CI/workflow or test-policy change is made. The first focused browser driver attempt also rejected an inconsistent synthetic end time; deriving its end from the selected fixture start fixed the driver while retaining response validation.
- Original screenshot/provenance/validation files above remain byte-identical to the reviewed `d11fb5f` package. They describe that earlier candidate. This correction has separate evidence and requires a **new exact-head full CI**; run `41956673836` remains historical evidence for `d11fb5f` only. The PR handoff records the new SHA/run and terminal result.

Technical closure of these display findings does not grant deployment, merge, supervisor approval, final identity or Design System approval. **Future Final V2 remains a distinct higher-quality UX/UI, Logo, Brand and Design System effort.**

## Remaining issues and readiness

| Severity | Remaining item | Disposition |
| --- | --- | --- |
| P0/P1 | No blocking UI defect observed in this scoped matrix. | Not a whole-platform or production-health certification. |
| P2 | Availability publication and follow-up-window authoring still require explicit-offset text entry. | Kept to preserve timezone/DST intent and existing validation; a native date/time editor needs a separately verified ambiguity-handling change. |
| P3 | Screen-reader and real iOS/Android device validation is not part of this browser-based pass. | Accessibility/device verification debt; browser focus, zoom and responsive checks are covered. |

The **polished candidate** is suitable for supervisor-facing **UI review once required CI is green**, with Demo and unsupported Live scope made explicit. The **running stable staging URL has not received these fixes**. It is not declared ready *after these fixes* until the reviewed frontend is refreshed there and hosted smoke checks pass. Hosted authenticated Patient/Clinician acceptance was not rerun, and no credential recovery is requested. No supervisor approval of the clinical lifecycle or final visual system is implied.

## Repository alignment recommendation

**Follow PR #84 with this narrow stacked polish PR. Do not overwrite or supersede #84.** Its exact tested head is the deployed base and its R1 evidence should stay intact. This PR targets `fix/r1-portal-integration-72`, keeping the polish diff separate and reviewable.

Current remote main remains `0a0e9c2038ecad420e95c2c67ae367129e195839`. The existing source stack is:

1. [PR #79](https://github.com/abuhmaid28/egyhealth360/pull/79), `design/foundation-reboot-v2-visual-directions` → main, head `f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`.
2. [PR #80](https://github.com/abuhmaid28/egyhealth360/pull/80), `design/clinician-active-consultation-master-spec` → #79 branch, head `6fbd247a09d774fa42d9712068699753a88e10e6`.
3. [PR #84](https://github.com/abuhmaid28/egyhealth360/pull/84), `fix/r1-portal-integration-72` → #80 branch, head `1b5c5c643f56cff74b3db32543df41845965bdb6`.
4. This polish PR → #84 branch.

After separate owner approval, land the accepted stack in order, retargeting each child only after its parent is merged and checking the cumulative tree. Preserve commit ancestry where practical; if squashing, explicitly verify the resulting runtime tree against the reviewed cumulative candidate. Do not replace the candidate with old main, cherry-pick only the polish, or include excluded PR #82. Those choices could discard deployed My Care, clinician and shared-shell improvements.

All four layers can be merged later without losing the deployed improvements **provided the final tree includes the complete reviewed stack**. No merges, auto-merge, force-pushes or changes to existing PR branches are performed here.

For future staging refreshes, record the exact frontend/API commit, immutable deployment IDs, tested canonical Origin and rollback pair in CURRENT_STATUS. Run the existing required CI against the cumulative candidate before promoting a reviewed frontend artifact. Keep the current API candidate pinned for this presentation-only change. Backend/schema/security/dependencies and API contracts are unchanged; no migration or reseed is required by this polish. Refresh only the existing pre-final frontend after release authorization and hosted smoke checks; preserve the previous READY pair for rollback. R1 and `egyhealth360.vercel.app` remain outside this path.
