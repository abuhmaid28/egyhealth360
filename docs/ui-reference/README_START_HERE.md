# EgyHealth 360 — Premium Synthesis UI Reference

Status: owner-directed visual synthesis handoff for implementation review. This is **not** Final Brand V2 and does not authorize unrelated runtime/backend work.

## Read order

1. Current GitHub authorization / source-of-truth docs
2. `docs/ui-reference/PREMIUM_SYNTHESIS_SPEC.md`
3. `docs/ui-reference/CODEX_PROMPT.md`
4. `docs/ui-reference/reference/patient-my-care-reference.svg`

The SVG is the committed visual implementation reference for the first slice. Open it directly in a browser or image-capable editor. It communicates composition, hierarchy, visual tone, density, relative proportions, colors, and desktop/mobile priority. The written specification resolves dimensions, responsive behavior, accessibility, semantic safety, typography intent, RTL rules, and any ambiguity.

If the visual reference and written spec appear to conflict:

1. preserve accepted product/security/clinical semantics;
2. follow the written specification for behavior and responsive rules;
3. preserve the visual reference's hierarchy and composition where compatible;
4. document any required deviation instead of silently redesigning.

## Current implementation gate

Implement only **Patient — My Care** first:

- Desktop English
- Desktop Arabic RTL
- Mobile English
- Mobile Arabic RTL
- relevant loading / empty / error / uncertain states

Do not implement the entire visual board in one pass.

After implementation, return screenshots at matched viewports and a discrepancy list for independent visual QA.

## Authorization boundary

This handoff does **not** authorize:

- backend/API/database/schema/security changes
- Lab/I4/I5/EACCE/AI scope
- production promotion
- Final Brand V2
- automatic merge or auto-merge

Keep the PR open and unmerged until Product Owner review.
