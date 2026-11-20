# EgyHealth 360 — Formal System Diagrams V1

> **V3 applicability:** Historical V1 diagram set; not the current V3 actor/module inventory or proof of implementation. Product V3 approves five future workspaces while retaining the single-application/modular-monolith stack. Existing diagrams are retained unchanged, including old exclusions/lifecycles; current domain/status/roadmap documents and accepted contracts govern. No visual product design or new diagram is introduced. See [approved policy/lineage](../PRODUCT_V3_DECISIONS.md).

These diagrams are architecture/documentation source-of-truth aids. They describe approved boundaries; they are not generated screenshots and do not override detailed requirements or ADRs.

## 1. System context

```mermaid
flowchart LR
    P[Patient]
    C[Clinician]
    A[Admin]

    W[EgyHealth 360 Web App]
    API[EgyHealth 360 API]
    DB[(PostgreSQL)]
    EW[Experiment Worker]
    SYN[Synthea FHIR R4 Dataset]

    P --> W
    C --> W
    A --> W
    W --> API
    API --> DB
    EW --> DB
    SYN --> EW
```

Key boundary: Core V1 has no live hospital/lab/pharmacy integration and no real-patient data dependency.

## 2. High-level component architecture

```mermaid
flowchart TB
    subgraph Apps
        WEB[apps/web\nNext.js + TypeScript]
        API[apps/api\nNestJS modular monolith]
        WORKER[apps/experiment-worker\nTypeScript]
    end

    subgraph Shared_Packages[Shared packages]
        CE[packages/closure-engine\nPure TypeScript EACCE]
        RULES[packages/clinical-rules\nVersioned rules]
        FHIR[packages/fhir-adapter\nFHIR R4 normalization]
        DBP[packages/db\nPrisma/PostgreSQL access]
        UI[packages/ui\nDesign-system primitives]
        CFG[packages/config\nShared tooling/config]
    end

    PG[(PostgreSQL 18)]

    WEB --> API
    WEB --> UI
    API --> CE
    API --> RULES
    API --> DBP
    API --> FHIR
    WORKER --> CE
    WORKER --> RULES
    WORKER --> FHIR
    WORKER --> DBP
    DBP --> PG

    CE -. must not import .-> API
    CE -. must not import .-> DBP
    CE -. must not import .-> WEB
```

Constraint: `closure-engine` is framework-independent and receives typed inputs only.

## 3. Product-domain boundaries

```mermaid
flowchart LR
    IAM[Identity & Access]
    PLAN[Clinical Planning]
    EVID[Clinical Evidence]
    CLOSE[Care Closure Intelligence]
    REVIEW[Clinician Review & Audit]
    RES[Research & Evaluation]

    IAM --> PLAN
    PLAN --> CLOSE
    EVID --> CLOSE
    CLOSE --> REVIEW
    PLAN --> RES
    EVID --> RES
    CLOSE --> RES
```

Research consumes versioned domain/rule logic but must not expose benchmark ground truth to product-facing execution.

## 4. Core product evaluation sequence

```mermaid
sequenceDiagram
    actor Clinician
    participant Web
    participant API
    participant DB
    participant Rules
    participant EACCE

    Clinician->>Web: Open Care Action Detail
    Web->>API: GET care action + current assessment
    API->>DB: Load action, plan, evidence, coverage, reviews
    API->>Rules: Load pinned rule version
    API->>EACCE: evaluate(action, evidence, coverage, rule, evaluation_time)
    EACCE-->>API: classification + reason + evidence trace
    API->>DB: Persist immutable ClosureAssessment if new evaluation required
    API-->>Web: Current effective assessment + explanation
    Web-->>Clinician: Show state, why, evidence, review status
```

## 5. New-evidence re-evaluation sequence

```mermaid
sequenceDiagram
    actor User as Patient/Clinician
    participant API
    participant DB
    participant EACCE

    User->>API: Submit new relevant evidence
    API->>DB: Validate authorization and persist source event
    API->>DB: Mark current assessment stale/superseded when relevant
    API->>DB: Load care action + evidence + coverage
    API->>EACCE: Re-evaluate using explicit evaluation_time
    EACCE-->>API: New classification/explanation
    API->>DB: Insert new immutable ClosureAssessment
    API-->>User: Return new effective state
```

