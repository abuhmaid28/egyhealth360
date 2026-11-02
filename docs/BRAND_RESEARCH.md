# Brand research — Foundation Reboot V2

**RESEARCH / POSITIONING / CREATIVE STRATEGY ONLY.** Based on main `80cb2bc27d9439f0e57e5bec320ac9bde0121e87`, checked 2 November 2026, under [owner authorization 6568210676](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568210676) and the owner-provided Brand Research brief. No final logo, palette, primary color, font, visual direction or product appearance is chosen. No visual assets, mockups, components or implementation are created.

Read this → [reference map](BRAND_REFERENCE_MAP.md) → [strategy](BRAND_STRATEGY.md) → [future exploration brief](BRAND_EXPLORATION_BRIEF.md) → [decisions](BRAND_DECISION_REGISTER.md) → [validation](BRAND_RESEARCH_VALIDATION.md). Research territories below are unranked hypotheses, not the future A/B/C designs.

## Foundation and evidence method

**ACCEPTED FOUNDATION:** [UX](UX_FOUNDATION.md), [journeys](USER_JOURNEYS.md), [IA](INFORMATION_ARCHITECTURE.md), [sitemaps](IA_SITEMAPS.md), [IA decisions](IA_DECISION_REGISTER.md), [content](CONTENT_SYSTEM.md), [Arabic UX](ARABIC_UX.md), [glossary](TERMINOLOGY_GLOSSARY.md) and [content decisions](CONTENT_DECISION_REGISTER.md). Latest owner acceptance controls older pending language: CD01–CD07 are accepted/merged at the pinned base. [Charter](FOUNDATION_CHARTER.md) and [source index](SOURCE_OF_TRUTH.md) preserve authority and future approval gates.

**FACT / OBSERVATION / INTERPRETATION / RECOMMENDATION** are distinct evidence classes, defined in the reference map. Internal audit observations are reproducible from source and preserved screenshots. External observations come from 13 public products/services and five guidance references, each with URL, access date, relevance and avoid-copy notes. No preference survey, user interview, trust experiment or authenticated competitor review was performed. Claims such as “Egyptian users prefer blue,” “green creates trust” or “competitors do not support continuity” are unsupported and are not findings.

## Existing brand and V1 evidence audit

Existing implementation is **NOT FINAL**, not accepted branding. Classification indicates research disposition, never permission to change V1. All linked screenshots remain byte-identical historical BEFORE evidence.

