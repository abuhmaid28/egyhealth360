# EgyHealth 360 — Related Work Matrix V1

## Purpose
This matrix positions EgyHealth 360 against both academic work and commercial systems. It prevents unsupported novelty claims and makes the project’s actual contribution explicit.

## A. Academic / Standards Related Work

| Work | Focus | Data / Setting | What it proves or contributes | Limitation relative to EgyHealth 360 | Project implication |
|---|---|---|---|---|---|
| Smith et al., JAMA 2005 — Missing clinical information during primary care visits | Missing information in primary care | 1,614 visits, 32 primary-care clinics | Missing clinical information is common; much of it may exist outside the local system | Does not design a care-action closure engine | Supports treating observed absence cautiously |
| Noureldin et al., EMHJ 2014 — Alexandria EMR documentation quality | Completeness/accuracy of Egyptian primary-care e-records | Primary-care units in Alexandria | Clinical documentation completeness and accuracy vary | Older study; not a care-gap algorithm | Provides local Egyptian evidence that records can be incomplete/inaccurate |
| Youssef et al., Egypt Heart J 2022 — Hypertension follow-up non-compliance | Missed follow-up in Egyptian hypertension care | 3,014 eligible patients across 9 university hospitals | Follow-up adherence is a real operational problem | Does not distinguish missing records from truly missed care | Supports hypertension follow-up as initial domain |
| Strategies for Handling Missing Data in EHR Derived Data (2015) | Missing-data methodology | EHR-derived research | Missing vs negative/undocumented can be difficult to distinguish | Primarily statistical methods, not care-action workflow | Supports explicit uncertainty rather than naive absence assumptions |
| Why Is the EHR So Challenging for Research and Clinical Care? (2022) | EHR data-generation mechanisms | Routine clinical data | Availability is driven by care/administrative workflows rather than research protocol | Broad methodological paper | Supports contextual interpretation of missingness |
| Persistent Cardiometabolic Health Gaps (2021/2022) | Therapeutic care-gap attribution | 240,582 primary-care patients | 9–21% of care gaps were uncertain because evidence was insufficient for attribution | Not designed as controlled synthetic missingness benchmark; different care-gap formulation | Most important direct related work; prevents claiming uncertainty as novel |
| EHR missing-data review (2023) | Missing-data methods in EHR epidemiology | Literature review | Missing-data handling remains methodologically challenging | Not focused on closure workflows | Justifies formal missingness experiments |
| Walonoski et al., JAMIA 2018 — Synthea | Synthetic patient generation | Synthetic longitudinal health records | Scalable synthetic records in FHIR/other standards | Synthetic != real clinical validation | Supports reproducible benchmark substrate |
| Chen et al., BMC MIDM 2019 — Synthea validity | Validation of Synthea | ~1.2M synthetic Massachusetts patients | Demonstrates strengths and significant realism limitations | Limited modeling of heterogeneous outcomes/deviations | Requires explicit synthetic-data limitation statement |
| HL7 FHIR R4 Provenance | Data provenance standard | Interoperability standard | Formal metadata for origin/activity/trust/reproducibility | Standard, not decision algorithm | Supports source/provenance fields and adapter mapping |
| HL7 DataAbsentReason | Explicit absence semantics | Interoperability terminology | Encodes why normally expected information is absent | Element-level absence does not solve whole-record coverage | Supports distinction between known missingness and silent missingness |
| WHO Hypertension Guideline 2021 | Hypertension management/follow-up | Global guideline | Provides evidence-based follow-up intervals and treatment guidance | Clinical recommendations require precise extraction before coding | Candidate authoritative source for care-action timing |
| WHO HEARTS | Standardized hypertension/CVD primary-care management | Global / LMIC primary care | Protocol, monitoring, continuity-of-care concepts | Not an executable software rule set | Source for rule extraction, not code copy |
| WHO Hypertension Terminology Compendium 2026 | Standardized hypertension programme terminology | Global hypertension programmes | Defines monitoring/service-delivery/continuity terms | Terminology, not complete executable protocol | Strengthens consistent research and UI terminology |

