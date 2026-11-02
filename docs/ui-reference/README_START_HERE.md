# EgyHealth 360 — Premium Synthesis UI Reference

Status: owner-directed visual synthesis handoff for implementation review. This is **not** Final Brand V2 and does not authorize unrelated runtime/backend work.

## Read order

1. Current GitHub authorization / source-of-truth docs
2. `docs/ui-reference/PREMIUM_SYNTHESIS_SPEC.md`
3. `docs/ui-reference/CODEX_PROMPT.md`
4. Visual reference decoded from `docs/ui-reference/reference/premium-synthesis-v1-board.jpg.b64`

## Decode the visual reference

From repository root:

```bash
base64 -d docs/ui-reference/reference/premium-synthesis-v1-board.jpg.b64 > docs/ui-reference/reference/premium-synthesis-v1-board.jpg
```

The decoded JPG is a compressed review copy of the Product Owner visual board. It communicates composition, hierarchy, visual tone, density, and component intent. The written specification resolves dimensions, responsive behavior, accessibility, semantic safety, and any ambiguity.

If the image and written spec appear to conflict:

1. preserve accepted product/security/clinical semantics;
2. follow the written specification for behavior and responsive rules;
3. preserve the image's visual intent where compatible;
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
