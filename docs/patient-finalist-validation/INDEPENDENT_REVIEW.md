# Independent Patient finalist review

Reviewer: separate agent context `independent_visual_review`, 8 November 2026, Africa/Cairo (7 November UTC). This report is my only authored file in this task. I did not author the specimens, boards, logo-gate brief, roadmap, or author test harness. Subject: disconnected, synthetic Patient My Care specimens, not an integrated application.

## Three independent verdicts

| Gate | Verdict | Boundary |
| --- | --- | --- |
| Visual | **PASS for Product Owner candidate review** | NOVA remains cohesive and credible across the inspected Arabic/English normal screens and state boards. This is not final identity or product acceptance. |
| Functional UX | **PASS for the bounded specimens** | Task, source, time, privacy and recovery meanings remain equivalent. Five observed issues are closed below. No actual retrieval, booking, clinical action or authority enforcement is demonstrated. |
| Technical | **PASS within the executed specimen matrix** | Independent browser checks and reviewed final evidence support this verdict. Native zoom, real assistive technology, devices and other engines remain NOT TESTED. Final committed-head CI is a separate delivery check. |

No unresolved observed defect requires another specimen revision before owner review. Technical success does not establish the visual or functional verdicts, and none approves Brand V2, a Design System freeze, or implementation.

## Basis and visual quality

I read the current brief, governance and relevant accepted UX/IA/content/Arabic/privacy references. I independently verified main **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`** and PR #93 **DRAFT/OPEN/unmerged** at **`459037baa0d7c2e67fd95715bfca7999592dfd45`**. Its actual HTML/CSS, two original captures, rationale, writing note, validation and prior review are the sole candidate reference.

I inspected all four normal full-page PNGs and both actual state-board PNGs. The final Arabic normal-image hashes match the pinned Ref04 images exactly. Boards disclose that they contain complete affected-region excerpts at a 390px viewport; they do not pretend to be full pages.

The dark canvas, related plum surfaces, restrained lime action, asymmetric corners, framed navigation and coherent functional icons retain NOVA's identity. Arabic typography remains fluent and well spaced. English uses a compatible hierarchy and readable source attribution rather than forcing Arabic line lengths. Appointment identity, date, start/end time and next action lead; secondary destinations remain recognizable and separate. The six states use the same surface language without turning failure or unavailable information into a decorative success state.

There are nonblocking visual reservations. At English 390px, the year sits on its own date line and confirmation takes a second row; source headings also occupy more lines than Arabic. This adds height, but does not lose meaning. Quick destinations remain low on both phones, and the familiar paired source panels and orbit do not by themselves establish a complete distinctive brand. The current sample supports candidate review, not claims about native-device comfort, measured patient comprehension or a reusable identity across five portals.

## Functional UX and bilingual parity

The same synthetic Salma Hassan / سلمى حسن, Dr Omar Ali / د. عمر علي, official **Nile Care Clinic**, Thursday 12 November 2026, and independent 5 November source dates remain. The natural Arabic **2:30 مساءً / لحد 3:00 مساءً** and English **2:30 PM / to 3:00 PM** retain the exact offset-bearing instants, **12:30–13:00Z**, 30 minutes and `Africa/Cairo`. Main surfaces avoid unnecessary technical zone notation; existing detail identifies clinic time in Cairo. This follows the current scoped owner amendment, without changing stored time or signed clinical text.

Professional Egyptian Arabic stays direct and respectful. Accepted primary and secondary task labels retain their meanings. The recommendation explicitly is not a reservation; missing linkage remains qualified “here.” Released summary and follow-up remain independent, with doctor/date attribution. Booking alone grants no clinical access; the existing detail retains patient permission and doctor acceptance for a new care request. History is bounded and prescriptions unavailable in this preview.

Loading removes appointment confirmation and facts; successfully empty available appointment information offers Find care; failed reads preserve uncertainty and offer read-only recovery. No-shared and unavailable regions contain no source actor, date, identifier, count or private/draft hint. They do not infer that no clinical record exists or that an unreleased source exists. Independently available shared sources can remain while appointment reads load or fail. Actions open explicitly disconnected preview explanations; retry never simulates a successful service or reissues a clinical command.

Privacy evidence is limited to the rendered synthetic projection. Raw static HTML/JS contains normal fixture material. This is not protected-payload redaction or server-authorization proof.

## Findings and verified closure

Severity below describes the bounded specimen impact, not a new foundation-severity classification.

| ID / severity | Reproduction and observed impact | Correction independently verified |
| --- | --- | --- |
| FX01 — Medium | Delay deferred `specimen.js` on unavailable/loading/error routes: initial normal source facts were visible before the requested state. | Hidden/inert initial shell until projection is ready. Eight stalled-script cases across both locales plus two JavaScript-disabled checks show only safe localized preparation/fallback. |
| TX01 — Medium | English normal, 320px/computed 200%: `#followup-title` was 40px text, client width 250px versus scroll width 276px. | Content-safe heading wrapping, without truncation or rewritten copy; enlarged narrow text is available. |
| TX02 — Low | English confirmed states, 320px/computed 200%: decorative `.calendar-month` reached x334.64, creating a 335px document. | Bounded wrapping month; all six English states independently retested at 320px/200% now have 320px document width and no sampled essential clipping. Complete semantic date remains. |
| FX02 — Medium | At 320px/root 200%, native focus on the final close button opened long details scrolled past appointment context; English scrollTop was 1610px. | Initial heading focus and scrollTop 0. Both locales show the title inside the dialog, no horizontal modal overflow, and preserve Tab/Shift+Tab, Escape and opener return. |
| FX03 — Medium | Author's final harness exposed a queued close handler stealing newer focus, opening the previous destination. | Guarded fallback cannot override a newer outside control or open modal. Independent rapid keyboard testing covered 42 actions with requested-title assertions, plus forced old-close/new-open sequencing in both locales; no mismatch or focus theft. |