| Element / source | OBSERVATION | Classification | INTERPRETATION / later requirement |
| --- | --- | --- | --- |
| [Logo component](../apps/web/src/components/ui.tsx), `Logo` | White plus in a rounded teal square; English EgyHealth with adjacent 360 and tiny uppercase tagline | GENERIC; HIGH CLICHÉ RISK; NOT FINAL | The name is retained; the current plus/square/lockup has no inherited approval. Tiny tagline is a small-size concern, not measured logo failure |
| Same component and [metadata](../apps/web/app/layout.tsx) | Connected-care language recurs; current tagline includes a health-benefit claim | PRESERVE AS PRODUCT MEANING; RESEARCH INPUT | Preserve connected responsibility as purpose; do not freeze tagline or promise better clinical outcomes |
| [Global styles](../apps/web/app/globals.css), root variables | Navy/blue/teal, pale background, white panels, amber status emphasis | GENERIC; NOT FINAL | Recognizable category convention, weak distinction alone. Current values are implementation facts, not a V2 palette |
| Global styles, `@font-face`; [font provenance](../apps/web/public/fonts/README.md) | Inter and Noto Sans Arabic are bundled in V1 | RESEARCH INPUT; NOT FINAL | Existing licensing/availability evidence is useful; neither family is selected for V2 |
| [Patient desktop](ui-screenshots/doctor-demo/patient-dashboard-en-1440.png) | Next step, recent appointments, profile and shared-care explanation compete in separate bordered panels | WEAK; GENERIC; AVOID REPEATING | Task relevance should outrank equal panel emphasis; do not derive final layout from V1 |
| Same Patient evidence | Last visit repeats in next-step and recent lists; privacy/released-care reassurance repeats | WEAK; AVOID REPEATING | Reassurance should accompany the relevant decision, not become decorative dashboard content |
| [Patient Arabic mobile](ui-screenshots/doctor-demo/patient-dashboard-ar-390.png) | Long stacked panels, formal Arabic labels and older numeral/time conventions | INCONSISTENT with now-accepted content; RESEARCH INPUT | Accepted متابعتي / دور على دكتور and CD07 supersede old screenshot wording; no screenshot edit authorized |
| [Doctor schedule](ui-screenshots/doctor-demo/clinician-schedule-en-1440.png), [Doctor source](../apps/web/src/components/doctor.tsx) | Schedule/list work coexists with overview/stat patterns | PRESERVE AS PRODUCT MEANING; GENERIC | Preserve dated workload; accepted Schedule is primary, not a mandate for dashboard statistics |
| [Consultation desktop](ui-screenshots/doctor-demo/documentation-en-1440.png) | Patient/visit context, document-purpose distinction, local tasks and explicit review/close are visible | PRESERVE AS PRODUCT MEANING | Safety context and deliberate consequences survive every later direction; current strip/panel appearance does not |
| Same consultation evidence | Many boxed sections and secondary controls create a long document surface | WEAK; RESEARCH INPUT | Test relevant density and hierarchy; do not equate less decoration with removing clinical context |
| [Consultation Arabic mobile](ui-screenshots/doctor-demo/documentation-ar-390.png) | Arabic surrounds recorded English clinical examples; controls and explanations wrap heavily | RESEARCH INPUT; NOT FINAL | Recorded clinical text may stay exact; authored Arabic UI must have full coverage. Later type testing must use both kinds |
| [UI icons](../apps/web/src/components/ui.tsx), `paths` / `Icon` | Custom line icons include heart, activity, shield, plus, pill, calendar; directional flags exist | GENERIC; CLICHÉ for identity reuse; RESEARCH INPUT | Useful task symbols are not automatically suitable logos. Test comprehension and mirroring; no icon library chosen |
| [Operations source](../apps/web/src/components/operations.tsx), `FulfillmentInbox` | Demo counters, artifact references and pharmacy “preparation journey” language | INCONSISTENT with accepted fulfillment meanings; AVOID REPEATING | Assigned work and recorded supply are the actual meaning; not stock, readiness, delivery or patient-wide access |
| Same source, Admin overview | Organization/user/scheduling statistics and operational lists | GENERIC; WEAK if treated as homepage purpose | Accepted People/Organizations tasks outrank unrelated summary metrics; no clinical Admin promise |
| [Application shell](../apps/web/src/components/application.tsx), [Live home](../apps/web/src/components/live-home.tsx) | Separate Demo/Live context and synthetic-data notice; repeated explanatory tone | PRESERVE AS PRODUCT MEANING; RESEARCH INPUT | Keep capability honesty; shorten only without losing meaning. No evidence of real-patient production readiness |
| [Translation catalog](../apps/web/src/lib/i18n/catalog.ts), [Arabic strings](../apps/web/src/lib/i18n/ar.ts) | English fallback and older formal terminology remain implementation evidence | INCONSISTENT; AVOID REPEATING | Accepted Egyptian Arabic and parity govern later work. Audit records drift, does not fix runtime |

Patient/Doctor screenshots were visually inspected; Pharmacy/Admin/Demo conclusions are source inspection, not invented screenshots or a new hosted journey. Supporting V1 meanings do not imply that V1 visual expression should be preserved.

## Category pattern analysis

The table describes sampled recurrence and design risks, not population prevalence or proven emotional causality. Reference IDs resolve to live-source records in the [map](BRAND_REFERENCE_MAP.md).

