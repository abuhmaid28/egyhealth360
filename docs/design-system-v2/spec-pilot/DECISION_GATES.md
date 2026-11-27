# Owner decision gates — Issue #104

**Specification candidate; no new owner approvals recorded by this delivery.** [Specification](FOUNDATIONS_AND_RESPONSIVE_SPEC.md) · [gallery](gallery.html) · [QA](QA.md).

| Gate | Accepted / binding | CANDIDATE recommendation | Still OPEN / approval wording |
| --- | --- | --- | --- |
| DSV2-01 | Brand raw values, exact audited pairs, source-exact no-tagline lockups/gradients, Inter400/500/600/700 + Plex400/600; UX/IA/CD01–07 | Semantic table,4px spacing vocabulary,30/20/16/14 type roles,8/12/16 radii, border-led elevation; task anchor + context anchor + source rows | “Accept these foundations as a specification candidate [with listed revisions]; this does not authorize runtime adoption.” Owner may revise density/type/radii/semantics independently. |
| DSV2-02 | CD07 Latin digits/named Gregorian months/24-hour/event timezone; exact consequential instants preserved | Compare natural12h patient labels with24h professional and audit/detail precision | Choose A retain CD07, B scoped patient amendment below, or C request narrower comparison. No existing format changed. |
| DSV2-03 | Accepted Patient My Care+Find care and secondary retrieval; Doctor Schedule+Care relationships, local consultation tasks | A top/compact labelled web navigation; B normal-flow lower links below768px as comparison | “Approve navigation A [or B] for these two web/PWA roles only, preserving accepted destinations; exact responsive thresholds [accepted/revise].” No IA/five-portal adoption implied. |
| DSV2-04 | Both themes must preserve contrast, source identity and semantic meaning | Authored light/dark pairs; evaluate future system-first+explicit override (T1) vs explicit session choice (T2) | “Approve the visual pair [with revisions]; choose default and persistence scope separately.” Gallery light-first is not a product default. |
| AP03 | Prior bounded Linux Chromium/material evidence, including five Type3 PDF warnings | Carry platform and print checklist forward | OPEN: physical Android/iOS installed PWA/icon selection, OS text, actual platform browsers, physical print. No closure from these specimens. |
| AP05 | Font OFL provenance; source selection and visual acceptance | Obtain underlying artwork creator/usage/rights and trademark evidence | OPEN distribution/rights gate. No legal clearance or educational-use exemption asserted. |

## DSV2-02 exact options for later owner acceptance

**A — retain accepted CD07:** “Keep24-hour display across patient and professional surfaces. Improve spacing and explicit date/event-zone readability only. Natural12h remains a review alternative.”

**B — scoped amendment proposal, NOT accepted:** “Amend CD07 for Patient appointment overview/details only: show natural localized12-hour labels with explicit AM/PM (AR مثال:3 مساءً; EN:3 pm). Professional consultation, signatures, release/history/audit details and consequential timestamps retain24-hour precision. Always preserve full event date, actual IANA event/clinic timezone and date-specific offset in appointment details; expose offset at the overview where repeated local time, cross-zone ambiguity or DST makes it necessary. Cross-midnight intervals show both dates; repeated local hours show both actual offsets. No parser/storage, backend eligibility, automatic scheduling or global time-preference change is authorized.”

**C — defer formatting choice:** “Use labelled alternatives or neutral placeholders in subsequent design reviews. Do not change CD07 or production copy.”

B is recommended for a later narrowly scoped content decision because it reflects owner input while retaining consequential precision. It needs explicit owner acceptance, including visible-vs-details zone treatment; it is not the current content contract.

## Provenance and next gate

Brand head [`687f94074c0ac4d45610546517ea6aa228d36183`](https://github.com/abuhmaid28/egyhealth360/pull/101#issuecomment-6761920764); planning head [`4052e2657dd8d354fe11e33ed51fc32ec8065583`](https://github.com/abuhmaid28/egyhealth360/pull/103#issuecomment-6763681689). PRs101/103 remain Draft/Open/Unmerged and are not this branch's parents. Legacy styling/rejected NOVA alternatives and PR87 are not adopted or natively activated. No new navigation/time/theme/content choice silently supersedes accepted authority.

Next: Product Owner reviews the compact candidate and records accepted/revised choices by gate. Final high-fidelity screen approval, component/package ownership and Frontend Architecture V2, whole-project health disposition and explicit runtime scope remain later prerequisites. **No automatic frontend implementation, merge, deployment, final DS adoption or release follows.**
