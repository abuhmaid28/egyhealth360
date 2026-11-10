# Bounded QA — Design System V2 specification pilot

**TESTED local synthetic proof only · Issue #104 · 10 November 2026.** [Specification](FOUNDATIONS_AND_RESPONSIVE_SPEC.md) · [owner gates](DECISION_GATES.md) · [gallery](gallery.html). Technical evidence is not Product Owner visual/content acceptance, final DS adoption, product accessibility certification, runtime authorization proof or release approval.

## Actual environment and reproduction

- Linux headless **Chromium 154.0.8037.57**, DPR1, Nodev24.19.0; reference assets from pinned PR101 head `687f94074c0ac4d45610546517ea6aa228d36183`. Genuine Inter variable + Plex400/600 and four source-exact AR/EN theme lockups. The [manifest](reference-manifest.json) pins source paths/Git blobs/SHA-256; seven temporary references only, ignored `.reference/`, no asset inventory duplicated.
- Browser policy returned **ERR_BLOCKED_BY_ADMINISTRATOR** for `file://`. No policy was altered. Playwright instead fulfilled allowlisted-scheme virtual `http://design-review.test` requests directly from local bytes in memory, with **no listening server or network egress**. Unrecognized origins are aborted; zero outbound requests and zero page exceptions in the final run. Ordinary local-file opening is offered for reviewers but **not PASS-claimed in this managed browser**.
- Use existing repository Playwright: `python docs/design-system-v2/spec-pilot/prepare-reference.py`, then `node docs/design-system-v2/spec-pilot/qa-browser.mjs`. With an existing external tool install set `PLAYWRIGHT_MODULE` to its module path and `CHROMIUM_PATH` to its browser. Actual run used the environment-provided Playwright module and `/usr/bin/chromium`; no new package was added. Script writes only bounded evidence under this folder, does not publish or submit anything. Gallery's native density select demonstrates anatomy only; it is not a density setting.
- Local existing dependencies installed frozen with lifecycle scripts disabled, no lockfile change. Environment Node24.19 differs from repository engine24.21; only docs policy, static lint and browser evidence are claimed locally. Required remote CI uses repository-pinned tooling and is reported at the exact final head in the Draft PR.

## Actual tests and measurable limits

[qa-results.json](evidence/qa-results.json) contains exact input SHA-256 identities, fonts loaded, each layout case, actual computed color states, checks and10 screenshot hashes. [qa-browser.mjs](qa-browser.mjs) is the reproducible harness.

| Check | TESTED result / limit |
| --- | --- |
| Core matrix | **40/40 PASS**:2 roles ×2 locales ×2 themes × widths320/390/768/1024/1440; no document horizontal overflow or measured clipped text/controls; comfortable44px controls and row links. |
| Extra responsive cases | **24/24 PASS**: all8 role/locale/theme combinations at320px with200% root text, lower-navigation B, and1920px. Native400% browser zoom is separately NOT TESTED. |
| Keyboard / dialog / time / gallery | **33 checks PASS**: native dialog open/initial focus/Tab containment/Escape/focus return in both locales/themes,12 ordered in-document stops, chronological full time alternatives, lower-nav DOM position, all four gallery selectors, forced-color/reduced-motion render, text-spacing reflow, visible missing-font/logo warning. Forced-color rendering is not full contrast/AT certification. |
| Font and source proof | Every core/extra view reports loaded genuine locale fonts; authentic600 Arabic, no synthetic bold, full names/date/zone wrap. Missing assets deliberately tested and visibly warned. Variable Inter carries approved EN weights; fonts/lockups match pinned hashes. |
| Actual text and placeholder/value contrast | **612 state-labelled computed observations PASS** across rest/hover/pointer-active/focus/dialog; minimum ordinary text5.71:1; placeholder7.41:1; threshold4.5:1. Input/select values and explicit opaque placeholder colors included. |
| Essential boundaries / focus | Minimum boundary4.40:1, focus5.93:1; threshold3:1 against actual adjacent surface. Primary/secondary/selected/disabled/invalid controls and three surface focus contexts are represented by computed evidence plus exact foundation pair calculations. No gradient/logo contrast certification. |
| RTL / mixed text | AR RTL and EN LTR exercised; Latin digits, full doctor/patient names, `bdi` endpoints/ISO instants and timezone checked visually/structurally. Time-copy comparison is not accepted CD07 amendment. No copy/paste or native editorial study claimed. |
| State coverage | Static form error/warning/success, disabled command, skeleton/busy, empty, neutral denial/uncertain/status, native fields/select, dialog and secondary source rows. Tabs/table/drawer/busy-submit/product recovery are **specified, not implemented/tested**. No repeated clinical command, fake record or unsupported Lab/AI transaction. |
| Focused repository checks |30/30 existing CI-policy tests PASS; candidate JS/MJS ESLint PASS; staged/committed Markdown reference and whitespace checks recorded in final Draft PR. No modified gate, path waiver or invented classifier skip. |

Contrast uses opaque sRGB WCAG relative luminance on actual computed text/value/placeholder/boundary/focus foregrounds against the nearest opaque background. State labels repeat pairs deliberately so rest/hover/active/focus/disabled/error are reviewable. Decorative skeleton bars have no semantic minimum; the loading text does. Disabled controls meet the measured palette even though inactive components have contrast exceptions. Native select popups, OS focus rings, selection behavior, screen-reader announcements and all possible color compositions are not certified by this scanner.

