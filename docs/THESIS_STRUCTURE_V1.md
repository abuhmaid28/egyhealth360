# EgyHealth 360 — Graduation Thesis / Report Structure V1

## Goal
Start the academic report now and evolve it with the implementation instead of writing it at the end.

## Proposed structure

### Chapter 1 — Introduction
- healthcare continuity problem
- longitudinal-record incompleteness problem
- motivation
- project scope
- research objective
- research questions
- contribution summary
- report organization

Evidence needed:
- Egypt/chronic-care context
- incomplete-record/care-gap literature
- supervisor problem framing

### Chapter 2 — Background and Related Work
- care gaps and chronic-care follow-up
- longitudinal EHR fragmentation/incompleteness
- uncertainty/abstention concepts in decision systems
- FHIR and interoperable health records
- synthetic health data and Synthea
- competitor/product systems
- related academic work matrix

Deliverables already started:
- `docs/research/LITERATURE_REVIEW.md`
- `docs/research/RELATED_WORK_MATRIX.md`
- `docs/research/COMPETITOR_EVIDENCE_MATRIX.md`

### Chapter 3 — Problem Definition and Requirements
- final problem statement
- actors and scope
- functional requirements
- business rules
- non-functional requirements
- explicit non-goals
- traceability strategy

Sources:
- `PRODUCT.md`
- `REQUIREMENTS.md`
- `TRACEABILITY_MATRIX_V1.md`

### Chapter 4 — Methodology
- research design
- CR-HTN-FU-001 clinical source
- Synthea/FHIR data source
- eligibility
- ground-truth construction
- corruption families
- observable vs silent missingness
- B0/B1/P1 methods
- metrics
- statistical analysis
- holdout/freeze policy
- research-integrity controls

Sources:
- `CLINICAL_RULE_SOURCE_AUDIT.md`
- `CLINICAL_RULE_CATALOG_V1.md`
- `EXPERIMENT_PROTOCOL_V1.md`
- `METRICS_SPEC_V1.md`

### Chapter 5 — System Analysis and Design
- system context
- architecture
- modular-monolith rationale
- domain boundaries
- data model
- EACCE contract
- security model
- UX architecture/design system
- state machines
- sequence diagrams
- deployment model

Sources:
- `ARCHITECTURE.md`
- `DOMAIN.md`
- `DATA_MODEL.md`
- `SECURITY.md`
- `UX.md`
- `DESIGN_SYSTEM.md`
- `diagrams/SYSTEM_DIAGRAMS_V1.md`

### Chapter 6 — Implementation
Write progressively as milestones merge.

Suggested sections:
- monorepo/tooling
- identity/session/authorization
- clinical planning/evidence
- closure engine
- clinician/patient frontend
- FHIR adapter
- experiment worker
- evaluation lab
- CI/testing infrastructure

Rule: report only what is actually implemented; do not copy planned architecture as completed implementation.

### Chapter 7 — Verification and Testing
- test strategy
- unit/integration/E2E
- authorization/IDOR
- closure-engine golden cases
- migration/data integrity
- accessibility
- research-integrity tests
- reproducibility checks

### Chapter 8 — Experimental Results
Populated only from locked, real runs.

Required:
- dataset/manifest
- configuration
- raw counts
- false-gap rate
- true-gap recall/precision/F1 where defined
- decision coverage/abstention
- plots by corruption family/level
- observable vs silent results
- confidence intervals
- paired statistical comparison

No placeholder metrics.

### Chapter 9 — Discussion
- answer each research question
- interpret false-gap/coverage trade-off
- compare B0/B1/P1
- explain silent-missingness limitation
- relation to previous work/products
- engineering lessons
- threats to validity

### Chapter 10 — Security, Safety, Ethics and Limitations
- synthetic-only data policy
- no real-patient validation
- no diagnosis/treatment scope
- access control
- clinical-rule sourcing
- ground-truth isolation
- dataset limitations
- external validity
- no claims of clinical effectiveness

### Chapter 11 — Future Work
Potential, not promised:
- additional chronic diseases
- real-world validation if institutionally approved
- external integrations
- richer provenance/coverage inference
- learned uncertainty models only if justified
- broader FHIR profiles

### Chapter 12 — Conclusion
- problem
- method
- measured contribution
- outcome
- limitations

## Appendices
- requirement traceability
- clinical rule table
- ADR summary
- experiment configs
- API/OpenAPI excerpts
- selected test matrix
- screenshots of final critical flows
- reproducibility instructions

## Writing policy
- distinguish planned, implemented, and evaluated work;
- every factual medical/market claim needs a source;
- every metric must come from a saved experiment run;
- do not claim novelty stronger than evidence supports;
- do not claim clinical validation;
- update chapters after each milestone rather than at project end.

## Evidence status tags for drafting
Use these internal tags while writing drafts:
- `[SOURCE-VERIFIED]`
- `[IMPLEMENTED]`
- `[EXPERIMENT-VERIFIED]`
- `[PLANNED]`
- `[LIMITATION]`

Remove internal tags only when the final report is prepared, after verifying the statement's status.
