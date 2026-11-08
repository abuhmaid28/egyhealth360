# Dark-first versus Light-first — one brand, owner decision pending

This is a bounded Patient My Care proposal. PR #98 remains unchanged at `732b377ca69ba964498c2153c97fbca664cc538e`. The selected #96 symbol, #97 brand palette/type foundation, original icon vocabulary, and #94 Patient meanings/behavior are preserved. Neither treatment is automatically selected for rollout.

[Actual side-by-side comparison](evidence/comparison.png) · [Four native-size renders](README.md#four-actual-screens) · [Independent findings](INDEPENDENT_REVIEW.md).

| Dimension | PR #98 Light-first | Proposed Dark-first | Assessment / tradeoff |
| --- | --- | --- | --- |
| Identity | Selected turquoise/gold symbol, Nile anchor, light canvas | Exact same symbol and families; dominant Nile-family dark canvas and planes | One brand vocabulary. This changes art direction, not the logo or brand identity. |
| Modern character | Calm, airy, explicit light/dark separation | More immersive, sustained dark environment; turquoise has greater focal emphasis | Dark-first better addresses the owner's requested NOVA character. That is alignment with the brief, not measured user preference. |
| Desktop composition | Full-width horizontal appointment, then a connected white source plane | Vertical appointment stage beside a ruled dark shared-source rail | Material spatial/hierarchy change even without color. Appointment/time receive sustained prominence; shared sources are concurrently visible. Parallel columns can divide attention and need owner judgment. |
| Clinical sources | White content plane, strong environmental contrast | Deeper inset plane, independent source headings, attribution, rules and actions | No disconnected white slab. Dark relies more on tonal edges, spacing and type for separation. Each source still has its own purpose, doctor/date and action. |
| Mobile | Appointment → privacy explanation → shared sources → retrieval | Same accepted task order; framed calendar tile, larger time, related dark planes | Preserves familiar UX and touch behavior. Dark mobile is slightly taller; no claim of faster tasks or reduced scrolling. Exact full-page dimensions are in board-results.json. |
| Readability | Familiar dark text on light for ordinary reading | High-contrast pale text and muted provenance on solid dark surfaces | Executed short-content contrast/reflow checks support usability, not universal comfort. Long clinical text, glare, individual dark-mode preferences and real devices are untested. |
| Interaction | Accessible turquoise primary, outlined dark-teal secondary, dark active nav | Same hierarchy: turquoise primary, quiet outlined secondary, framed dark active nav with turquoise selection edge | Shared semantic roles adapt to dark surfaces. The lighter control-boundary correction improves accessible separation without making a new palette. |
| Bilingual system | Inter / IBM Plex Sans Arabic; consistent original outline icons | Same exact font files/notices and 24-unit / 1.7px icon grammar | Script-specific proportions and logical reading order preserved. Logo is never mirrored. |
| Clinical meaning | Confirmed booking, separate shared summary/recommendation, bounded history | Same exact synthetic facts and byte-identical preview script | Booking grants no clinical access; follow-up is not a booking. No private/draft hint, unsupported record completeness, new drug/lab/AI feature or clinical rule. |

## What was art-directed

The full-width composition was rebuilt as a paired care workspace on desktop. The appointment has an identity zone, a large typographic time stage with a subordinate calendar tile, and one broad primary action. The shared-source group has its own compact reading rhythm and ruled internal separation. Retrieval remains open, with no decorative dashboard metrics or additional generic cards. At tablet/mobile, these regions return to the accepted logical order instead of shrinking a desktop sidebar into the phone.

Nile Night `#0B3D4A` anchors the appointment and shared interaction surfaces; a deeper Nile-family canvas `#072B36`, inset `#09323F` and elevation `#144D5B` create coherent depth. Turquoise-derived action `#48D5C7` is purposeful. Gold stays in the unchanged symbol, small date/eyebrow accents, brand digits and visible focus. No purple/lime, UI gradient, artificial glow, stock medical image or futuristic filler is used. The exact logo's original gradients remain untouched.

This is not a wholesale replacement of #98's component grammar: the typography, icon frames, softened asymmetric corners, explicit source states, labelled actions and preview behavior are deliberately retained. Mobile retains its semantic structure while the visual hierarchy and surface relationships change. New role values live only in tokens.css; dark foreground variants for success/error/warning/info/unavailable preserve the existing semantic families rather than establish separate portal palettes.

## Honest limits and decision

The independent reviewer must judge visual quality separately from automated checks and return NEEDS REVISION if dark harms usability, accessibility or premium quality. No technical score establishes a winner. Current short synthetic screens do not validate a complete Design System, four other workspaces, long clinical records, forms, tables, destructive actions, native assistive technology or participant preference.

The Product Owner may prefer Dark-first, retain Light-first, or request a bounded refinement. No theme switch, production rollout or automatic selection is implemented. Both are references within ONE identity; this study does not authorize maintaining competing product brands.

**DP01 OPEN:** Arabic wordmark dot collision is untouched. **DP02 OPEN:** Egyptian Arabic tagline remains unresolved. No tagline is used in new UI, and no source lockup lettering is modified. Compact header uses the unchanged standalone mark with separately typeset product name; this remains a proposed placement. Final Brand V2 and Design System V2 remain unapproved.