Rule: old assessments are never overwritten.

## 6. Clinician override/review sequence

```mermaid
sequenceDiagram
    actor Clinician
    participant Web
    participant API
    participant DB

    Clinician->>Web: Confirm or override assessment
    Web->>API: Submit review + reason
    API->>DB: Verify clinician-patient relationship
    API->>DB: Preserve engine assessment unchanged
    API->>DB: Insert ClinicianAssessmentReview
    API->>DB: Append AuditLog
    API-->>Web: Return effective reviewed state
```

An override changes the effective reviewed status; it does not mutate the original engine result.

## 7. Care plan state machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> ACTIVE: activate
    DRAFT --> CANCELLED: cancel
    ACTIVE --> COMPLETED: complete
    ACTIVE --> CANCELLED: cancel
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Published/versioned templates are separate from individual patient care-plan lifecycle.

## 8. Care action operational state machine

```mermaid
stateDiagram-v2
    [*] --> PLANNED
    PLANNED --> ACTIVE: becomes applicable/active
    PLANNED --> CANCELLED: cancel
    ACTIVE --> COMPLETED: operational completion
    ACTIVE --> CANCELLED: cancel
    COMPLETED --> [*]
    CANCELLED --> [*]
```

Important: operational status is not the same field as EACCE closure classification.

## 9. Closure classification model

```mermaid
flowchart TD
    START[Evaluate care action]
    APP{Applicable?}
    DUE{Past due boundary?}
    COMP{Valid completion evidence?}
    SCHED{Valid future schedule evidence?}
    COV{Relevant coverage sufficient?}

    START --> APP
    APP -- No --> EX[EXEMPT]
    APP -- Yes --> COMP
    COMP -- Yes --> CO[COMPLETED]
    COMP -- No --> SCHED
    SCHED -- Yes --> SC[SCHEDULED]
    SCHED -- No --> DUE
    DUE -- No --> ND[NOT_DUE]
    DUE -- Yes --> COV
    COV -- No --> UN[UNCERTAIN]
    COV -- Yes --> TG[TRUE_GAP]
```

The exact implementation ordering must match the frozen engine contract/tests. Missing evidence alone is never sufficient for `TRUE_GAP` when relevant coverage is known insufficient.

## 10. Closure assessment lifecycle

```mermaid
stateDiagram-v2
    [*] --> CurrentAssessment
    CurrentAssessment --> ReviewedConfirmed: clinician confirms
    CurrentAssessment --> ReviewedOverridden: clinician overrides
    CurrentAssessment --> Superseded: relevant new evidence / re-evaluation
    ReviewedConfirmed --> Superseded: relevant new evidence / re-evaluation
    ReviewedOverridden --> Superseded: relevant new evidence / re-evaluation
    Superseded --> NewAssessment: insert new immutable assessment
```

Historical rows remain queryable/auditable.

## 11. Simplified logical ERD

```mermaid
erDiagram
    USER ||--o| PATIENT_PROFILE : has
    USER ||--o| CLINICIAN_PROFILE : has
    CLINICIAN_PROFILE ||--o{ CLINICIAN_PATIENT_ASSIGNMENT : receives
    PATIENT_PROFILE ||--o{ CLINICIAN_PATIENT_ASSIGNMENT : has

    GUIDELINE_SOURCE ||--o{ CARE_PLAN_TEMPLATE : supports
    CARE_PLAN_TEMPLATE ||--o{ CARE_RULE_DEFINITION : contains
    CARE_PLAN_TEMPLATE ||--o{ CARE_PLAN : instantiates
    PATIENT_PROFILE ||--o{ CARE_PLAN : owns
    CARE_PLAN ||--o{ CARE_ACTION : contains
    CARE_RULE_DEFINITION ||--o{ CARE_ACTION : generates

    PATIENT_PROFILE ||--o{ BP_MEASUREMENT : has
    PATIENT_PROFILE ||--o{ FOLLOWUP_APPOINTMENT : has
    PATIENT_PROFILE ||--o{ CLINICAL_ENCOUNTER : has
    PATIENT_PROFILE ||--o{ RECORD_COVERAGE_WINDOW : has

    CARE_ACTION ||--o{ CLOSURE_ASSESSMENT : evaluated_by
    CLOSURE_ASSESSMENT ||--o{ ASSESSMENT_EVIDENCE : explains
    CLOSURE_ASSESSMENT ||--o{ CLINICIAN_ASSESSMENT_REVIEW : reviewed_by

    EXPERIMENT_RUN ||--o{ BENCHMARK_CASE : contains
    BENCHMARK_CASE ||--o{ CORRUPTION_EVENT : corrupted_by
    BENCHMARK_CASE ||--o{ ENGINE_PREDICTION : produces
    EXPERIMENT_RUN ||--o{ EVALUATION_METRIC : reports
```

