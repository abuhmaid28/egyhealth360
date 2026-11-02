# Codex Execution Prompt — EgyHealth Premium Synthesis

You are implementing an owner-directed visual reference for EgyHealth 360.

Repository documentation and current GitHub authorization remain the source of truth for product, security, clinical, and scope behavior.

## Design source of truth

Read, in this order:

1. Current GitHub authorization and repository source-of-truth docs.
2. `docs/ui-reference/README_START_HERE.md`
3. `docs/ui-reference/PREMIUM_SYNTHESIS_SPEC.md`
4. Decode and inspect `docs/ui-reference/reference/premium-synthesis-v1-board.jpg.b64` as described in the README.

Do not reconstruct the design from prior chat memory.

## Current task

Implement ONLY the first visual slice:

**PATIENT — MY CARE**

Required:
- desktop English
- desktop Arabic RTL
- mobile English
- mobile Arabic RTL
- loading state where applicable
- empty state where applicable
- error state where applicable
- uncertain/source-verification state where applicable

Do NOT implement the full visual board in one pass.

## Role boundary

For this task, Codex is the implementation engineer, not the art director.

IMPLEMENT THE REFERENCE. DO NOT REDESIGN IT.

If a design detail is impossible, unsafe, semantically incorrect, or conflicts with accepted project contracts, record the exact conflict before deviating.

## Strong constraints

DO NOT:
- invent a new visual direction
- substitute your own palette
- substitute default shadcn/card styling
- add unsupported navigation
- add decorative gradients beyond the explicitly approved restrained appointment-anchor treatment
- turn every section into a card
- change accepted wording/clinical meaning
- change backend/API/database/schema/migrations/security behavior
- change authorization semantics
- implement Lab/I4/I5/EACCE/AI
- promote production
- merge or enable auto-merge

## Engineering requirements

- Keep existing Demo/Live boundaries intact.
- No unsafe Live → Demo fallback.
- Preserve current access-control semantics.
- Build reusable visual primitives only where they improve consistency.
- Keep design tokens centralized.
- Support true RTL layout, not text-align-only RTL.
- Use bidi isolation for mixed Arabic/Latin medical values, dates, times, measurements, IDs and medication names.
- Use repository-approved/local font strategy; do not add an uncontrolled runtime font dependency.
- Use semantic HTML and visible keyboard focus.
- Honor reduced-motion.
- Maintain meaningful loading / empty / error / uncertainty states.

## Patient My Care acceptance intent

The screen must immediately communicate:
1. the patient's next care event;
2. the patient's next responsibilities/actions;
3. quick access to care information;
4. recent care activity.

Visual hierarchy:
- Next Appointment is the strongest visual anchor.
- Next for you is short and prioritized.
- Your care shortcuts are lightweight, not KPI dashboard cards.
- Recent care is primarily list-based.
- Mobile is purpose-built, not desktop stacked blindly.

Never imply that booking alone grants medical access.

## Validation

Run all repository-required checks selected for the changed scope.

Additionally produce review evidence for:
- desktop EN at a stable reference viewport
- desktop AR at the same viewport
- mobile EN at `390×844`
- mobile AR at `390×844`
- 320px reflow
- 200% text scaling
- keyboard focus
- contrast/accessibility notes
- visual discrepancy list against the supplied board/spec

For every visual discrepancy, record whether it is:
- intentional/required
- implementation debt
- unresolved

Do not claim pixel-perfect parity if it is not true.

## Scope preservation

Before completion, verify and explicitly report that no unintended changes occurred in:
- backend
- API/OpenAPI
- database/schema/migrations
- security/authorization
- CI policy
- hosting/deployment configuration
- unrelated clinical workflows

## Git / PR behavior

Use the existing review branch/PR unless current repository authorization says otherwise.

Keep the PR:
- OPEN
- UNMERGED
- AUTO-MERGE OFF

Do not infer Product Owner approval from passing CI.

## Completion output

Return:
- exact base SHA used for implementation
- exact resulting head SHA
- changed files
- local validation results
- remote CI status if available
- screenshot paths
- discrepancy list
- scope-preservation statement
- any unresolved visual/semantic issues

End with exactly:

**READY FOR INDEPENDENT PATIENT MY CARE VISUAL IMPLEMENTATION REVIEW**
