# Visual direction rationale and scorecard

**Recommendation for owner selection: H — Human Precision.** Prefer its unified visual grammar across Patient and Clinician; keep P — Precision, Open as the credible operationally neutral challenger. Neither is approved. Score judgments below are design assessments of committed/rendered evidence, not user-study measurements.

## Evidence inspected

Baseline main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`, verified against GitHub on 6 November 2026, contains merged #79, #80, #84 and #85. Issue [#72](https://github.com/abuhmaid28/egyhealth360/issues/72), its [brand-strategy acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568574368), current charter and the direct owner brief govern this bounded exploration. No owner selection of D/E/F was found in that issue; acceptance of a bounded Patient/Clinician implementation does not freeze Final Brand V2.

Read accepted [UX foundation](../UX_FOUNDATION.md), [IA](../INFORMATION_ARCHITECTURE.md), [Content System](../CONTENT_SYSTEM.md), [Arabic UX](../ARABIC_UX.md), [Brand Strategy](../BRAND_STRATEGY.md) and the controlling Patient/Clinician specifications. Inspected the actual three D/E/F committed boards, their HTML/CSS/type/assets and [same-facts comparison](../visual-directions-v2/COMPARISON.md); inspected merged [Patient Arabic evidence](../ui-reference/polish-evidence/patient-my-care-desktop-ar.png) and [Clinician English evidence](../ui-reference/clinician-premium-evidence/after/desktop-en.png). No repeated competitor research or image-search mockup.

Implementation evidence: [Patient component](../../apps/web/src/components/patient-my-care.tsx) is 620 lines; Clinician already separates [entry](../../apps/web/src/components/clinician-consultation.tsx) from [presentation](../../apps/web/src/components/clinician-consultation-presentation.tsx), while [packages/ui](../../packages/ui/src/index.ts) remains an empty export. That favors incremental extraction after approval over importing this review's static generator into product code. No runtime refactor is performed here.

## What D/E/F actually establish

| Evidence | Retain | Improve | Reject for the proposed synthesis |
| --- | --- | --- | --- |
| D desktop Patient / Schedule | Calendar orientation; task facts before decoration; neutral rail and ruled source rows | Patient voice and interpersonal warmth; avoid spending rail width on a sparse patient task | Treating the professional rail as compulsory for every role |
| D consultation | Parallel source context, compact local tasks, legible independent meanings | Keep enough Arabic line height; dense does not mean tiny text | Forcing the whole desktop workspace into phone width |
| E desktop/mobile Patient | One contained appointment; authored Arabic; Manrope/Plex pairing; open content | More concise desktop appointment and next-action rhythm; clearer provenance | Generous spacing copied unchanged into sustained clinical work |
| E consultation | Horizontal patient/context orientation, explicit private/shared sources | Sharpen source-state hierarchy and connect local navigation to the visit | Repeated soft panels and generous clinical rhythm when they obscure priority |
| F Patient / consultation | Persistent context, clear plane boundaries, tabular facts | Express these functional strengths on light surfaces; validate glare separately if dark mode returns | Dark-by-default Patient; cyan as identity everywhere; “OS” as product claim |
| Merged Patient / Clinician | Working bilingual family, accepted task structure, context/authority boundaries | Explore flatter anchor and more open source rows in isolation | Treating merged navy/teal gradient or current typography as final brand acceptance |

Original D/E/F marks remain unselected. Original A/B/C stay rejected historical evidence. Nothing is replaced at its old path.

## Comparative expert scorecard

Scale: **1 unresolved / 2 weak / 3 workable / 4 strong / 5 especially coherent in the inspected evidence**. H/P are new design propositions, D/E/F original exploration. No weighted total: high clinical-density marks cannot compensate for hidden audience or authority boundaries. “Task efficiency” rates visible orientation/scan support, not time saved.

| Dimension | D | E | F | H | P | Evidence behind H/P distinction |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Calm, attentive, precise personality | 4 | 5 | 3 | 5 | 4 | H keeps an interpersonal entry and one contained task; P leads with orientation |
| Whole-system distinction | 4 | 4 | 4 | 4 | 4 | H asymmetric anchor + open retrieval; P rail + continuous light plane; no unusual hue claim |
| Bilingual type rhythm | 4 | 5 | 4 | 5 | 4 | Plex/Manrope patient rhythm vs neutral Noto/Inter; joining/diacritics shown side by side |
| Hierarchy / next action | 4 | 4 | 4 | 5 | 4 | H gives appointment, released summary and unbooked follow-up different emphasis |
| Accepted navigation clarity | 4 | 4 | 4 | 4 | 4 | Same two primary goals per role; H horizontal vs P persistent rail |
| Spacing and grouping | 4 | 3 | 4 | 4 | 4 | H applies density by task; P divides a shared plane |
| Clinical scanning / information density | 5 | 3 | 5 | 4 | 5 | P places source context first on desktop; H uses a denser right-side rail than E |
| Clinical task efficiency support | 4 | 3 | 4 | 4 | 4 | Both preserve identity and independent consequences; task testing is still needed |
| Arabic / RTL composition | 4 | 5 | 4 | 5 | 4 | H's mirrored asymmetric hierarchy, logical borders, isolated source strings |
| Responsive task adaptation | 4 | 4 | 4 | 4 | 4 | Both explicitly reduce phone Clinician to visit review, rather than phone signing |
| Accessibility evidence readiness | 3 | 3 | 3 | 4 | 4 | New measured reflow/contrast/focus/state evidence; neither is WCAG-certified |
| Implementation scalability | 4 | 4 | 3 | 4 | 4 | Same primitives/token meanings; H needs fewer shell changes to merged baseline |

The hypothesis is **supported for a next refinement, not proven by research**. H gives up a little of D/P's maximum density to preserve patient familiarity. P is preferable if the owner prioritizes operational neutrality and repeated-source scanning. F's context continuity transfers usefully; its dark planes do not supply a necessary functional advantage here.

## Finalists as coherent systems

**H — Human Precision:** one 16px contained patient anchor, 6px action controls, open ruled sources, generous Arabic line height, one text wordmark, horizontal primary navigation. The professional mode reduces padding and heading scale, fixes identity above source tasks and distinguishes audience with text plus structure. The patient surface never becomes a bank of KPI cards. Operations reuse the same source/work-row grammar. Light planes are default; deep teal is reserved for identity/current responsibility.

**P — Precision, Open:** one persistent desktop rail, a light calendar-led appointment band, sharper 6px containment and one continuous work plane. Patient recommendations sit beside the source's responsibility explanation at wide widths; the clinician source rail leads on desktop. The rail collapses at tablet width and content takes one column on phone. The same tokens/types of source and same state meanings prevent a second unrelated system. This is more than a recolor: navigation axis, appointment containment, reading path and source placement all differ.

Neither candidate adds destinations, patient data, results, diagnoses or functioning mutations. Both have exactly the same fixture and permissions. The Clinician phone specimen intentionally retains identity, uncertainty and source state; full authoring is unavailable there. The desktop specimen is not a claim that live phone signing was removed.

## Provisional color, type and logo evidence

H's navy/teal family is anchored in E's deep green `#205C4E` / alternate `#31686C` and the merged navy `#0B2545` / teal `#0B6E7F`. The review tests quieter dark teal `#153F47`, action `#155E63`, ink `#102A38` and a neutral `#F5F7F7` canvas to connect those territories without copying the gradient. These are **new provisional test values**, supported by rendered contrast evidence, not inherited owner-approved final colors. P tests `#145C78` action / `#193E52` anchor within D's blue-teal territory. Brand color is never a clinical finding.

H compares E/merged Manrope + IBM Plex Sans Arabic with D's Inter + Noto Sans Arabic and F's IBM Plex Sans + Noto Sans Arabic. Existing font files/licenses only. The same Arabic sample, diacritics, long name and mixed medication quantity are shown. Typography selection remains open pending owner optical review and native Egyptian review.

Use the **text-only wordmark** on all product finalists. In the separate [mark study](typography.html), E1's shared support is the warmer seed; D1's custody silhouette keeps the clearest small gap. Show each at 16/24/32px, monochrome and inverse, alongside the text-only control. Do not select either automatically with H or P. U/furniture and logistics resemblance remain real risks; recognition and trademark checks were not performed.

## Decision to record

Owner may select **H**, **P**, **reject both**, or request a **named hybrid** specifying retained layout/type/shape/context rules and concerns. A hybrid returns as a coherent proof, rather than combining favorite components independently. Record separately: type pairing to refine, mark seeds to retain/reject, density concerns and Arabic optical issues.

Next phase: versioned tokens and coded primitives/components, then approved screen prototypes and incremental adoption, with visual regression. Final Brand, logo, Design System, prototype and production deployment gates remain explicit. Technical Green does not select visual DNA.
