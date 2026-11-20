# EgyHealth 360 — Competitor Evidence Matrix V1

> **V3 applicability:** V3 context: this matrix retains historical evidence and Layer C research positioning. The integrated journey is the product center; the narrow question differentiates it rather than defining the whole platform. The EgyHealth 360 comparison column is a planned V2 design target, **not verified implemented capability**; EACCE/FHIR/evaluation remain unimplemented. No competitor evidence was refreshed in this documentation reconciliation. See [approved policy/lineage](../PRODUCT_V3_DECISIONS.md).

## Purpose
Document what existing local/global healthcare systems already do so EgyHealth 360 does not claim common capabilities as novel.

This matrix is based on desk research from official/current product documentation where available. It is not based on field interviews.

## Competitors reviewed
- Epic
- Oracle Health
- athenahealth
- DIME (Egypt)
- SehaFile (Egypt)

## Evidence matrix

| System | Market / orientation | Evidence-backed capabilities relevant to our scope | What this means for EgyHealth 360 |
|---|---|---|---|
| Epic | Global enterprise EHR / ambulatory / population health | Primary Care Health Maintenance can automatically identify and act on care gaps, keep patients current on preventive/chronic care, schedule outreach, and track ongoing tasks | We cannot claim that identifying care gaps, chronic-care task tracking, outreach, or follow-up management is novel |
| Oracle Health | Global enterprise EHR / quality management | Recommendations exposes care gaps and patient-history context; users can adjust due dates/frequencies and satisfy recommendations. 2026 Quality Management adds targeted care-gap closure recommendations using patient history and upcoming appointments | We cannot claim that guideline-aware care-gap recommendations, prioritization, patient-history use, or future-appointment-aware closure is novel |
| athenahealth | Global ambulatory / payer-provider network | Surfaces payer/claims/third-party data, care and diagnosis gaps, and external clinical data inside workflows; promotes care-gap closure and data exchange across sites | We cannot claim that external-data-aware care-gap surfacing or integrated clinical workflow is novel |
| DIME | Egypt-focused HIS/EMR/HIE/clinical-memory platform | Longitudinal structured records, FHIR R4, patient timeline, follow-up visibility, overdue follow-up, medication tracking, clinical alerts, guideline matching/risk scoring, cross-facility record unification | We cannot claim that unified longitudinal records, follow-up tracking, overdue alerts, FHIR-based interoperability, or clinical decision support are unique in Egypt |
| SehaFile | Egypt clinic-management / EMR | Patient recalls, scheduled follow-up, overdue tracking, status progression, contact attempts, BP recheck examples, chronic-check workflows | We cannot claim that appointment/follow-up reminders or overdue follow-up lists are novel in Egyptian clinic software |

## Competitor-by-capability view

Legend:
- YES — capability explicitly evidenced in reviewed material
- PARTIAL — adjacent capability evidenced but not identical to our research focus
- NOT VERIFIED — not established by the reviewed public material; this does not prove absence

| Capability | Epic | Oracle Health | athenahealth | DIME | SehaFile | EgyHealth 360 Core V1 |
|---|---:|---:|---:|---:|---:|---:|
| Longitudinal patient record | YES | YES | YES | YES | PARTIAL | PARTIAL / focused |
| Follow-up tracking | YES | YES | PARTIAL | YES | YES | YES |
| Overdue care/follow-up detection | YES | YES | YES | YES | YES | YES |
| Care-gap list | YES | YES | YES | YES / adjacent | PARTIAL | YES |
| Future appointment/schedule context | YES / scheduling workflows | YES | PARTIAL | YES | YES | YES |
| External/multi-source data | YES | YES | YES | YES | NOT VERIFIED | Synthetic/research only in V1 |
| FHIR/interoperability | YES | YES | YES | YES | NOT VERIFIED | FHIR R4 adapter |
| Explainable reason/evidence trace for closure classification | NOT VERIFIED | PARTIAL | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | YES by design |
| Explicit record-coverage reasoning | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | YES by design |
| `UNCERTAIN` abstention when evidence coverage is insufficient | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | YES by design |
| Controlled missingness benchmark with hidden complete-record ground truth | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | YES, research contribution |
| Open reproducible baseline-vs-proposed evaluation | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | YES, research contribution |

Important: `NOT VERIFIED` means the reviewed public documentation did not establish the capability. It must never be presented as proof that the competitor lacks it internally.

## Strongest competitive pressure

### DIME
DIME is the most important local comparator because it directly challenges weak differentiation statements such as:
- "all patient data in one place";
- "continuous health journey";
- "longitudinal record";
- "follow-up visibility";
- "FHIR-based connected healthcare";
- "AI-supported clinical intelligence".

Those statements cannot serve as the project USP.

### Oracle Health
Oracle's 2026 care-gap closure feature is important because it uses patient history and upcoming appointment information for targeted care-gap closure recommendations. This means future-schedule awareness and next-action recommendation are not sufficient differentiation by themselves.

### Epic / athenahealth
Both demonstrate that mature EHR ecosystems already identify care gaps and surface relevant longitudinal/external data in care workflows.

## Defensible project differentiation
EgyHealth 360 should be positioned as a graduation research prototype investigating a narrow question:

> When the available longitudinal record is incomplete, can a deterministic and explainable closure engine reduce false confirmed care-gap classifications by distinguishing absent completion evidence from insufficient evidence coverage?

The differentiation is therefore not:
- having care gaps;
- having a patient timeline;
- having reminders;
- having follow-up lists;
- using FHIR;
- using AI in healthcare;
- providing a next action.

The differentiation is the combination of:
1. explicit evidence/coverage reasoning;
2. `UNCERTAIN` abstention rather than forced gap confirmation;
3. immutable explanation/evidence trace;
4. controlled synthetic missingness benchmark;
5. hidden complete-record ground truth;
6. paired comparison against coverage-blind detectors;
7. reproducible research methodology.

## Supervisor-defense framing
If asked "Why does this project have a place if Epic/DIME/Oracle already do care gaps?":

The answer is not that those products cannot track gaps. They can. The project studies a specific reliability problem that appears when care-gap logic operates on incomplete longitudinal evidence. The contribution is a transparent, reproducible method and benchmark for deciding when the system should confirm a gap versus abstain because evidence coverage is insufficient.

## Claims we must avoid
- "First care-gap system in Egypt."
- "No competitor handles follow-up."
- "No competitor uses future appointments."
- "No competitor uses FHIR."
- "No competitor has longitudinal records."
- "No competitor uses AI for care gaps."
- "Competitors definitely do not reason about missingness" unless independently verified from their technical documentation.

## Evidence-maintenance rule
Competitor evidence is time-sensitive. Before final presentation/thesis submission, refresh the official-source checks and date the matrix. Product claims must be phrased according to what is actually verified at that time.
