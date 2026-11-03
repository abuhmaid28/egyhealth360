# Clinician Patient-DNA premium visual pass

Authority: [PR #80 owner direction 6604240346](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6604240346). This is **one visual-only pass** on the already [approved master / 6603761429](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6603761429), not a product redesign or capability rollout. Pass base: **`e28dbfb652c35ab12ce50496aade7caac0402203`**. PR #80 remains stacked on the unchanged Patient baseline **`f0d94e7e2579dc9bd1e2ef87ba493172b0f4cfb0`**. Keep PR #80 OPEN / UNMERGED / AUTO-MERGE OFF; no deployment.

## Concise visual-change inventory

The only changed product file is [clinician-consultation.module.css](../../apps/web/src/components/clinician-consultation.module.css). **Every pre-existing TypeScript/TSX/MJS file remains byte-identical to the pass base.** No component structure, source, copy, interaction or command changes.

1. **Visit anchor:** compact 104px navy-to-teal Patient-family treatment, white patient identity/current logistics, derived initials and an outlined existing return action. It inherits the approved Patient appointment card's gradient and radius tokens. No hero expansion, portrait, invented demographic or clinical fact. RTL places the navy end behind the right-aligned identity.
2. **Local navigation:** the existing three exact consultation anchors form one connected white surface immediately below the visit anchor. Labels, order, destination and active-section behavior are unchanged.
3. **Authoring priority:** retain the existing connected white outline / flexible center / source rail architecture and exact 1360px desktop grid. No dashboard/KPI cards. Fields retain the Patient family, with explicit teal keyboard focus.
4. **Audience distinction:** restrained navy accents for Private Note; restrained teal accents for Patient Summary. The outline, authoring headings/boundaries and source-state rows agree. Text still identifies exact source, audience and state; color is supplementary.
5. **Source rail:** connected label / strong exact loaded state / secondary purpose rows with restrained separators. Source data and erasure rules are unchanged. Save/sign/release/close independence stays visible at lower hierarchy; no added read, snapshot, metric or clinical overview.
6. **Review dialogs:** inherited white/neutral surfaces, refined spacing, navy heading hierarchy, readable source preview/acknowledgement and teal primary actions. All acknowledgement, focus/cancel, source-preview, busy, retry and submission logic remains unchanged.
7. **Arabic / RTL:** independently checked gradient direction, identity/logistics alignment, local title wrapping, logical source accents/dividers, arrow direction, Latin names and isolated 24-hour time/timezone. Existing Arabic copy and clinical source text remain untouched.

Fonts/tokens come directly from the preserved Patient implementation: **Manrope / IBM Plex Sans Arabic**, existing navy `#0B2545`, teal `#0B6E7F`, teal-dark `#084E5A`, aqua `#14B8A6`, blue `#3B82F6`, canvas `#F7F9FC`, white surface, alt `#F1F5F9`, borders `#E2E8F0` / `#CBD5E1`, ink `#0F172A`, secondary `#475569`, muted `#526178`. No new palette, purple, font assets, logo symbol or design-system freeze. The identity remains **EgyHealth 360 text only**.

## Complete fresh evidence package

[Before/after board](clinician-premium-evidence/review.png) · [Navigable board](clinician-premium-evidence/review.html) · [Capture checks / source hashes / build ID](clinician-premium-evidence/after/checks.json) · [PNG provenance and SHA-256 manifest](clinician-premium-evidence/capture-provenance.json) · [Exact pass inventory / preservation](clinician-premium-evidence/preservation.json).

**41 fresh PNGs:** four fresh before captures, 36 fresh after captures and one before/after board. Existing Patient and original Clinician evidence is preserved at its original paths. The approved [Patient desktop reference](polish-evidence/patient-my-care-desktop-en.png) is unchanged.

| Evidence | English | Arabic / RTL |
| --- | --- | --- |
| Desktop 1600×1000 | [EN](clinician-premium-evidence/after/desktop-en.png) | [AR](clinician-premium-evidence/after/desktop-ar.png) |
| Full page | [EN](clinician-premium-evidence/after/full-en.png) | [AR](clinician-premium-evidence/after/full-ar.png) |
| 1280px structure | [EN](clinician-premium-evidence/after/1280-en.png) | [AR](clinician-premium-evidence/after/1280-ar.png) |
| 200% text | [EN](clinician-premium-evidence/after/text-200-en.png) | [AR](clinician-premium-evidence/after/text-200-ar.png) |
| Keyboard focus | [EN](clinician-premium-evidence/after/focus-en.png) | [AR](clinician-premium-evidence/after/focus-ar.png) |
| Release review | [EN](clinician-premium-evidence/after/release-review-en.png) | [AR](clinician-premium-evidence/after/release-review-ar.png) |
| Close review | [EN](clinician-premium-evidence/after/close-review-en.png) | [AR](clinician-premium-evidence/after/close-review-ar.png) |
| Close review — acknowledged, enabled teal action | [EN](clinician-premium-evidence/after/close-review-ready-en.png) | [AR](clinician-premium-evidence/after/close-review-ready-ar.png) |
| Signed private / released summary | [EN](clinician-premium-evidence/after/signed-en.png) | [AR](clinician-premium-evidence/after/signed-ar.png) |
| Closed lifecycle / signed sources | [EN](clinician-premium-evidence/after/closed-en.png) | [AR](clinician-premium-evidence/after/closed-ar.png) |
| Authentication bootstrap | [EN](clinician-premium-evidence/after/boot-en.png) | [AR](clinician-premium-evidence/after/boot-ar.png) |
| Loading | [EN](clinician-premium-evidence/after/loading-en.png) | [AR](clinician-premium-evidence/after/loading-ar.png) |
| Error | [EN](clinician-premium-evidence/after/error-en.png) | [AR](clinician-premium-evidence/after/error-ar.png) |
| Access redaction | [EN](clinician-premium-evidence/after/redacted-en.png) | [AR](clinician-premium-evidence/after/redacted-ar.png) |
| Empty source selection | [EN](clinician-premium-evidence/after/empty-en.png) | [AR](clinician-premium-evidence/after/empty-ar.png) |
| Independent follow-up | [EN](clinician-premium-evidence/after/follow-up-en.png) | [AR](clinician-premium-evidence/after/follow-up-ar.png) |
| Uncertain private command / explicit retry | [EN](clinician-premium-evidence/after/uncertain-en.png) | [AR](clinician-premium-evidence/after/uncertain-ar.png) |
| Long entered content | [EN](clinician-premium-evidence/after/long-en.png) | [AR](clinician-premium-evidence/after/long-ar.png) |
| Fresh approved-master before / desktop | [EN](clinician-premium-evidence/before/desktop-en.png) | [AR](clinician-premium-evidence/before/desktop-ar.png) |
| Fresh approved-master before / full page | [EN](clinician-premium-evidence/before/full-en.png) | [AR](clinician-premium-evidence/before/full-ar.png) |

## Provenance and preservation

Before images were freshly captured from a production build of the exact approved `e28dbfb` product source, before editing its CSS. The capture guard rejects a different before source. After images were captured from a fresh production build of the actual `/doctor/consultation/:bookingId/documentation` route, with unchanged controlled synthetic HTTP projections through current Live adapters. Both sets include runtime source hashes and build IDs. No preview route or fixture flag was added to product runtime.

Patient name / provider / clinic, booking/consultation lifecycle, event timestamps and timezone, saved/signed/released source facts, allergy uncertainty, summary and follow-up content all come from the **unchanged existing browser fixture** described in the [original implementation provenance](CLINICIAN_ACTIVE_CONSULTATION_IMPLEMENTATION.md#visible-value-provenance). Long narratives are explicitly synthetic human-entered stress text. Structural labels are unchanged current interface copy. No MRN, age, sex, diagnosis suggestion, vitals, medicines, prescription/lab/results tab, clinical tools, AI, clinical measurement or unsupported destination is added or implied.

Controlled screenshots prove presentation, not production data, real backend persistence, medical accuracy or deployment parity. Real persistence/runtime evidence is provided separately by the unchanged required CI gates.

The preservation checker compares every existing file outside the scoped CSS and four current-document updates to exact base bytes, including **124 Patient evidence files**, **43 original Clinician evidence files**, all Patient implementation/fonts/tokens, all TS/TSX/MJS source, API/adapters, clinical/auth/authorization/privacy machinery, routes, operation keys, retry/source visibility, backend/OpenAPI/DB/schema/migrations, other portals, dependencies, CI and hosting. It binds both before and after captures to their actual runtime sources. No earlier evidence/report is overwritten.

## Validation and review limits

Production build, standalone route/TypeScript check, frontend/support lint, all **162 existing UI tests**, full existing browser regression (including Clinician focus/reflow/redaction/unchanged retry checks), capture assertions and exact-base preservation are the local gates. Exact final head and required remote CI result/duration are recorded in PR #80 and the final handoff, avoiding a self-referential evidence commit.

Capture assertions verify 1600px grid/anchor geometry, exact local anchors, inherited colors/type, RTL direction, Latin-digit/24-hour timezone values, 1280px and 200% text overflow, keyboard outline, source-purpose distinction, release preview excluding private content, independent close acknowledgement, visible return control without dialog scrolling, enabled teal confirmation after acknowledgement without a mutation, explicit single-mutation uncertainty recovery, long text preservation and rail erasure on error/redaction. Author visual inspection covers actual desktop, reflow, dialogs, focus, signed/closed and before/after PNGs. Static/Chromium evidence does not certify cross-browser/native-device/assistive conformance or independent Arabic usability.

Intentional differences: the compact anchor is now dark, directly joined to the light task surface, as explicitly directed by comment 6604240346. This supersedes the earlier white-ribbon visual treatment only. The three-plane architecture, utility header, supported destinations, lower workflow scope and all product/security/clinical behavior remain intact. CLOSED still does not create a new blanket write prohibition beyond existing source/authority contracts. No mobile Clinician redesign is authorized or introduced.

No new P0/P1 foundation defect is established. Existing integration, native/assistive/participant and deployment-parity limits remain. The original master was approved; this **new bounded premium pass requires visual review**. No wider rollout, Final Brand/logo/Design System freeze, merge or deployment follows from technical Green.

Reproduce with the normal production frontend build and a local server at 127.0.0.1:3235: `node scripts/capture-clinician-premium.mjs`, `node scripts/check-clinician-premium-preservation.mjs`, the existing UI/browser/type/lint/doc gates and required exact-head CI. `CLINICIAN_CAPTURE_PHASE=before` requires the untouched approved-master product source. Node `24.21.0`, pnpm `10.34.6`; no dependency policy change.
