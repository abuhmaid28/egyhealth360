# Independent unified Brand-to-NOVA review

Reviewer: separate `independent_visual_review` agent, 8 November 2026 UTC. I did not author the specimens, token proposal, comparison board or author validation tools. I authored this review and the independent evidence files only; no candidate/source/tool edits. Subject: disconnected synthetic Patient My Care, not an integrated application.

## Independent verdicts

| Gate | Verdict | Boundary |
| --- | --- | --- |
| Visual | **PASS for Product Owner direction review** | Selected logo and UI form one coherent identity. The corrected four screens and boards are suitable for owner evaluation. No final brand or design approval. |
| Functional UX | **PASS for the bounded specimens** | Appointment, source, privacy, language and recovery meanings are preserved. No connected retrieval, booking or clinical command is demonstrated. |
| Technical | **PASS for executed browser checks** | Independent responsive, keyboard, motion, state and sampled color checks support the result. Final-head repository CI is a separate delivery gate, reported in the PR. |

I would return NEEDS REVISION if the change lost the previous candidate's usable hierarchy or visual quality. After the corrections below, I do not find that regression. This is a qualitative comparison, not measured patient preference. Only the Product Owner can approve the proposed unified direction.

## Sources and actual renders

I read AGENTS, status/source-index/charter context, the current owner brief, relevant accepted Arabic/content and brand constraints, the pinned Visual QA SKILL.md and reference map from #87, and the #97 deferred-polish register. This is **explicit reference loading**, not native Skill activation. Main and source refs were checked locally against the fetched pins: main `5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3`, #94 `9e5fca14c7f931a49e94dd88915f8c9fa24a45da`, #96 `cb3fd9112f15e17b3d500d7a9dd085dd6e412525`, #97 `e1abedc3d1c8811912f0fe6576e4b4f3459210ce`.

