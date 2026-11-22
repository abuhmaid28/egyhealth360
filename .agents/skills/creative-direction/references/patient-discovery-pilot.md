# Patient Discovery flagship pilot handoff

Historical planning artifact. Current discovery/UX scope follows [#166](https://github.com/abuhmaid28/egyhealth360/issues/166) and the [approved gates](https://github.com/abuhmaid28/egyhealth360/issues/167). The earlier brief below supplies evidence only.

Planning only under [Issue #157](https://github.com/abuhmaid28/egyhealth360/issues/157). Antigravity retains Frontend ownership. Source inspected at [PR #154 commit](https://github.com/abuhmaid28/egyhealth360/commit/14694a7e0aff9cccae8eef3c53a6f537d7568764), tree 00ed2300e92596914ac834d3249072c0d7a7ce9a. Recheck ownership and current authorized pins before any follow-up.

## Current surface and preservation

The Patient router selects Expressive Discovery on exact /patient/discover for Demo session and adapter. The separate Discovery rendering remains available outside that gate. The Expressive surface reads providers, specialties and clinics together, renders name search, labeled native specialty and clinic selectors, specialty chips, result count and clear/reset to search focus. It filters the returned order by normalized raw/localized name, specialty and clinic. Cards show name, specialty and relevant clinic/city where present, then link to /patient/doctors/{id} for profile and availability. The screen discloses fictional profiles and separates discovery/booking from medical record access. Preserve all contracts, route destinations, count, order, clear behavior and fallback states. No additional authority, booking writes, Live fallback, or change to other portals or profile/booking flows.

Audit source inspection points are apps/web/src/components/patient.tsx, apps/web/src/components/v2/patient-discovery-signature.module.css and scripts/support/ui-expressive-discovery-browser.mjs. These are review references. A future issue must authorize exact edit paths.

## Visual brief

Help a patient identify a suitable profile quickly by name, specialty or clinic. Compare these concepts at equal fixture density and viewport:

1. **Search first.** Compact find-and-filter hierarchy, then a calm vertical list. Optimize immediate keyboard and mobile discovery, with less prominence for browsing.
2. **Specialty first.** Lead with clearly labeled specialty choices and subordinate name/clinic refinement. Optimize orientation for uncertain users, with a risk of added vertical space.
3. **Comparison first.** Lead with equal-weight provider cards and predictable identity, location and action alignment. Optimize scanning multiple matching profiles, with a risk of weaker first-use filtering cues.

Use accepted T1, brand roles, typography, icons and bilingual semantics. Propose original typography-led geometry or initials as rights-safe alternatives, subject to approval. Inventory all visible marks, illustrations and fonts, including shared navigation. If AP05 assets appear, block publication of the affected captures until cleared or replaced under separate authority. Use synthetic fixtures only.

## Acceptance matrix

Cover ready with multiple results, missing clinic field, long mixed-script names, filtering by individual and combined criteria, zero matches, reset and focus, loading, failure and existing recovery, profile navigation and Back. Include wrong-role, session switch and Live request parity with an authorized isolated fixture. Check zero unauthorized external calls and mutations. Compare original before/after PNGs under the [workflow quality gates](workflow.md#quality-gates), record keyboard and accessibility results separately from aesthetics, and use local performance deltas. Resolve or report deficits by severity. Roll back only the future pilot's scoped commits to its agreed untouched baseline. Five-portal reuse is a proposal after Owner pilot acceptance.

## Exact follow-up prompt for Antigravity

> Verify your current sole Frontend lane and the separately authorized exact source pins, routes, path allowlist and publication scope. Start from the approved #154-derived candidate, and use this brief to compare three rights-cleared synthetic visual concepts. Bring their browser evidence and the proposed performance budget to the Owner for explicit selection. After distinct implementation authorization, implement only the approved /patient/discover presentation while preserving the current Demo gate, filtering, order, profile destinations and clinical boundaries. Run the matching browser and regression matrix, capture original bilingual evidence, obtain independent exact-tree reviews and stop for Owner visual acceptance. Keep AP05, F06/E2 and release gates in force.