| Pattern / evidence | What still works / potential trust support | Genericness or confusion risk | RECOMMENDATION to test |
| --- | --- | --- | --- |
| Blue systems: R07, R09; blue actions R03/R05 | Strong information/action distinction when contrast and semantics work | Blue + white panels + stock clinician alone offers little ownable character | Keep blue eligible; evaluate the whole system, never select it because “healthcare must be blue” |
| Teal/green: R02/R08; non-health R13 | Recognizable accents can unify a service | Can resemble pharmacy, wellness, regional service or existing V1 | Require recognition and status separation; hue alone is not care continuity |
| White/clinical minimalism: R07/R08 | Reduces competing decoration and supports clear text | Empty-looking hierarchy, faint labels, excessive scrolling or loss of Doctor context | Test populated work as well as marketing/empty screens |
| Rounded friendly healthcare: R05/R08 | Grouping and approachable tone can coexist | Repeated soft tiles make unrelated tasks look equivalent; friendliness can trivialize consequence | Reserve emphasis for actual work; warmth need not mean every section is a card |
| Hospital/institutional: R04/R07 | Real institutional provenance supports accountability | Borrowed seals, mastheads and formal language imply affiliation or bureaucracy | Use attributable product facts without claiming hospital/government ownership |
| Wellness: R10 | Humane language and welcoming entry are useful | Playful characters and self-improvement framing may weaken interpretation of clinical warnings | Test respect and consequence comprehension; no blanket claim all illustration is childish |
| Medical technology: R09 | Real workflow vocabulary and product context demonstrate purpose | Enterprise feature grids and platform claims can overshadow patient care | Express task competence; avoid billing/ERP associations outside accepted scope |
| Pharmacy: R02/R03 | Clear medication responsibility and local nouns | Capsule-first identity or commerce/promotion framing narrows the whole product | Distinguish prescription, acceptance and actual dispense; reject retail scope creep |
| AI health: R11; AI offers in R09/R10 | Specific function labels make claims visible | Prompt boxes, assistants, brains or sparkles can imply unsupported inference | No AI diagnosis/treatment/automation cues; AI branding is not uniformly neon |
| Arabic/bilingual: R01–R03/R12/R13 | Local task language and corresponding languages can communicate familiarity | Literal translation, weak Arabic hierarchy, mixed-language leakage, decorative calligraphy | Test full natural Egyptian tasks and exact Latin medical content together |

**INTERPRETATION:** trust is better framed as understandable responsibility plus truthful evidence than as an aesthetic effect. No competitor's assurance, scale statistic, professional endorsement or regulatory status transfers to EgyHealth. Modernity can arise from confident hierarchy, capable bilingual behavior and useful handoffs without a generic SaaS dashboard.

## Healthcare logo cliché assessment

These are qualitative semantic/similarity-risk judgments, not an exhaustive logo census. A high-risk symbol is not automatically forbidden; useful transformation must alter concept and recognition, not add a circle or gradient. R05/R08 demonstrate familiar care imagery; V1 demonstrates a plus. Other rows assess plausible category associations rather than claiming measured frequency.