I inspected the actual four [normal-screen PNGs](README.md#four-actual-screens) and all four corresponding #94 reference PNGs, then re-inspected corrected mobile captures. I independently rendered and inspected the [comparison](comparison.html) and [visual-language](language.html) boards at 1440px. Their images loaded without broken assets or document overflow. The prior screens are historical comparison evidence, not another proposed brand direction.

The copied symbol SHA-256 is `ece9ce086fdb31ae834e9466dfa92b4cc919b2fb2e1e90042586482e6c727f6b`, identical to the pinned foundation asset. Its geometry, gradients, floating head, negative space and gold ribbon remain intact. The symbol is not mirrored. The compact header uses live product naming alongside the actual mark; it does not edit the source lockup.

## Visual and language assessment

The new light canvas, dark appointment anchor and connected white source plane create a material change in hierarchy. Outlined source actions and open retrieval rows replace repeated dark framed cards. Removing the decorative orbit and reserving gold for restrained identity/date emphasis produces a calmer, official product expression. The chosen logo feels deliberately related to the navigation and care anchor. The all-dark NOVA reference is more theatrical; the proposal gives stronger separation between immediate appointment action and supporting shared information. That tradeoff remains an owner judgment.

The appointment still leads with doctor, clinic, complete date, dominant start time, end time and clear details action. Framed navigation, asymmetrical softened corners, original outline icon vocabulary and purposeful depth retain NOVA's product personality. No competing purple/lime primary colors, arbitrary gradients, artificial glow, medical imagery or filler panels remain in the candidate. This is more than mechanical recoloring.

Arabic RTL is legible, naturally phrased and spacious at the normal mobile and desktop sizes. English retains equivalent objects, consequences and named actions. Inter and IBM Plex Sans Arabic form one proposed bilingual typography system. Arabic marks and dots in UI text are not clipped; this does not certify the source Arabic wordmark. Mixed-script clinic names, time runs and Latin digits retain their intended order.

The [foundation proposal](FOUNDATION_PROPOSAL.md) consistently separates brand accents, interactive roles and clinical semantics. Green confirmation, amber caution, red failure, blue information and neutral unavailable samples include explicit text/non-color cues. Gold date emphasis does not claim warning or medical success. Those shared roles, typography, icon strokes, focus and source grammar can support future portals with different density; this Patient sample does not validate those portals or a complete Design System.

## Findings and verified corrections

| ID / severity | Initial observation | Independently verified disposition |
| --- | --- | --- |
| VQ01 — Low | EN390 normal duplicate calendar month displayed “Novembe” plus isolated “r,” degrading ordinary-size typography. | Corrected. Narrow English omits only the decorative repeated month; complete semantic date remains. Final EN390 PNG inspected. |
| VQ02 — Medium | EN320 at doubled computed text: document width 331px for a 320px viewport. A capped identity label overflowed its available width; a long source label also exceeded its region. | Corrected. Identity may reflow and source metadata can shrink/wrap. Independent final 16-case normal matrix has zero document/bounding-box overflow. |
| VQ03 — Low | AR320 at doubled text split the active navigation label inside the word. | Corrected. Navigation stacks into rows before fragmenting the Arabic label. Independent final enlarged Arabic screenshot inspected. |

The final mobile intro/source layout also reflows into a wider measure as text grows; normal-size source hierarchy remains intact. At extreme 320px/doubled text, long English strings still use emergency wrapping and the page requires substantial vertical travel. Essential content remains available and dialogs stay operable. This is a nonblocking limitation for the bounded direction review, not a native zoom or low-vision usability certification. Quick retrieval remains below shared-source content on phones, as in the appointment-first baseline.

## Independent execution and reviewed author evidence

Independent Chromium **154.0.8037.57** execution used system Chromium and the existing Playwright installation against localhost, without new dependencies or external services. Retained evidence: [browser measurements](evidence/independent-browser.json), [motion/guard/color checks](evidence/independent-runtime.json), [Arabic enlarged render](evidence/independent-ar-320-text200.png), [English enlarged render](evidence/independent-en-320-text200.png). The final responsive/state/keyboard matrix was repeated after the last layout refinement:


- **16 normal layouts:** Arabic/English × 320/390/768/1440px × normal/200% root text. Final document and inspected content bounding boxes remain inside the viewport; minimum measured visible control dimension is **48px**. Correct locale/direction, one H1, loaded intended fonts and exact appointment instants observed.
- **10 additional state renders:** five non-normal states in each language at 390px. Loading/empty/read error remove stale appointment confirmation and facts. Busy/status/alert semantics match the state. No-sources and unavailable regions remove source articles and provenance without disclosing private/draft details or a cause/count.
- **14 enlarged keyboard actions:** seven previews in each locale at 320px/200% text. Skip link reaches main; controls show a 3px focus outline; Enter opens the correct dialog with title focus and scrollTop 0; Tab/Shift+Tab remain inside; Escape closes and restores opener focus. No horizontal dialog overflow.
- **4 motion cases:** both locales with reduce/no-preference. Reduced motion removes transitions and smooth scrolling; skeletons are static in both modes.
- **2 no-JS guards:** localized fallback visible; normal-data shell hidden/inert when requesting unavailable content.
- **14 independently recomputed solid-color pairs:** ordinary text and proposed semantic pairs pass 4.5:1; focus pairs pass 3:1. Examples: primary dark-surface action 7.99:1, secondary action 7.01:1, success 6.19:1, warning 6.14:1, error 6.10:1, information 6.21:1, unavailable 6.25:1.

I also reviewed the author's recorded **96-case** six-state/four-width/two-locale/two-text-scale matrix: no final overflow, sampled essential clipping, browser errors, failed responses or external requests. The author's contrast report contains **6,396 observations**, minimum text/icon ratio **5.68:1**, no failures, and passing explicit focus/selection/control-boundary pairs. These are sampled measurements, not a complete accessibility certification.

The same synthetic Salma/Dr Omar/Nile Care Clinic facts remain. Appointment start/end are `2026-11-12T14:30:00+02:00` / `2026-11-12T15:00:00+02:00`, 30 minutes, Africa/Cairo; ordinary patient presentation preserves #94's scoped 12-hour convention. Follow-up is explicitly not booked; missing linkage is qualified “here.” Summary and recommendation remain separate shared sources. Booking grants no clinical authority. Available history is bounded and prescriptions are unavailable in this preview. Raw static files contain synthetic fixtures; rendered suppression is not server payload-redaction proof.

## Limits and owner gate

**NOT TESTED:** native browser zoom, real screen-reader operation/announcement timing, physical devices/touch/OS scaling, Firefox/WebKit/Safari, human Egyptian editorial or participant comprehension, production integration/authorization, dense clinical workflows, four other portals and complete component coverage. Computed doubled text and accessibility semantics do not establish those results. Final-head CI must be read from the exact PR candidate; browser PASS does not imply remote CI success.

**DP01 remains OPEN:** no Arabic source wordmark correction or actual-size closure evidence. **DP02 remains OPEN:** the formal source tagline is not canonical new UI text; no replacement slogan is proposed. The supplied symbol is preserved. The foundation and header placement remain proposals.

Approve or request changes after viewing the four actual screens. Keep this study Draft/open/unmerged. No final Brand V2, Design System V2 freeze, production implementation, additional portal design, merge or deployment is approved by this review.
