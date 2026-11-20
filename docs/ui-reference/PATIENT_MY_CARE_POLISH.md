# Patient — My Care final optical pass

Authority: the Product Owner's latest instruction in this chat accepts the current composition and authorizes **one final micro-polish pass only**. Base: `47fa8e8bafaac1b96d4ba0065a65250f80448156`. The [independent structural/technical pass](https://github.com/abuhmaid28/egyhealth360/pull/79#issuecomment-6592405825) is preserved. Main remains `0a0e9c2038ecad420e95c2c67ae367129e195839`. Final visual sign-off is **PENDING**; no wider rollout, Final Brand/logo selection, deployment or merge is authorized.

## Bounded optical changes

1. **Shortcut typography:** normal word boundaries, no arbitrary wrapping or hyphenation. Mobile labels remain 12px, with slightly more usable internal width and a small Latin tracking adjustment. “Appointments” remains one intact word; Arabic uses balanced natural wrapping and more side clearance. At 390px all four destinations remain in one row, with at most two label lines. Narrow and enlarged-text layouts retain content through reflow.
2. **Bottom navigation:** common icon and first-label-line tracks, more deliberate icon/text spacing, normal word wrapping and balanced labels. Full accepted names, routes and accessible meanings remain unchanged; no abbreviated name is introduced. Controls retain at least 44px targets. At 320px and 200% text, navigation can use two rows instead of splitting words.
3. **Demo transparency:** move the exact existing synthetic-data disclosure from the greeting into low-hierarchy metadata under the closed Demo options utility. Original role/state controls and Escape recovery remain. Live retains its existing Live indication and renders no Demo indication, utility or fallback.
4. **Mobile header:** smaller language utility type within the original accessible targets, a little more separation from the account target and a quieter, proportionate account circle that also scales with enlarged text. The existing textual brand leads; no identity change.
5. **Mobile footer:** compact copyright metadata above aligned sign-out and Demo utility controls. Logical alignment works in RTL, and font-relative utility columns reflow at enlarged text sizes rather than squeezing labels.

## Preserved accepted composition

The useful desktop width remains **1360px**, with the original centered header/main grid, approximately **8:4** top row and **24px** gap. Appointment height remains exactly **210.53px EN / 216.53px AR**, with unchanged hierarchy, facts, initials, timezone/access boundary and CTA. The connected full-width quick-access surface and structured full-width recent-care list are retained. No desktop structure, core type, palette, RTL architecture, destination, data semantics or product/security behavior changes.

## Fresh evidence

| Evidence | English | Arabic RTL |
| --- | --- | --- |
| Mobile 390×844 | [EN](polish-evidence/patient-my-care-mobile-en.png) | [AR](polish-evidence/patient-my-care-mobile-ar.png) |
| Full mobile | [EN](polish-evidence/patient-my-care-mobile-full-en.png) | [AR](polish-evidence/patient-my-care-mobile-full-ar.png) |
| Desktop 1600×1000 | [EN](polish-evidence/patient-my-care-desktop-en.png) | [AR](polish-evidence/patient-my-care-desktop-ar.png) |
| 320px | [EN](polish-evidence/patient-my-care-320-en.png) | [AR](polish-evidence/patient-my-care-320-ar.png) |
| 200% text | [EN](polish-evidence/patient-my-care-text-200-en.png) | [AR](polish-evidence/patient-my-care-text-200-ar.png) |

[Rendered optical/geometry checks](polish-evidence/optical-checks.json) · [Scope inventory/preservation proof](polish-evidence/scope-checks.json).

These are fresh captures of the production-built frontend with the existing synthetic fixture. Viewport captures retain real sticky bottom navigation. Full reading exports temporarily make navigation static to avoid an export overlay; this does not alter product behavior. Text proof doubles computed font sizes without changing the viewport. Earlier evidence/reports remain unchanged.

## Optical QA and validation

Actual EN/AR screenshots were inspected at their normal scale for word breaks, label/first-line baselines, icon/button centering, divider/padding alignment, selected surfaces, directional arrows and unintended visual mass. The screenshot/DOM checks verify intact words, maximum two-line 390px shortcut labels, four equal destinations in one row, retained touch targets, no 320px/200% horizontal overflow and exact desktop appointment dimensions. Existing keyboard focus/hover, state, Demo utility and Live-isolation checks remain in the full browser suite; the new assertions also run in remote frontend CI.

Production build, frontend ESLint, TypeScript, **162 UI tests** and the full existing browser regression are the local validation gates. Required exact-head remote CI and resulting head are recorded in PR #79 and the final handoff to avoid a self-referential evidence commit. CI proves technical validation, not visual sign-off.

Product edits are confined to `patient-my-care.tsx` and its local CSS module. Supporting changes are the existing My Care browser checks, a focused capture/scope script and current scope/index documents. Copy, font files, root tokens, data/read/state/session logic, appointment/next-action/shortcut/recent-care behavior, original references, prior reports/captures, other Patient routes and all other workspace implementations remain unchanged. Backend/API/OpenAPI, database/schema/migrations, security/authorization, CI policy and hosting/deployment remain byte-identical to the base.

No new blocking semantic issue is established. Existing Live integration, native-device/cross-browser/assistive coverage and independent Arabic acceptance limits remain unchanged. The owner accepts the composition; **final optical visual sign-off remains pending**. Keep PR #79 **OPEN / UNMERGED / AUTO-MERGE OFF**. No deployment.

Reproduce after normal production build with `MY_CARE_ORIGIN=http://127.0.0.1:3222 node scripts/capture-patient-my-care-polish.mjs`, `python3 scripts/check-patient-my-care-polish-scope.py` and the existing UI/browser/doc gates. Start the local production frontend at that origin first. No dependency or CI policy changes are required.