## Technical evidence and limits

Independent Chromium **154.0.8037.57** checks covered normal AR/EN at 1440/768/390px and 320px with computed doubled text; I then repeated the corrected six English states at narrow doubled text. Used fonts, direction, one H1, exact time semantics and reduced-motion behavior were correct. No page errors or external requests were observed. Unused Arabic font faces on English pages are not font failures.

I inspected all 12 locale/state accessibility trees: named controls, one main, loading busy semantics with an outside status region, and error alert semantics. I tested 22 normal/state dialog actions before the final rapid-sequence check, visible 3px focus, and enlarged dialogs in both languages. Accessibility-tree inspection does not prove spoken announcements or real screen-reader operation.

The final author evidence reports **96 passing layouts** (two locales × six states × four widths × normal/root 200% text), measured 2× text ratios, **18 keyboard cases / 86 actions**, minimum visible target dimension **48px**, and no final overflow, sampled essential clipping, runtime/console error, failed response or external request. Contrast sampling has **6,396 observations**, text minimum **7.05:1**, icon minimum **6.46:1**, and explicit focus/selection/action-fill pairs passing 3:1. Decorative exclusions are documented; this is not pixel-complete WCAG certification. Normal/reduced-motion and initial-render evidence are also explicit.

**NOT TESTED:** native browser zoom, Firefox/WebKit/Safari, real screen readers or announcement timing, physical devices/touch/glare/OS settings, native Egyptian editorial or participant comprehension, actual backend/privacy integration, wider portals and broad Design System completeness. Computed enlargement is not native zoom. These gaps remain later acceptance work.

## Logo gate, provisional system fit and preservation

I audited [the recovered logo gate](NOVA_BRAND_LOGO_NEXT_GATE.md), the roadmap, current-status and source-index changes. They correctly retain historical A/B/C and six unselected D/E/F concepts, the unapproved NOVA text wordmark, exact **EgyHealth 360** naming, and no invented approved Arabic spelling. The next separately authorized sprint requires three original concepts, symbol/wordmark, dark/light/mono, actual 16/24/32px, favicon/app-icon, bilingual context, typography/icon relationships, vectors/provenance/licenses, similarity/trademark risks and an owner selection package. No current logo creation follows.

**Final Brand V2 remains BLOCKED until the owner separately reviews and approves the actual logo/identity proposal. Design System V2 cannot freeze before that decision.** The roadmap preserves: Patient Candidate Validation → Logo/Brand Exploration → Owner Brand V2 Decision → Design System V2 → Final Design Acceptance → Authorized Multi-Portal Design/Frontend Execution. Candidate validation and CI cannot bypass those gates.

The README's provisional system-compatibility assessment is appropriately bounded: semantic HTML, logical direction rules, local typefaces, source/status patterns and coherent icons are useful inputs, not final tokens/components. I confirmed existing-path changes are confined to the three authorized governance documents. The preservation inventory reports 1,420/1,423 pre-existing files identical, with exactly those exceptions; six copied CSS/font/license assets match pinned #93. No production, accepted clinical contract or historical-evidence change is present. PR #93 remains unchanged at recheck.

Loading mode is **EXPLICIT_AUDITED_PLAYBOOK_LOADING** from pinned #89/#87 resources; native activation and S1 completion are unproven. No new paid tool, asset, API or dependency was used in my review. Required exact-final-HEAD CI and the new Draft PR's final state belong in the author's delivery evidence. Owner candidate acceptance/refinement is the next decision; no automatic logo sprint, final system, implementation, merge or deployment is authorized.

## Reviewed final PNG fingerprints

SHA-256, relative to this directory:

| Artifact | Fingerprint |
| --- | --- |
| `evidence/normal-ar-390-full.png` | `07a19d005361088e3263f34fc498af62e1f2de4e2463b494294f6b8bfa10bb89` |
| `evidence/normal-ar-1440-full.png` | `a564a11cc03211228e6387622e5f1658d658b092271b1fe6991211120c5077b9` |
| `evidence/normal-en-390-full.png` | `9ea1720024bde70cc731be98b4c532dcb3cfe0cb5cacf4de69f0f1ba136c3bd0` |
| `evidence/normal-en-1440-full.png` | `73a17879bb00f037d017f5cc9959d9631dd81f9929e2b2f8d5521a8e88acc269` |
| `evidence/states-ar.png` | `d164fe576262db1fdc0b47e4a438cfa774cf24158c723e8774518a91bbe1154e` |
| `evidence/states-en.png` | `fa25695c58ae4bdbc8c0adb14903094a4172410c8fa923eac2310efb701a1716` |