The first run found200% English overflow and a single-action dialog Tab issue; corrected wrapping, clarified human-facing authority text and explicit proof-dialog focus containment. Independent review identified default placeholder contrast and terminology drift; fixed placeholder color/measurement, used accepted جدول المواعيد / المراجعة والإغلاق, and corrected Doctor current-section semantics to `aria-current=location`. Pressed pointer palette explicitly retains hover while keyboard active without hover retains rest. Only final successful evidence is retained; no failure is silently called PASS.

## Ten bounded visual captures

10 PNGs, approximately2.84MB total. Desktop/tablet/mobile, all roles/locales/themes represented without a screenshot cross-product. Patient AR light desktop expands time alternatives. The gallery can show both nav proposals and200% text at every review width; B is intentionally normal-flow lower navigation, with its scroll/discoverability cost disclosed. A is recommended, not adopted.

| Specimen | Evidence |
| --- | --- |
| patient-ar-light-1440-top-100 | [PNG](evidence/patient-ar-light-1440-top-100.png) |
| patient-ar-dark-390-top-100 | [PNG](evidence/patient-ar-dark-390-top-100.png) |
| patient-en-light-768-top-100 | [PNG](evidence/patient-en-light-768-top-100.png) |
| patient-en-dark-1440-top-100 | [PNG](evidence/patient-en-dark-1440-top-100.png) |
| doctor-ar-light-390-top-100 | [PNG](evidence/doctor-ar-light-390-top-100.png) |
| doctor-ar-dark-1440-top-100 | [PNG](evidence/doctor-ar-dark-1440-top-100.png) |
| doctor-en-light-1440-top-100 | [PNG](evidence/doctor-en-light-1440-top-100.png) |
| doctor-en-dark-768-top-100 | [PNG](evidence/doctor-en-dark-768-top-100.png) |
| patient-ar-light-320-lower-100 | [PNG](evidence/patient-ar-light-320-lower-100.png) |
| doctor-ar-dark-390-top-200 | [PNG](evidence/doctor-ar-dark-390-top-200.png) |

## Preservation and independent review

[Preservation evidence](evidence/preservation.json): all **1423 prior tracked paths retained**, **1421 byte-identical**; only CURRENT_STATUS and SOURCE_OF_TRUTH summaries changed. Runtime, packages/ui, backend, schema/migrations, OpenAPI, dependencies, workflows and protected prior assets/evidence remain byte-identical. New files stay within this isolated proof folder. Main/base `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`; no PR101/103 history imported.

Independent read-only reviewer checked representative desktop/mobile/light/dark/RTL/200% images, source-exact remote blobs, accepted audited pairs, clinical/privacy boundaries and QA completeness. Findings above were corrected. **Final independent verdict, reviewed input hashes and committed-head/remote-CI verification live in the Draft PR handoff**, avoiding a circular self-hash or preemptive final PASS here. No native design-skill activation or PR87 execution is claimed.

Static HTML/CSS/JS/Python/PNG/JSON are unmapped by the unchanged repository classifier and select **INFRASTRUCTURE/full regression** alongside DOCS_GOVERNANCE. Expect classify +docs-check +frontend-check +backend-check +postgres +docker-runtime +dependency-audit +validate, with **no intentionally skipped selected lanes**. The actual exact-head run/result is authoritative in the PR; this document does not anticipate Green or claim a run before it exists.

## OPEN / NOT TESTED and release-risk register

- **AP03 OPEN:** actual Chrome/Edge/Firefox/Safari, physical Android/iOS installed PWA/icon/masking/safe-area/virtual-keyboard/OS-text behavior and physical print. Linux Chromium/in-memory static proof is not those platforms. Prior PDF still has **five Type3 glyph bounding-box warnings**; no new PDF or physical-print PASS.
- **AP05 OPEN:** underlying artwork creator permission, originality/exclusivity and trademark/similarity evidence. Font OFLs are separate; no legal clearance, commercial distribution or educational exemption asserted.
- **Accessibility:** native400% browser zoom/reflow, real NVDA/Firefox and VoiceOver/Safari speech, touch ergonomics, OS text settings, long authored clinical prose, native select popups and participant task comprehension remain NOT TESTED.200% root-text and320px layout are tested separately. Arabic text-spacing is an exception stress override, not proposed Arabic letter spacing.
- **Integration/security:** backend authority/replay/revocation/wrong-patient/data/history/concurrency tests are not executed by these static specimens. Existing runtime contracts remain binding; selected remote regression does not turn proof controls into real clinical behavior. Live I3 frontend/hosting parity and unsupported diagnostics/AI remain debt.
- **Owner decisions:** DSV2-01 semantic/type/shape/density, DSV2-02 scoped time format, DSV2-03 navigation and DSV2-04 theme default/persistence/visual pair remain OPEN. Technical checks and independent bounded review cannot accept them.
- **Next phase:** whole-project health review, relevant component/pilot/content signoffs, separately approved Frontend Architecture V2 and explicit implementation authorization remain prerequisites. No major health audit/remediation, final DS adoption, ready transition, merge, deployment, production or release change is authorized here.