This is conceptual. Executable Prisma constraints remain governed by `DATA_MODEL.md` and future migration issues.

## 12. Research pipeline

```mermaid
flowchart LR
    S[Synthea v4.0.0\nFHIR R4]
    N[FHIR Normalization]
    EL[Eligibility + Index Case]
    GT[Complete-record\nGround Truth]
    COR[Controlled Corruption]
    OBS[Observed Case Input]

    B0[B0 Naive]
    B1[B1 Coverage-blind]
    P1[P1 EACCE]
    MET[Paired Metrics]

    S --> N --> EL
    EL --> GT
    EL --> COR --> OBS
    OBS --> B0
    OBS --> B1
    OBS --> P1
    GT --> MET
    B0 --> MET
    B1 --> MET
    P1 --> MET
```

Ground truth is created before corruption and must never flow into method input.

## 13. Ground-truth trust boundary

```mermaid
flowchart TB
    subgraph Hidden_Research_Truth[Hidden research truth]
        GT[BenchmarkGroundTruth]
    end

    subgraph Observable_Input[Method-visible data]
        O[ObservedCaseInput]
        C[Coverage metadata when observable]
    end

    B0[B0]
    B1[B1]
    E[EACCE]
    M[Evaluator]

    O --> B0
    O --> B1
    O --> E
    C --> E
    GT --> M
    B0 --> M
    B1 --> M
    E --> M

    GT -. forbidden .-> B0
    GT -. forbidden .-> B1
    GT -. forbidden .-> E
```

## 14. Authorization/trust boundaries

```mermaid
flowchart LR
    Browser[Untrusted Browser]
    API[Trusted API Boundary]
    DB[(Private Database)]
    Engine[Pure EACCE Package]

    Browser -->|session cookie + CSRF protected requests| API
    API -->|validated authorized operations| DB
    API -->|typed server-constructed input| Engine
    Engine -->|deterministic result| API
```

Never trust browser-supplied patient identity, ownership, assessment status, or authorization decisions.

## 15. Local deployment diagram

```mermaid
flowchart TB
    Host[Developer / Demo Host]

    subgraph Docker_Compose[Docker Compose]
        WEB[web container]
        API[api container]
        WORKER[experiment-worker container]
        PG[(postgres:18)]
    end

    Browser --> WEB
    WEB --> API
    API --> PG
    WORKER --> PG
```

No Kubernetes, Redis, Kafka, RabbitMQ, or paid external service is required for Core V1.

## 16. Use-case overview

```mermaid
flowchart LR
    P((Patient))
    C((Clinician))
    A((Admin))

    U1[View next care action]
    U2[View care plan]
    U3[Add BP measurement]
    U4[View assigned patients]
    U5[Inspect care-action explanation]
    U6[Confirm/override assessment]
    U7[Manage demo users/data]
    U8[Run synthetic evaluation]
    U9[View experiment results]

    P --> U1
    P --> U2
    P --> U3

    C --> U4
    C --> U5
    C --> U6

    A --> U7
    A --> U8
    A --> U9
```

No user role includes diagnosis automation or treatment recommendation.

## 17. Diagram change policy
Any implementation that materially contradicts these diagrams must either:
1. be corrected to match approved architecture; or
2. receive an approved ADR/requirements update and corresponding diagram revision before merge.
