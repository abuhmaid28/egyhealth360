# Browser QA and delivery limits

**Refinement delivery:** [new Before/After evidence, measurements, rerun QA and owner stop](REFINEMENT.md). The original 18 PNGs and reports below remain historical evidence at `87535bb1682b934ec90ed6bff9e66ba3140e331d`; they are preserved unchanged. Current scripts write new reports under `evidence/refinement/` and do not overwrite the originals.

## Reproduce

From repository root, with the repository's existing Playwright installed:

```sh
python docs/design-system-v2/staff-admin-pilot/prepare-reference.py
python -m http.server 8768 --bind 127.0.0.1 --directory docs/design-system-v2/staff-admin-pilot
```

Open `http://127.0.0.1:8768/gallery.html`. Controls are outside the specimen; use “Open selected specimen” for natural browser width. The gallery's wide iframe can deliberately scroll inside its review viewport. For automated reproduction supply `AXE_PATH` to axe-core 4.10.3's `axe.min.js` (temporary tooling only, no project dependency) and optionally `CHROMIUM_PATH`:

```sh
node docs/design-system-v2/staff-admin-pilot/verify.mjs
node docs/design-system-v2/staff-admin-pilot/supplemental.mjs
node node_modules/eslint/bin/eslint.js docs/design-system-v2/staff-admin-pilot
node scripts/ci/check-docs.mjs
```

Original `.reference/` contains nine ignored, verified immutable logo/font/OFL inputs. No external requests are required to render once prepared. Input fetch uses local git blobs, falling back to authenticated GitHub API only for preparation. Source hashes: [provenance](evidence/source-provenance.json). No API/login, PHI, persistence, service worker, install prompt or confirmed clinical write exists.

## Executed results

[Machine-readable browser report](evidence/qa-results.json): **60/60** main cases = 3 roles × AR/EN × Dark/Light × 320/390/768/1024/1440. All fit without horizontal document overflow, use expected locale/direction and local GET assets only. **12/12** cases at 390 with root text 16→32px (200%); **32** alternate-state/theme cases at 320 covering empty, unavailable, error, uncertain, history, Admin organization and accepted Pharmacy; no overflow. This is text scaling, not native browser zoom.

**24 axe audits** (all roles/locales/themes at 390/1440), WCAG A/AA tagged rules including 2.1/2.2 where supported: zero violations in the measured states. Incomplete/manual findings remain in JSON. Axe passing is not WCAG certification. **12 dialogs** open with keyboard Enter, Escape returns to the trigger, no non-GET request. [Supplemental report](evidence/supplemental.json): 12 keyboard sequences (skip link first and visible focus), 12 long-label cases, 12 text-spacing overrides, 12 opened-disclosure cases, reduced-motion and forced-colors emulation, 13 safe/history payload-absence checks, gallery controls/link parity. Emulator checks do not prove physical platform access.

**28 measured theme pairs**, from actual computed CSS in browser: text 4.5:1 minimum, meaningful control boundaries/focus 3:1 minimum. Both themes test canvas/surface/raised text and secondary text, actions, primary default/hover, control boundary and focus against adjacent planes. All pass; exact ratios are retained in JSON. Thin surface dividers/card edges are decorative grouping, not sole meaningful controls. Apricot dot is decorative. Custom-font glyph use is observed with Chromium CDP for Plex Arabic heading and Inter Latin date, beyond `document.fonts.check`.

## Eighteen genuine Chromium captures

| Workspace | Arabic 390 | Arabic 1440 | Additional review view |
| --- | --- | --- | --- |
| Pharmacy | [Light](evidence/pharmacy-ar-light-390.png), [Dark](evidence/pharmacy-ar-dark-390.png) | [Light](evidence/pharmacy-ar-light-1440.png), [Dark](evidence/pharmacy-ar-dark-1440.png) | [English accepted detail](evidence/pharmacy-en-dark-1440-accepted.png), [320 history](evidence/pharmacy-ar-light-320-history.png) |
| Laboratory — FUTURE | [Light](evidence/laboratory-ar-light-390.png), [Dark](evidence/laboratory-ar-dark-390.png) | [Light](evidence/laboratory-ar-light-1440.png), [Dark](evidence/laboratory-ar-dark-1440.png) | [English mobile](evidence/laboratory-en-light-390-work.png), [768 tablet](evidence/laboratory-ar-light-768-work.png) |
| Admin | [Light](evidence/admin-ar-light-390.png), [Dark](evidence/admin-ar-dark-390.png) | [Light](evidence/admin-ar-light-1440.png), [Dark](evidence/admin-ar-dark-1440.png) | [English organizations](evidence/admin-en-dark-1440-organizations.png), [200% text](evidence/admin-ar-dark-390-work-text200.png) |

These are full browser renders, not composited mockups. Exact SHA-256s/settings and Chromium version are in the browser report. Old #107 screenshots/evidence and original Brand source remain untouched. [Independent visual/authority/provenance review](evidence/independent-review.md) records inspected actual captures and corrections, not merely a review of this author's report.

## Scope and CI receipt

Base: `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`. One branch `design/108-staff-admin-review`, one Draft PR. [Preservation receipt](evidence/preservation.json) inventories changed paths and checks every baseline tracked file outside the allowed gallery plus two governance summaries remains byte-identical. No production/backend/API/OpenAPI/schema/migration/dependency/CI/clinical/privacy/security contract or protected evidence changes. Local focused gallery lint and repository docs/reference/CI-policy checks run; final remote CI must be verified at the exact published head. The Draft PR body/comment is the canonical final-head/run/job receipt, avoiding a self-referential commit hash in this file. Actual heavy-lane selection follows existing classifier; no skipped gate is invented.

**NOT TESTED:** physical Android/iOS, installed PWA, real Safari/Firefox/Chrome/Edge products, native 400% zoom, actual screen reader speech/announcements, OS font scaling/virtual keyboard, physical print/PDF, native Egyptian editorial participants, clinic users, rights clearance, real backend authority/revocation/privacy/concurrency in this gallery, hosted staff UI or deployment parity. Source audit and synthetic UI tests do not replace real PostgreSQL/backend evidence. AP03/AP05 and theme policy remain OPEN. Stop for Product Owner review; technical Green is not visual approval.