| Pattern | Classification | Reason / future exploration condition |
| --- | --- | --- |
| Medical cross | HIGH CLICHÉ RISK | Fast medical association but weak differentiation; assess confusion, emergency connotation and protected-emblem boundary |
| Heart | HIGH CLICHÉ RISK | Generic care/wellness/cardiology reading; a distinctive concept must go beyond a heart outline |
| Heartbeat / ECG line | AVOID UNLESS TRANSFORMED | Can imply monitoring, emergency response or cardiology scope that the product does not provide |
| Stethoscope | HIGH CLICHÉ RISK | Physician/clinic shorthand narrows multi-role continuity; avoid stock icon construction |
| Shield | HIGH CLICHÉ RISK | May imply guaranteed safety/security; specific trust evidence must not become a badge claim |
| Hands holding heart | AVOID UNLESS TRANSFORMED | Familiar charity/care composition; detail collapses at small sizes and risks paternalism |
| Human figure | SAFE TO EXPLORE | Fits human-led care if non-generic, respectful and legible; avoid clinic-stock or savior figures |
| DNA helix | AVOID UNLESS TRANSFORMED | Genetics/laboratory specialization and fine detail do not describe present product scope |
| Hospital building | AVOID UNLESS TRANSFORMED | Implies institution ownership/facility administration and excludes distributed care |
| Capsule / pill | HIGH CLICHÉ RISK | Appropriate functional medicine symbol; pharmacy-only identity risk for whole platform |
| Plus sign alone | HIGH CLICHÉ RISK | Current V1 is not approval; generic addition/clinic association and crowded similarity space |
| Letter inside medical cross | AVOID UNLESS TRANSFORMED | Initial insertion seldom changes the underlying stock concept; test silhouette without the letter |
| AI brain | DO NOT USE | Unsupported medical/AI function implication; adding connectivity does not justify it |
| Sparkle | AVOID UNLESS TRANSFORMED | Generic magic/AI association; DO NOT USE when it signals AI diagnosis or automated clinical action |
| Circuit/network symbol | AVOID UNLESS TRANSFORMED | Can communicate technology rather than human care, or suggest broad data sharing; no universal-access implication |
| Protected red cross, red crescent, red crystal or confusing imitation | DO NOT USE | [ICRC guidance / G05](BRAND_REFERENCE_MAP.md#guidance-references) identifies protected emblem use. Distinct from automatically banning every medical plus |

## Egyptian locality without default heritage imagery

No decision to use a national/heritage motif is authorized. These are research judgments, not claims that Egyptian users dislike their heritage.

| Motif | Research disposition / risk | What would need proof before any later use |
| --- | --- | --- |
| Pyramids | HIGH CLICHÉ RISK: country/tourism shorthand says little about contemporary care | Product-specific rationale, recognition without tourist reading, ownable construction |
| Pharaonic symbols | AVOID UNLESS TRANSFORMED: historical spectacle can dominate a service identity | Clinical credibility, cultural sensitivity and no mystical authority claim |
| Eye of Horus | AVOID UNLESS TRANSFORMED: heritage/protection/surveillance interpretations may conflict with privacy and evidence | Native Egyptian interpretation review; no healing or guaranteed-protection implication |
| Egyptian flag colors | HIGH CLICHÉ RISK: nationality may become state/emergency affiliation or constrain status use | Clear independence from official services; readable functional states; no required palette |
| Nile motifs | SAFE TO EXPLORE as a hypothesis only: flow/connection could relate to continuity, but generic wave/tourism readings remain | A distinct story that does not depend on geography explanation or imply universal data flow |
| Lotus | HIGH CLICHÉ RISK: wellness/spa/heritage narrowing | Clinical and multi-role fit beyond decorative symbolism |
| Hieroglyphic styling | AVOID UNLESS TRANSFORMED: novelty can harm reading and suggest historical exhibit | Modern Arabic/English legibility and no pseudo-script; never replace clinical text with decorative glyphs |

**RECOMMENDATION:** express locality first through accepted Egyptian Arabic, bilingual reading behavior, correct local tasks/time conventions and ordinary cultural familiarity. R01–R03/R12/R13 provide examples of local/regional service language, not permission to copy expression. No evidence establishes a mandatory Egyptian motif or licenses a new Arabic product name.

## Generic SaaS anti-patterns

| Anti-pattern | Evidence status | Why to avoid / permitted functional exception |
| --- | --- | --- |
| Card soup; every section inside a card | OBSERVATION: V1 Patient and consultation; some public service pages use tiles for different purposes | Equal containers flatten importance. A card is acceptable when it groups one meaningful object, not as a universal treatment |
| Dashboard of unrelated metrics; giant marketing numbers in clinical work | OBSERVATION: V1 Demo counts; R11 public marketing statistics are a different context | Counts must change a permitted work decision; no care-completion, accuracy or vanity score |
| Blue gradient + generic rounded cards | HYPOTHESIS / synthesis; not asserted as every competitor's UI | Little differentiation when combined mechanically; a gradient or radius is not individually banned |
| Random blobs and meaningless illustrations | HYPOTHESIS risk; R05/R10 have purposeful branded art, not evidence of meaninglessness | Require explanatory or orientation value; no substitute for correct state information |
| Excessive glassmorphism | ANTICIPATED risk, not observed as dominant in this sample | Variable contrast and layering must not impair medical content or focus |
| Neon AI gradients, sparkles everywhere | ANTICIPATED confusion risk; R11 is a counterexample to universal neon styling | Avoid unsupported AI association, decorative urgency and “magic” clinical action |
| Excessive pills/chips | OBSERVATION: V1 status badges; excess is a later-test hypothesis | Keep source/state axes readable in text; compact labels cannot erase consequence or currentness |
| Copied fintech aesthetic | ANTICIPATED risk from R12 analogy | Learn exact target/outcome clarity, not wallets, receipts, celebrations or identical-command rules from payments |
| Decorative medical icons without information value | OBSERVATION: V1 icon tiles; comprehension not measured | Use meaningful labels and restrained support; no pile of pills/hearts/shields as credibility decoration |

Avoiding these is a requirement to demonstrate task value, not a newly selected sparse UI or universal ban on cards, color, illustration or rounded shapes.

## Visual opportunity territories — unranked hypotheses

Six research territories keep the creative field open. **None is a design, winner, owner-approved direction or preselected A/B/C.** The future stage must synthesize exactly three distinct directions after separate authorization; it may combine, challenge or replace these hypotheses while tracing its rationale.

### T01 — The understandable handoff

- **Core idea / evidence:** responsibility moves clearly between people, from accepted J1–J7 and R08/R12 service explanations.
- **Emotional feel / impression:** oriented, supported and accountable; connected care rather than transaction collection.
- **Possible abstract characteristics:** continuity of information cues and deliberate transitions; no prescribed line motif, layout or logo.
- **Risks / cliché:** network/infinity graphics, forced linear journey or implied seamless sharing. Optional care branches remain optional.
- **Arabic implications:** natural actor/action sentences; RTL cannot reverse clinical sequence or signed values.
- **Patient fit:** knows the next responsibility. **Doctor fit:** understands what is saved/shared/routed separately.
- **Distinctiveness potential:** a recognizable logic across roles, if it works without claiming a current unified timeline. Test source/state comprehension.

### T02 — The considered clinical instrument

- **Core idea / evidence:** professional precision can be humane; accepted consultation context and R07/R09 show useful service/task language.
- **Emotional feel / impression:** steady competence and deliberate control; serious medical utility.
- **Possible abstract characteristics:** exact alignment, clear hierarchy and dense information where needed, with breathing room where helpful; no font, color or grid chosen.
- **Risks / cliché:** hospital ERP, mechanical dashboard, overly sparse Patient view; precision may become coldness.
- **Arabic implications:** equal emphasis and legible medical numerals/units, not tiny Arabic beside dominant Latin.
- **Patient fit:** credible, if plain-language orientation survives. **Doctor fit:** strong potential for sustained work.
- **Distinctiveness potential:** quality of task hierarchy rather than clinical stock symbols. Test populated consultation and next-action recall.

### T03 — Familiar care in everyday language

- **Core idea / evidence:** contemporary Egyptian service familiarity, accepted CD01–CD06 and R01–R03/R12.
- **Emotional feel / impression:** respectful closeness, understandable without institutional distance.
- **Possible abstract characteristics:** expressive yet readable hierarchy and culturally familiar rhythm; no inherited folk ornament or chosen typographic style.
- **Risks / cliché:** over-casual consumer app, sentimental photography or copied fintech warmth.
- **Arabic implications:** Arabic authorship leads real tasks while English remains equally capable; no invented Arabic brand spelling.
- **Patient fit:** potentially strong personal recognition. **Doctor fit:** needs compact precise professional treatment without slang.
- **Distinctiveness potential:** ownable bilingual behavior. Validate with Egyptian readers rather than equating familiarity with universal preference.

### T04 — A record that explains itself

- **Core idea / evidence:** provenance and honest currentness from accepted source histories; R05/R07 show information-access framing.
- **Emotional feel / impression:** dependable memory, intelligible evidence and correction; accountable continuity.
- **Possible abstract characteristics:** clear source relationships and current/prior emphasis; no timeline, paper, folder or record-logo design selected.
- **Risks / cliché:** archive software, generic document icon or false “complete medical record” promise.
- **Arabic implications:** exact author/time/version labels with mixed-script isolation; no chronological reversal.
- **Patient fit:** understands what was actually shared. **Doctor fit:** reconciles current sources and corrections.
- **Distinctiveness potential:** visible accountability if it stays bounded to available sources. Test current versus superseded recognition without an I4 claim.

### T05 — Coordinated service, distinct responsibilities

- **Core idea / evidence:** one platform with role boundaries, accepted IA01/IA04 and R04/R13 ecosystem explanations.
- **Emotional feel / impression:** coherent, dependable infrastructure with human service responsibility.
- **Possible abstract characteristics:** consistent identity across differentiated task modes; relationships without universal-access imagery; no role palette or sub-brand system chosen.
- **Risks / cliché:** corporate network mark, hospital ownership, all-data hub or super-app feature dumping.
- **Arabic implications:** shared terminology with role-specific precise nouns; context switching must not change clinical meaning.
- **Patient fit:** care feels connected without exposing internal modules. **Doctor fit:** coherent work with exact scope; pharmacy/Admin remain bounded and Lab future.
- **Distinctiveness potential:** system breadth supported by honest handoffs. Test whether people falsely infer everyone can read the whole chart.

### T06 — Quiet reassurance through useful detail

- **Core idea / evidence:** reduce uncertainty through the right detail, accepted U02/U07/U10 and R07/R08 explanations.
- **Emotional feel / impression:** calm, attentive and considered rather than exclusive or luxurious.
- **Possible abstract characteristics:** restrained expression, emphasis on state and context, variable density by task; no neutral palette or minimal style selected.
- **Risks / cliché:** invisible actions, faint contrast, empty whitespace or premium-clinic exclusivity.
- **Arabic implications:** comfortable Arabic reading and full consequential copy, not shortening to fit an English-led composition.
- **Patient fit:** reassuring through comprehension, not “all clear.” **Doctor fit:** less competing decoration with retained safety detail.
- **Distinctiveness potential:** disciplined usefulness across interruption/error states. Test action discovery and uncertainty comprehension under realistic content load.

## Identity-system structural research

All structures remain eligible for future exploration; this is not a logo shortlist.

| Structure / concept | Potential fit | Risk / test |
| --- | --- | --- |
| Wordmark | Makes the unchanged name central | Long mixed-case name must remain readable; separately solve app-icon recognition |
| Symbol + wordmark | Independent small-space identifier plus full name | Stock healthcare symbol or a logo that only works with explanatory text |
| Monogram | Compact icon possibility | EH/other initials can collide with many brands; no abbreviation or product rename is approved |
| Abstract mark | Broad multi-role meaning | Generic SaaS/network mark unless silhouette and rationale are specific |
| Care/connection concept | Fits human responsibility and handoffs | Hearts/hands/nodes may be generic or imply universal sharing |
| Continuity concept | Relates to onward care | Generic infinity/360 arrows, compulsory loop or current I4 completeness implication |
| System/ecosystem concept | Holds multiple responsibilities together | Corporate infrastructure or hospital ERP, role badges mistaken for permission |
| Human-centered symbol | Makes the human-led nature visible | Infantilization, exclusion, savior figure or clinic-stock construction |
| Bilingual lockup | Tests Arabic and English presence in one identity | Invented transliteration, tiny subordinate Arabic, mixed direction collision; Arabic brand spelling requires owner decision |

**Name implications:** product remains **EgyHealth 360**. Spoken/video pronunciation may use **EgyHealth**; this does not authorize dropping 360 from the official identity. Explore length, name/360 hierarchy and recognition at small sizes without choosing a treatment. “360” must not imply comprehensive surveillance, complete records, guaranteed coverage or clinical readiness. A circle/infinity/rotation device is optional and carries cliché risk. Test full name beside Arabic product content, compact header and app icon; a standalone English wordmark is not an Arabic-reading test. No final lockup or new Arabic spelling is created here.

## Functional identity research criteria

**Logo:** distinctive, memorable, legible, clear silhouette, scalable, credible across Patient/Doctor/Pharmacy, not childish or clinic-stock. Must work monochrome, beside the English name and within Arabic product context, at app-icon/header sizes, without gradients or tiny detail. Assess cliché and similarity risk without claiming trademark clearance. No emergency service, pharmacy-only, AI diagnosis, government/hospital affiliation or unsupported medical function implication. [Next-stage logo contract](BRAND_EXPLORATION_BRIEF.md#logo-exploration-contract) requires at least six materially different concepts.

**Color — conceptual eligibility, no selection:** blue offers familiar category cues but similarity risk; teal bridges clinical/service warmth but overlaps V1 and pharmacy; green can suggest pharmacy/wellness or success; cyan can feel digital but becomes faint on light surfaces; purple may separate from common clinical conventions but can resemble fintech/AI; warm accents can humanize or become promotional/alarming; neutral-heavy approaches can emphasize information or become cold/low-contrast. Other credible approaches, including restrained multi-hue systems, remain open. These are hypotheses, not universal emotional meanings. Later work must prove contrast, trust interpretation, clinical clarity, Arabic/English parity, Patient warmth, Doctor seriousness, semantic-state distinction and accessibility. No hex values, final palette or primary color are defined.

**Typography:** evaluate Arabic joining, dots/diacritics, line-height/clipping, small labels, natural weight hierarchy, English readability, Latin digits and distinguishable characters, exact decimals/medical units, bilingual optical balance, patient reading and dense Doctor work. Test real accepted content, long names, mixed Latin medicine names and time offsets. Confirm web/screen availability, licensing, permitted distribution, fallback behavior, load budget and device rendering. W3C G03 supports script mechanics, not a font choice or Egyptian tone certification. No family is selected.

**Icons and illustrations:** functional icons must communicate a task with text and consistent semantics; test unfamiliar symbols with users. Mirror directional navigation when appropriate, never medicine, numbers, symbols or clinical sequence automatically. Define readable small-size/contrast and accessible-name needs. Illustration/photography may explain a task or show respectful people, but cannot invent clinical evidence, credentials, service delivery or implied normal results. No icon library, illustration style or photographic treatment is selected.

## Synthesis and unresolved evidence

Propose [care continuity people can understand](BRAND_STRATEGY.md) as essence, with clear, credible, human, calm, accountable, locally fluent, accessible and bounded-connected attributes. Anti-attributes are bureaucracy, coldness, childishness, alarmism, magic AI, tourist stereotypes and generic dashboard decoration. This is owner-reviewable strategy, not accepted identity.

Later work must test native Egyptian comprehension, patient/clinician impression, distinction from real competitors, small-size recognition, bilingual density and semantic safety. No favorable research finding may turn future Lab/I4 into current capability, extend clinical access, imply real-patient readiness or skip the owner gates. The next stage is defined in the [binding exploration brief](BRAND_EXPLORATION_BRIEF.md); it is not started by this PR.
