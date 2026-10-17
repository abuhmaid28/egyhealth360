# EH-015 — M2 Observed Clinical Applicability Foundation Contract

## 1. Context and Authoritative References
- **Milestone:** Milestone M2 — Clinical Planning & Evidence (Step 6 / Foundation Slice B1)
- **GitHub Issue:** #29 (`EH-015 — M2 Observed Clinical Applicability Foundation`)
- **Primary Blocked Issue:** #28 (`EH-014 — M2 Hypertension Care Action Generation Foundation`)
- **Approved Baseline Commit:** `40f3a0ecd64e0d9fe2389c9bd3efea4acaa63591` on `origin/main`
- **Feature Branch:** `feature/EH-015-m2-observed-clinical-applicability`
- **Authoritative Gates:** Issue #29 final implementation plan (comment `6242326017`) and independent second-pass re-review (comment `6242398457`)
- **Architecture Decision Record:** ADR-028 (`docs/DECISIONS.md`)

---

## 2. Approved Scope vs. Explicitly Deferred Scope

### Approved Scope (EH-015 — Foundation Slice B1)
1. **ObservedClinicalApplicabilitySnapshot Model:** Single persisted Prisma model and PostgreSQL table with exactly 15 scalar fields representing point-in-time clinical applicability assertions.
2. **ObservedClinicalApplicabilityRetraction Model:** Single persisted Prisma model and PostgreSQL table with exactly 9 scalar fields representing terminal one-to-one withdrawals of previously asserted snapshots.
3. **Four Strict Enums:**
   - `observed_applicability_source_type`: `SYNTHETIC_OBSERVED_INPUT`
   - `observed_age_assertion_state`: `NO_ASSERTION`, `UNKNOWN`, `ASSERTED_VALUE`
   - `observed_pregnancy_status`: `PREGNANT`, `NOT_PREGNANT`, `UNKNOWN`
   - `observed_condition_status`: `PRESENT`, `ABSENT`, `UNKNOWN`
4. **Discriminated Age Contract:** Explicit state machine where `NO_ASSERTION` and `UNKNOWN` require `NULL` age, and `ASSERTED_VALUE` requires an integer $\ge 0$ (bounded $[0 \dots 2147483647]$).
5. **Exact Source Identity Partitioning:** Natural key `(patientId, sourceType, sourceReference, assertionReference)` enforced by composite unique constraints with binary ASCII collation (`COLLATE "C"`).
6. **Database Immutability & Foreign Key Guards:** Database triggers rejecting SQL `UPDATE`, `DELETE`, and `TRUNCATE` operations on both snapshots and retractions; composite foreign key enforcing identical partition keys between retraction and target snapshot.
7. **Research Noninterference & Missingness Preservation:** Inaccessible research ground truth never backfills missing observed fields (`NULL` is strictly preserved; never infer `ABSENT` or `UNKNOWN`).
8. **Internal Synthetic Observed-Input Writer:** Transactional machine writer with deterministic idempotency (`ON CONFLICT DO NOTHING`) and conflict detection (`APPLICABILITY_CONFLICT`). Zero product `AuditLog` rows created.
9. **Authorized Single-Statement Query Service:** Read-only authorized query service with canonical user/session/assignment lock discipline returning point-in-time `ObservedApplicabilityPoint` with mechanical tuple comparison (`NO_NON_RETRACTED_ROWS`, `IDENTICAL_TUPLES`, `DIFFERING_TUPLES`).
10. **Zero Public HTTP Routes:** Zero public endpoints added; `docs/openapi.json` left byte-for-byte identical.

### Explicitly Deferred Scope (Out of Scope for EH-015)
- **Slice B2:** Blood pressure measurement qualification and selection logic.
- **Slice B3:** Expected care action occurrence, timing, and retrigger evaluation.
- **Slice B4:** Blood pressure evidence invalidation and correction handling.
- **CareAction generation & persistence:** Remains blocked on subsequent foundation gates.
- **EACCE decision engine:** Classification states (`NOT_DUE`, `COMPLETED`, `SCHEDULED`, `TRUE_GAP`, `UNCERTAIN`, `EXEMPT`) belong to Milestone M3.
- **FHIR / Synthea ingestion pipeline:** Belongs to Milestone M5.
- **Product UI:** Belongs to Milestone M4.
- **Milestone M2 remains IN PROGRESS:** FR-021 incomplete; Issues #28 and #29 remain open; exit gate unsatisfied.

---

## 3. Data Model & Database Integrity

