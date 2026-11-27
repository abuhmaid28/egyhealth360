# Progressive reference map

S1 candidate support material, not a new contract. Start with [AGENTS](../../AGENTS.md),
current GitHub issue/owner authorization, [status](../CURRENT_STATUS.md),
[charter](../FOUNDATION_CHARTER.md) and [source index](../SOURCE_OF_TRUTH.md).
Load the rows relevant to the task, not every historical report.

| Task | References to load next | Acceptance / limit |
| --- | --- | --- |
| Role/task UX | [UX foundation](../UX_FOUNDATION.md), [journeys](../USER_JOURNEYS.md), [decisions](../UX_DECISION_REGISTER.md) | [UXD10–UXD16 acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6565530772); UXD19 is planning only |
| Navigation/destinations | [IA](../INFORMATION_ARCHITECTURE.md), [sitemaps](../IA_SITEMAPS.md), [IA decisions](../IA_DECISION_REGISTER.md) | [IA01–IA05 and Patient/Clinician B acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6567526978) |
| Bilingual content | [Content](../CONTENT_SYSTEM.md), [Arabic UX](../ARABIC_UX.md), [glossary](../TERMINOLOGY_GLOSSARY.md) | [CD01–CD07 acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568210676); natural Egyptian Arabic, Latin digits, named Gregorian months, 24-hour actual event/clinic timezone |
| Brand exploration | [Strategy](../BRAND_STRATEGY.md), [decisions](../BRAND_DECISION_REGISTER.md), [reference rights/observations](../BRAND_REFERENCE_MAP.md) | [BR01–BR08 acceptance](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6568574368); no final logo/type/palette or winner follows |
| Patient My Care | [Owner entry/precedence](../ui-reference/README_START_HERE.md), [spec](../ui-reference/PREMIUM_SYNTHESIS_SPEC.md), [composition](../ui-reference/PATIENT_MY_CARE_COMPOSITION.md), [optical evidence](../ui-reference/PATIENT_MY_CARE_POLISH.md) | Approved bounded slice, merged through #79; SVG contains illustrative unsupported data, written semantic constraints control; no global brand freeze |
| Clinician consultation | [Master](../ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md), [execution contract](../ui-reference/CLINICIAN_ACTIVE_CONSULTATION_CODEX_PROMPT.md), [premium evidence](../ui-reference/CLINICIAN_PATIENT_DNA_PREMIUM.md) | #80 merged; [original visual approval](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6603761429), [bounded premium direction](https://github.com/abuhmaid28/egyhealth360/pull/80#issuecomment-6604240346). Do not infer acceptance beyond the recorded scope |
| Authority/privacy | [Security](../SECURITY.md), [I1](../V3_I1_CONTRACT.md), relevant [I2](../V3_I2_CONTRACT.md) sections 9–13 | Current assignment is clinical grant; booking is logistics; own-patient privacy; independent private sign, summary release, follow-up release and close |
| Prescriptions/fulfillment | [I3](../V3_I3_CONTRACT.md), [pharmacy slice](../V3_I3_SLICE2.md) | Exact current routed-artifact/org/membership authority, full-item supply only; Lab future; Admin operational only |
| Current rendered behavior | Candidate source/tests, [staging polish evidence](../STAGING_UI_POLISH.md) | Pin source/commit; controlled browser evidence does not establish deployment parity or product acceptance |
| Visual history | [D/E/F comparison](../visual-directions-v2/COMPARISON.md), [PR #86](https://github.com/abuhmaid28/egyhealth360/pull/86) at `7bd1d03195185b19b6ed869fb2e5ced51b4cb9b3` | A/B/C rejected; D/E/F unselected; H/P unselected. #86 files are absent on main: use pinned remote evidence only if relevant; do not merge or import tokens |

Old pending/status text in accepted documents records adoption-time history;
the explicit scoped acceptance controls. Implementation proves existence, not
permission. A genuine conflict needs a cited disposition, not a guessed policy.
NOVA appears in the S1 owner constraint but was not identified in baseline
repository text; preserve the constraint and resolve its meaning only if a task
would depend on replacing it. No deferred Skill is created.
