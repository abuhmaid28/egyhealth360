# NOVA EVOLUTION — refinement 03

One Arabic Patient My Care design proposal for Product Owner review, responding to the five explicit critiques of PR #91. NOVA remains the selected direction for this bounded refinement. This is not final branding, Design System V2, production frontend, or finalist validation.

## Visual artifacts

- [Full Arabic mobile, 390px](evidence/refined-ar-390-full.png)
- [Full Arabic desktop, 1440px](evidence/refined-ar-1440-full.png)
- [One before/after comparison against PR #91](evidence/before-after.png)

The board contains complete original and refined captures: desktop displayed at 50%, phones at 100%. Nothing is cropped. Original screenshot bytes are read directly from pinned PR #91; [source fingerprints](evidence/comparison-sources.json). The owner can review the PNGs without installing anything.

## Compact rationale

| Owner concern | Change and reason |
| --- | --- |
| Weak doctor monogram | Removed `ع ع`. A custom decorative stethoscope sits in a vertically shaped identity marker beside the full name and clinic. It denotes a doctor; it does not imply verified credentials or create a new status. |
| Rigid surfaces | Larger curved caps, a restrained smaller return corner, shaped icon containers and rounded action frames replace the small rectangular controls. Related proportions recur at different scales, with fine borders and modest depth. |
| Navigation became plain text | Both accepted destinations regain filled, bordered control surfaces inside a shared navigation frame. The current page has a pale lavender face and dark text; the other destination keeps a visible border. Native link/button semantics, active-page meaning, keyboard focus and RTL order remain. |
| Oversized white shared-care area | Removed the large pale background. A heading on the canvas introduces two independently attributed source surfaces: warmer plum for follow-up, quieter charcoal plum for the released summary. Each retains its own message, date and adjacent action. |
| Dark/light disconnect | Appointment, source surfaces, identity marker, navigation and actions now share the same plum family, corner logic, fine rules and framed arrows. Pale lavender is concentrated in controls. Lime still prioritizes the appointment action; provenance uses legible quieter text. |

Source prose is 16px; phone source states are 13px and source dates/privacy are 14px, increased from the previous 11–12px secondary text. No text is reduced to shorten the page. The phone is consequently **2002px tall versus 1781px** in PR #91; quick destinations remain below the source material. This is an explicit readability/scroll tradeoff, not a measured usability improvement.

## Compact visual-language note

NOVA retains its dark digital appointment, orbital date and luminous primary action. Its additional motif is a curved cap with a smaller return corner: 26–32px surface curves, 7–16px return corners, and smaller related action/icon shapes. Double rules introduce the appointment and shared sources. The shared-care header stays on the canvas, while two tonal source surfaces preserve independent meanings without a timeline. Framed navigation gives the accepted destinations visible presence. The doctor's decorative instrument marker uses the same shape family; the full name and clinic remain the actual identity. These are implementable specimen decisions for owner review, not frozen system tokens.

## Verified baseline and scope

- Repository: `abuhmaid28/egyhealth360`; verified main/base **`5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`**. Main CI [42165554605](https://github.com/abuhmaid28/egyhealth360/actions/runs/42165554605) was SUCCESS at that SHA.
- Visual baseline: [PR #91](https://github.com/abuhmaid28/egyhealth360/pull/91), **`e760ed4332ffca876702b32f6ffd4b1787d20783`**, verified DRAFT/OPEN and preserved.
- New isolated branch: `design/72-nova-evolution-refinement-03`, starting from main rather than stacking or modifying PR #91. Final HEAD, Draft PR and exact-head CI are recorded in the remote PR handoff.
- Authority: direct Product Owner brief, “NOVA EVOLUTION REFINEMENT 03”, 7 November 2026. Current issue #72, PR #91 and recent repository/PR state were checked for applicable supersession. Older broader exploration requirements yield only to this one-version, Patient-only scope.
- Accepted UXD10–UXD16, IA01–IA05/Patient B and CD01–CD07 remain binding. All original visible body copy is preserved, excluding only the removed doctor initials and specimen revision label. Preview JavaScript is byte-identical to PR #91.

Same synthetic سلمى حسن / د. عمر علي / Nile Care Clinic; confirmed 12 November 2026, 14:30–15:00, Cairo UTC+02:00. Follow-up and released summary remain separate, dated 5 November; no linked follow-up appointment is inferred. Booking/access explanation, bounded history and unavailable prescriptions remain explicit. No new clinical content, hidden source, live operation or service is introduced.

## Loading mode and provenance

**EXPLICIT_AUDITED_PLAYBOOK_LOADING**. All eight pinned resources were explicitly read before authoring; native activation is not verified or claimed. [Exact file hashes and baseline-resource hashes](evidence/provenance.json).

| Pinned source | Exact paths loaded |
| --- | --- |
| PR #89, `0886788bd6b395bb7cace8653ffe280da68af4b8` | `docs/zero-cost-design-pilot/PLAYBOOK.md`; `AUDIT.md`; `vendor/basic-ux-excerpts.json`; `vendor/upstream-lock.json`; `vendor/LICENSE` under that same directory |
| PR #87, `b3eb9543a58d571968a16168d3492bf817792cb4` | `.agents/skills/eh360-visual-exploration/SKILL.md`; `.agents/skills/eh360-visual-qa/SKILL.md`; `docs/skills-pilot/REFERENCE_MAP.md` |

The pinned playbook's separate reviewer requirement is applied. Its older candidate/role/language counts do not expand this brief. No upstream installer, generator, native activation, S1 efficacy claim or product dependency is introduced. Existing local OFL fonts/notices are retained; CSS/SVG treatments are original. No new paid API, image asset, subscription, credit purchase or deployment is used.

## Review and reproduction

[Independent review](INDEPENDENT_REVIEW.md) separates visual judgment from technical findings. [Technical validation](VALIDATION.md) records the measured checks and limitations. Owner evaluation is the next gate; stop here without automatic finalist validation, brand/system freeze, implementation, merge or deployment.

Serve the repository root on localhost port 8765. With existing Playwright and Chromium, run `node docs/nova-evolution-refinement-03/tools/render.mjs`, then `contrast.mjs`, `motion.mjs`, `comparison.mjs`, and `verify.mjs` from the same tools directory. `SPECIMEN_ORIGIN` and `CHROMIUM_PATH` select existing alternatives for the specimen tests. Comparison uses only localhost and pinned Git image bytes. No app build or backend is needed to reproduce the design artifact.
