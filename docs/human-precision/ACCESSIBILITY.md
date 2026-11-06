# Accessibility evidence and limits

**Target: WCAG 2.2 AA. This is measured browser evidence for an isolated proposal, not a conformance certification or user-study result.** [Machine browser evidence](evidence/browser-results.json), [artifact integrity](evidence/artifact-checks.json), [full screenshot inventory](evidence/screenshot-sha256.json).

## Contrast matrix

Relative sRGB luminance per WCAG, ratios rounded to two decimals. Small text uses 4.5:1 rather than relying on a large-text exception; meaningful control/focus boundaries use 3:1. Decorative dividers are not used as the sole control boundary. Brand and clinical semantics remain separate.

| Role | Foreground | Background | Ratio | Threshold | Result |
| --- | --- | --- | ---: | ---: | --- |
| Primary text / surface | `#102A38` | `#FFFFFF` | 14.89:1 | 4.5:1 | PASS |
| Muted text / canvas | `#4E626B` | `#F5F7F7` | 5.95:1 | 4.5:1 | PASS |
| Muted text / subtle | `#4E626B` | `#EAF0F1` | 5.55:1 | 4.5:1 | PASS |
| Action / white | `#155E63` | `#FFFFFF` | 7.46:1 | 4.5:1 | PASS |
| White / H anchor | `#FFFFFF` | `#153F47` | 11.45:1 | 4.5:1 | PASS |
| White / P action | `#FFFFFF` | `#145C78` | 7.42:1 | 4.5:1 | PASS |
| P text / source wash | `#193E52` | `#EAF1F4` | 9.93:1 | 4.5:1 | PASS |
| Warning / warning wash | `#765000` | `#FFF4D8` | 6.57:1 | 4.5:1 | PASS |
| Success / success wash | `#235D45` | `#E9F4ED` | 6.84:1 | 4.5:1 | PASS |
| Error / canvas | `#AF2F38` | `#F5F7F7` | 5.94:1 | 4.5:1 | PASS |
| Control border / white | `#71858D` | `#FFFFFF` | 3.86:1 | 3:1 | PASS |
| Focus / white separation | `#102A38` | `#FFFFFF` | 14.89:1 | 3:1 | PASS |
| White focus separation / H anchor | `#FFFFFF` | `#153F47` | 11.45:1 | 3:1 | PASS |

The rendered-text pass samples actual computed foreground/background pairs from visible text/fields across all product screens, review boards and eight states in both languages, including the dialog. It records 590 observations / 38 unique enabled text pairs; the lowest observed enabled-text ratio is **5.55:1**, with zero observations below 4.5:1. Disabled controls are identified separately and excluded from the AA text assertion; their unavailability also has a visible text explanation. The matrix above additionally checks control and focus boundaries. Sampling is a useful check, not a full automated WCAG audit: it does not prove every pseudo-element, platform control or assistive announcement.

## Actual verification

- Chromium, local existing fonts, device scale 1; all external browser requests blocked. Exact browser version is recorded in JSON. No browser exception, failed asset request, network mutation or Live application connection.
- Twenty product specimens × 1440, 768, 390 and 320px: 80 normal layout cases, AR and EN for both finalists/all five roles.
- All twenty product specimens at 200% computed text size at **both 390 and 320px**: 40 stronger combined enlargement/narrow cases. Eight primary Patient/Clinician screens also use a 720px CSS viewport as the reflow geometry corresponding to a 1440px viewport at 200% zoom. This is a browser-zoom geometry analogue, **not a claimed native-browser zoom test**.
- Eight critical states in both languages at 768/390/320: 48 cases. Typography, system and review/comparison boards add 16 cases. Total **192** measured layouts: zero document horizontal overflow, measured offscreen content, clipped-text boxes or failed font loads after the final fixes.
- **105** named PNG exports: viewport captures, full desktop/mobile reading exports, sixteen full enlarged-text exports, typography/mark/system/review boards, two dialog proofs, eight critical-state proofs and an anchor focus proof. The inventory supplies each viewport and whether the capture is full-page.
- Keyboard checks cover all eight primary Patient/Clinician screens: skip link reaches main, visible focus uses a 3px solid ring. Dialog tests in AR/EN cover keyboard open, trapped Tab focus, Escape dismissal and focus return. Desktop clinician context remains visible when scrolling to summary.
- The component gallery exercises all eight state choices; exactly one panel is visible. Local field submission associates error text, sets `aria-invalid`, moves focus to the invalid field and announces a successful **local validation only**, explicitly without saving data. Density changes measured row spacing. On 390px product screens, enabled main buttons measure at least 44×44px; primary controls target 48px.
- Calendar-day numerals retain one line at 320px/200% text; source metadata takes full-width rows rather than cramped columns. Actual `Africa/Cairo` IANA formatting verifies both 29 October 2026 23:30 occurrences: UTC+03:00 and UTC+02:00. The ambiguous range stays chronological in an isolated LTR container, with a date/offset at each endpoint. Production date helpers are untouched.
- Static integrity checks verify one primary heading, `lang`/`dir`, image alternatives, unique IDs, associated field labels, local references, token alias existence/type/cycles, deterministic generation and screenshot hashes.

## Critical-state coverage

| State | Evidence / behavior | Safety boundary |
| --- | --- | --- |
| Loading | Stable placeholder plus loading text/status | Never “no appointments” until a successful empty read |
| Empty | Explicit no upcoming appointments; useful continuation | Not a service failure; no claim about complete history |
| Success | A named signed/released summary source and actor/time | Specimen selection only; does not simulate a mutation success |
| Field error | Visible problem + associated field + focus | No color-only error; authored medical content is not normalized |
| Access denied | Privacy-safe unavailable content notice | No patient name/reference/count or Admin bypass |
| Service/operation unavailable | Capability explanation and disabled control | No false empty list or automatic Demo fallback |
| Uncertain outcome | Exact-operation/source recovery explanation | No new signing key, automatic retry or invented success |
| Ambiguous time | Both repeated instants with actual offsets; chronological LTR range | Same clock text cannot silently identify two instants |

Inspect [Arabic gallery](specimen-ar.html), [English gallery](specimen-en.html), [Arabic focus proof](evidence/focus-anchor-ar.png) and [long Arabic/text-enlargement evidence](evidence/h-patient-ar-text-200.png). The long Arabic specimen contains no patient data; all names and medication quantities are synthetic. Quantity is explicitly not a dosage.

## Limits and remaining review

Author inspected actual desktop Patient/Clinician, phone Patient/Clinician, type/marks and the review board, plus enlargement/critical-state proofs. This is author visual QA, **not independent Product Owner approval**. No independent reviewer is assigned by this sprint and no independent PASS is claimed.

Not tested: native screen-reader announcements/reading experience, native browser zoom, Windows High Contrast/forced colors, Safari/Firefox/mobile hardware, real clinical tasks, participant trust/preference/efficiency, native Egyptian editorial acceptance, legal/recognition clearance or full WCAG conformance. No production/backend/privacy performance is inferred from a static gallery. Reduced-motion rules are active in captures; there is no automatic animation. Final coded components require focused semantic/assistive testing and visual regression after owner selection.

No runtime build/integration suite is claimed locally: product code is byte-identical, and this package does not run the product. Required existing remote CI runs unmodified for the final PR; its exact-head result is recorded in the PR handoff separately from design acceptance.
