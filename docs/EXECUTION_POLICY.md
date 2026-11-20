# EgyHealth 360 — Execution Policy

> Stable execution constraints. [FOUNDATION_CHARTER](FOUNDATION_CHARTER.md) governs decision rights, source priority, future Product/Design gates and milestone health review; [CURRENT_STATUS](CURRENT_STATUS.md) owns mutable task state. CI is technical evidence and does not approve Product/UX/Design.

## Purpose
This policy defines how the graduation project is executed and what the student team is, and is not, required to do.

## Core execution model
EgyHealth 360 is an AI-agent-executed graduation project. Implementation, testing, documentation drafting, research synthesis, diagrams, data-pipeline construction, and iterative technical review are performed by AI agents working against the repository source of truth, GitHub Issues, Pull Requests, and automated checks.

The student team acts as project coordinators, presenters, and decision owners. Team members are not required to manually implement code, manually review source code line-by-line, or independently solve technical defects for the project to progress.

## No fieldwork dependency
The project must not depend on primary field research such as:
- visiting doctors, clinics, hospitals, laboratories, or pharmacies;
- interviewing clinicians or patients;
- running surveys or focus groups;
- obtaining private medical records;
- collecting real patient data;
- asking external medical professionals to validate the implementation as a prerequisite for progress.

Problem validation, competitor analysis, clinical-rule sourcing, and research design should use desk research, authoritative public sources, published literature, standards, and public/synthetic datasets.

If the academic supervisor explicitly requires primary research or external expert validation, that requirement must be recorded as a new project constraint before any such activity is planned. It is not part of the default project methodology.

## Clinical knowledge boundary
Students and AI agents must not invent medical rules. Clinical rules must come from authoritative published sources and remain traceable to source, version, section/page when available, human-readable interpretation, machine representation, and tests. Ambiguous rules remain unresolved rather than being guessed.

No individual student is expected to personally possess medical expertise sufficient to validate clinical rules from memory.

## Data policy
Product V3 clinical research and demos use synthetic patient data only. Public literature, standards and other non-patient reference material support desk research; they do not authorize real-patient records or deployment. The approved V3 policy preserves the synthetic/free-first graduation boundary and makes no production identity-assurance or clinical-validation claim. See [approved policy and lineage](PRODUCT_V3_DECISIONS.md).

Synthetic datasets, including Synthea-generated longitudinal records, are the default research substrate for benchmark generation, corruption experiments, reproducibility, and demo scenarios.

## Human responsibilities
The student team is responsible for:
- understanding the project concept, contribution, architecture, methodology, results, limitations, and demo well enough to present and defend it;
- making product/scope decisions when requested;
- coordinating submissions, meetings, and supervisor feedback;
- ensuring final deliverables accurately reflect the implemented project and its evidence.

The team is not required to:
- write production code by hand;
- perform manual code review as the primary quality mechanism;
- debug framework/toolchain problems without agent support;
- visit medical professionals for routine validation;
- gather private or real-world patient data.

## Quality assurance model
Quality is established through repository documentation, automated tests, CI, reproducible experiments, acceptance criteria, security checks, and independent second-pass AI review for high-risk areas.

No feature is considered complete solely because an AI agent claims it is complete.

## Academic method boundary
The project is a computational and engineering graduation prototype. Its evaluation is based on documented desk research, authoritative clinical sources, synthetic longitudinal data, controlled experiments, reproducibility, and measured software behavior.

It does not claim real-world clinical validation unless such validation is actually performed and documented.