### 3.1 Schema Definition
```prisma
enum ObservedApplicabilitySourceType {
  SYNTHETIC_OBSERVED_INPUT
  @@map("observed_applicability_source_type")
}

enum ObservedAgeAssertionState {
  NO_ASSERTION
  UNKNOWN
  ASSERTED_VALUE
  @@map("observed_age_assertion_state")
}

enum ObservedPregnancyStatus {
  PREGNANT
  NOT_PREGNANT
  UNKNOWN
  @@map("observed_pregnancy_status")
}

enum ObservedConditionStatus {
  PRESENT
  ABSENT
  UNKNOWN
  @@map("observed_condition_status")
}

model ObservedClinicalApplicabilitySnapshot {
  id                   String                           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId            String                           @map("patient_id") @db.Uuid
  sourceType           ObservedApplicabilitySourceType  @map("source_type")
  sourceReference      String                           @map("source_reference") @db.Text
  assertionReference   String                           @map("assertion_reference") @db.Text
  effectiveAt          DateTime                         @map("effective_at") @db.Timestamptz(6)
  assertedAt           DateTime                         @map("asserted_at") @db.Timestamptz(6)
  recordedAt           DateTime                         @default(now()) @map("recorded_at") @db.Timestamptz(6)
  ageAssertionState    ObservedAgeAssertionState        @map("age_assertion_state")
  ageYearsAtAssessment Int?                             @map("age_years_at_assessment")
  pregnancyStatus      ObservedPregnancyStatus?         @map("pregnancy_status")
  hypertensionStatus   ObservedConditionStatus?         @map("hypertension_status")
  cvdStatus            ObservedConditionStatus?         @map("cvd_status")
  diabetesStatus       ObservedConditionStatus?         @map("diabetes_status")
  ckdStatus            ObservedConditionStatus?         @map("ckd_status")
  patient              PatientProfile                   @relation(fields: [patientId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "oa_snapshots_patient_fkey")

  @@unique([patientId, sourceType, sourceReference, assertionReference], map: "oa_snapshots_source_identity_key")
  @@index([patientId, effectiveAt], map: "oa_snapshots_patient_effective_idx")
  @@map("observed_applicability_snapshots")
}

model ObservedClinicalApplicabilityRetraction {
  id                  String                          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  snapshotId          String                          @unique(map: "oa_retractions_snapshot_id_key") @map("snapshot_id") @db.Uuid
  patientId           String                          @map("patient_id") @db.Uuid
  sourceType          ObservedApplicabilitySourceType @map("source_type")
  sourceReference     String                          @map("source_reference") @db.Text
  retractionReference String                          @map("retraction_reference") @db.Text
  assertedAt          DateTime                        @map("asserted_at") @db.Timestamptz(6)
  recordedAt          DateTime                        @default(now()) @map("recorded_at") @db.Timestamptz(6)
  reasonCode          String                          @map("reason_code") @db.Text
  patient             PatientProfile                  @relation(fields: [patientId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "oa_retractions_patient_fkey")

  @@unique([patientId, sourceType, sourceReference, retractionReference], map: "oa_retractions_source_identity_key")
  @@map("observed_applicability_retractions")
}
```

### 3.2 SQL Guards and Checks
1. **Age Assertion Truth Table:**
   ```sql
   CONSTRAINT oa_snapshots_age_assertion_check CHECK (
     (
       (age_assertion_state = 'NO_ASSERTION' AND age_years_at_assessment IS NULL) OR
       (age_assertion_state = 'UNKNOWN' AND age_years_at_assessment IS NULL) OR
       (age_assertion_state = 'ASSERTED_VALUE' AND age_years_at_assessment IS NOT NULL AND age_years_at_assessment >= 0)
     ) IS TRUE
   )
   ```
2. **Chronology Constraints:**
   ```sql
   CONSTRAINT oa_snapshots_chronology_check CHECK (effective_at <= asserted_at)
   ```
3. **Reference Grammars:**
   Bounded ASCII `^[A-Za-z0-9_.-]{1,128}$` enforced by regex checks on `source_reference`, `assertion_reference`, and `retraction_reference`.
4. **Terminal One-to-One Retraction Partition Key Integrity:**
   ```sql
   CONSTRAINT oa_retractions_snapshot_scope_fkey FOREIGN KEY (
     snapshot_id, patient_id, source_type, source_reference
   ) REFERENCES public.observed_applicability_snapshots(
     id, patient_id, source_type, source_reference
   ) ON DELETE RESTRICT ON UPDATE RESTRICT
   ```
5. **Statement-Level Immutability Guards:**
   PostgreSQL triggers reject all `UPDATE`, `DELETE`, and `TRUNCATE` operations on both tables unconditionally.

---

## 4. Operational Invariants and Noninterference

1. **Deterministic Idempotency:**
   Inserting an exact duplicate snapshot or retraction returns the existing record with `created: false`. Any conflicting assertion under the same source identity fails closed with `APPLICABILITY_CONFLICT`.
2. **Zero Product Audit Events:**
   Internal synthetic applicability writes are machine-process provenance records with self-contained timestamps and retractions; they never emit product `audit_logs` entries.
3. **Research Noninterference:**
   Complete ground-truth variables (e.g. true diabetes, true CVD, cohort labels, study endpoints) are strictly inaccessible to the observed applicability reader and writer. Visible `NULL` fields remain `NULL`.
4. **Mechanical Tuple Comparison:**
   `projectObservedApplicabilityPoint` strictly evaluates non-retracted snapshots for equality across clinical scalars:
   - `NO_NON_RETRACTED_ROWS`: 0 non-retracted rows.
   - `IDENTICAL_TUPLES`: $\ge 1$ non-retracted rows with identical clinical fields.
   - `DIFFERING_TUPLES`: $\ge 2$ non-retracted rows with conflicting clinical fields.