## B. Commercial / Product Related Work

| System | Existing relevant capability | Why it matters | What EgyHealth 360 must NOT claim | Remaining research angle |
|---|---|---|---|---|
| Epic | Automatically identifies care gaps; chronic/preventive monitoring; external/claims data; outreach; imported gap data; next-step workflows | Demonstrates mature care-gap functionality at enterprise level | Do not claim care-gap detection, chronic monitoring, or external-data aggregation as unique | Controlled evaluation of evidence-aware abstention under deliberately incomplete observed records |
| Oracle Health Quality Management | Targeted care-gap closure recommendations using patient history and upcoming appointments | Shows history + scheduling + targeted recommendations already exist commercially | Do not claim prioritization or use of upcoming appointments as novel | Transparent deterministic closure states + research benchmark |
| athenahealth | Care/diagnosis gaps; payer/claims/third-party data; outside-care visibility; workflow integration | Shows commercial systems actively integrate external evidence to close gaps | Do not claim “true care gaps” or external-data reconciliation broadly as unique | Explicit controlled comparison of naive absence vs evidence-aware uncertainty |
| SehaFile | Patient recalls, scheduled follow-up, overdue tracking, contact workflow | Locally relevant example of follow-up tracking | Do not claim reminders/overdue follow-up tracking as unique | Difference lies in evidence sufficiency/uncertainty and experimental evaluation |

## C. Direct Positioning

### Existing approaches already solve
- scheduling and reminders;
- overdue follow-up lists;
- care-gap dashboards;
- chronic-care monitoring;
- patient outreach;
- aggregation/import of outside data;
- some use of patient history and future appointments;
- clinical decision support around gaps.

### The project should therefore focus on
- explicit separation between operational action status and time-specific closure assessment;
- immutable assessment history;
- record-coverage-aware closure logic;
- `UNCERTAIN` as abstention when observed evidence is insufficient;
- distinction between observable and silent missingness;
- reproducible controlled-corruption benchmark;
- baseline vs proposed paired comparison;
- false-gap rate + true-gap precision/recall + decision coverage;
- explanation/evidence trace for every classification.

## D. Novelty Boundary

### We are NOT claiming novelty in
- care gaps;
- follow-up reminders;
- chronic disease management;
- EHR timelines;
- interoperability;
- provenance;
- uncertainty as a general concept;
- synthetic data;
- FHIR;
- hypertension protocols.

### The defendable contribution is the combination of
1. a deterministic evidence-aware closure method;
2. explicit relevant-record coverage reasoning;
3. abstention under insufficient observed evidence;
4. controlled corruption of complete synthetic longitudinal records;
5. paired baseline comparison under multiple missingness families and levels;
6. explainable outputs and immutable assessment history;
7. a working end-to-end product prototype demonstrating the method.

## E. Main Academic Defense Sentence

> Prior work and commercial systems already demonstrate the importance of care-gap detection, follow-up management, interoperability, and external-data aggregation. EgyHealth 360 does not attempt to replace these systems. Its contribution is to design and experimentally evaluate an explainable care-action closure method that explicitly represents insufficient evidence and measures how that behavior affects false-gap classification as longitudinal records become incomplete.

## F. Open Questions for Pass 2

These remain to be resolved before the deep-planning gate closes:

1. Which exact hypertension follow-up action(s) become the first executable rule set?
2. Which WHO source/version/section is authoritative for each timing rule?
3. How exactly will `RecordCoverageWindow` be generated in synthetic benchmark cases?
4. What percentage or pattern of silent missingness should be included in the final matrix?
5. Is there a stronger academic baseline beyond the intentionally naive overdue+absence baseline that should be included as a secondary comparator?
6. How should abstention quality be reported beyond decision coverage (e.g., risk-coverage curve or selective-risk style analysis) without overcomplicating the graduation scope?

## Status
Related Work Matrix V1: **complete**, with the open questions above intentionally carried into the research-protocol and clinical-rule audit stages.
