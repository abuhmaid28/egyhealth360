# EH-013 — Record Coverage Windows & Normalized Evidence Queries Contract

## 1. Context and Authoritative References
- **Milestone:** Milestone M2 — Clinical Planning & Evidence (Step 5)
- **GitHub Issue:** #24 (`EH-013 — M2 Record Coverage Windows & Normalized Evidence Queries`)
- **Approved Baseline Commit:** `5c8cbe3fbe6e4709fb6975d6c50f1bec68e2ae9e`
- **Feature Branch:** `feature/EH-013-m2-coverage-normalized-evidence`
- **Authoritative Gates:** Review comments `6223832112` (Correction Gate) and `6223961083` (Final Pre-Implementation Approval)
- **Architecture Decision Record:** ADR-027 (`docs/DECISIONS.md`)

---

## 2. Approved Scope vs. Explicitly Deferred Scope

### Approved Scope (EH-013)
1. **RecordCoverageWindow Model:** Single persisted Prisma model and PostgreSQL table representing source-scoped coverage metadata.
2. **Source Identity Contract:** Single-value enum `record_coverage_source_type` (`SYNTHETIC_BENCHMARK`) combined with a required bounded ASCII `source_reference` string (`^[A-Za-z0-9_.-]{1,128}$`).
3. **Immutability & Integrity:** Database triggers rejecting SQL `UPDATE`, `DELETE`, and `TRUNCATE` operations; composite uniqueness on exact assertions with `ON CONFLICT DO NOTHING`.
4. **Internal Machine Writer:** Internal persistence helper for synthetic benchmark fixtures and demo seeds. Zero human user coverage creation; zero application audit events.
5. **Deterministic Interval Normalization:** In-memory algorithm partitioning strictly by `(patientId, sourceType, sourceReference)`. Overlap precedence `INCOMPLETE > UNKNOWN > COMPLETE`. Coalescing of adjacent identical-status segments with complete contributing window ID preservation.
6. **Silent Missingness Preservation:** Absence of metadata represented as factual `unassertedSegments`; never synthesized into fake `UNKNOWN` windows.
7. **Single-Statement Snapshot Query:** One transactional PostgreSQL query (using CTEs and JSON aggregation) fetching BP measurements, encounters, encounter-BP associations, appointments, and coverage windows simultaneously under lock discipline.
8. **Factual Candidate Projections:**
   - `NormalizedBpMeasurement`
   - `NormalizedClinicalEncounter`
   - `StructuralEncounterBpCandidate` (encounter-anchored inclusion)
   - `OperationalAppointmentCandidate` (`SCHEDULED` only; cancelled excluded)
   - `coverageFacts` (`rawWindows`, `effectiveSegments`, `unassertedSegments`)
9. **Authorized Persistence Wrapper:** `createNormalizedEvidencePersistence` enforcing strict `AuthPrincipal` checks (Patient own-data allowed, assigned Clinician allowed, unassigned Clinician denied, Admin denied by role alone).
10. **Architectural Boundary:** Internal machine writer and raw unauthenticated query readers are private to `@egyhealth/db` and never exported from the package root. `apps/api` is prevented from importing internal unauthenticated primitives.

### Explicitly Deferred Scope (Out of Scope for EH-013)
- **Mutable `data_sources` table:** Deferred indefinitely; no external clinic registry.
- **`PRIMARY_CLINICAL_SYSTEM` enum value:** Rejected; zero repository evidence.
- **Human coverage editing:** No Patient, Clinician, or Admin write paths.
- **Public HTTP routes:** Zero endpoints added; `docs/openapi.json` left byte-for-byte unchanged.
- **CareAction generation & persistence:** Remains gated on 15 unresolved clinical prerequisites.
- **EACCE decision engine:** Classification states (`NOT_DUE`, `COMPLETED`, `SCHEDULED`, `TRUE_GAP`, `UNCERTAIN`, `EXEMPT`) belong to Milestone M3.
- **Coverage sufficiency decisions:** Calculation of whether coverage is clinically "sufficient" belongs to EACCE (M3).
- **FHIR / Synthea benchmark loaders:** Milestone M5.
- **Product UI:** Milestone M4.
- **Milestone M2 remains IN PROGRESS:** FR-021 incomplete, FR-024 foundation-only, AC-004/AC-005 unsatisfied.

---

## 3. Data Model & Database Integrity

### 3.1 Schema Definition
```prisma
enum RecordCoverageSourceType {
  SYNTHETIC_BENCHMARK
  @@map("record_coverage_source_type")
}

enum RecordCoverageStatus {
  COMPLETE
  INCOMPLETE
  UNKNOWN
  @@map("record_coverage_status")
}

model RecordCoverageWindow {
  id              String                   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  patientId       String                   @map("patient_id") @db.Uuid
  sourceType      RecordCoverageSourceType @map("source_type")
  sourceReference String                   @map("source_reference") @db.Text
  coverageStatus  RecordCoverageStatus     @map("coverage_status")
  startAt         DateTime                 @map("start_at") @db.Timestamptz(6)
  endAt           DateTime                 @map("end_at") @db.Timestamptz(6)
  createdAt       DateTime                 @default(now()) @map("created_at") @db.Timestamptz(3)
  patient         PatientProfile           @relation(fields: [patientId], references: [id], onDelete: Restrict, onUpdate: Restrict, map: "record_coverage_windows_patient_fkey")

  @@unique([patientId, sourceType, sourceReference, coverageStatus, startAt, endAt], map: "record_coverage_windows_assertion_key")
  @@index([patientId, sourceType, sourceReference, startAt, endAt], map: "record_coverage_windows_partition_idx")
  @@map("record_coverage_windows")
}
```

### 3.2 Constraints & Database Guards
1. **Assertion Uniqueness:**
   ```sql
   CONSTRAINT record_coverage_windows_assertion_key UNIQUE (
     patient_id, source_type, source_reference, coverage_status, start_at, end_at
   )
   ```
2. **Source Reference Check:**
   ```sql
   CONSTRAINT record_coverage_windows_source_reference_check CHECK (source_reference ~ '^[A-Za-z0-9_.-]{1,128}$')
   ```
3. **Chronology & Timestamp Checks:**
   ```sql
   CONSTRAINT record_coverage_windows_chronology_check CHECK (end_at > start_at)
   CONSTRAINT record_coverage_windows_start_at_check CHECK (
     pg_catalog.isfinite(start_at) AND start_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND start_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND start_at = pg_catalog.date_trunc('milliseconds', start_at)
   )
   CONSTRAINT record_coverage_windows_end_at_check CHECK (
     pg_catalog.isfinite(end_at) AND end_at >= TIMESTAMPTZ '0001-01-01 00:00:00+00' AND end_at < TIMESTAMPTZ '10000-01-01 00:00:00+00' AND end_at = pg_catalog.date_trunc('milliseconds', end_at)
   )
   ```
4. **Statement-Level Immutability Guard:**
   `BEFORE UPDATE OR DELETE OR TRUNCATE` trigger executing function `eh013_reject_coverage_mutation()` with `SECURITY INVOKER` and fixed trusted `search_path = pg_catalog, public, pg_temp`.
5. **Insert Scope Guard:**
   `BEFORE INSERT` trigger verifying patient profile exists with `user_role = 'PATIENT'` and setting database-owned `created_at := pg_catalog.clock_timestamp()::timestamptz(3)`.

---

## 4. Source Partitioning & Interval Normalization

### 4.1 Strict Partition Isolation
- Normalization partitions are strictly: `(patientId, sourceType, sourceReference)`.
- Different `sourceReference` values represent independent data streams and are **never** merged or collapsed together.
- Queries require explicit specification of the requested source partition.

### 4.2 Overlap Precedence
Within one exact partition, overlapping raw windows resolve according to strict clinical safety precedence:
$$\text{INCOMPLETE} > \text{UNKNOWN} > \text{COMPLETE}$$
- If any covering raw window asserts `INCOMPLETE`, the effective status is `INCOMPLETE`.
- Otherwise, if any covering raw window asserts `UNKNOWN`, the effective status is `UNKNOWN`.
- Otherwise, the effective status is `COMPLETE`.

### 4.3 Coalescing and Contributing Window IDs
- Elementary slices are formed at every boundary point within `queryInterval`.
- Adjacent effective segments with identical status are coalesced into a single continuous segment.
- The `contributingWindowIds` array contains the deduplicated, deterministically sorted list of all raw window UUIDs that covered any portion of that segment.
- Gaps with zero asserted coverage metadata are reported as `unassertedSegments` (preserving silent missingness).

---

## 5. Normalized Evidence Representation & Single Snapshot

### 5.1 Query Interval Contract
- Half-open interval: `queryInterval = [startAt, endAt)` with `endAt > startAt`.
- Zero wall-clock usage: `evaluationTime` is removed.

### 5.2 Inclusion Semantics
| Candidate Stream | Inclusion Rule | Semantic Notes |
|---|---|---|
| `bloodPressureMeasurements` | `measuredAt >= startAt AND measuredAt < endAt` | Factual measurement history. |
| `clinicalEncounters` | `occurredAt >= startAt AND occurredAt < endAt` | Factual encounter history. |
| `structuralEncounterBpCandidates` | **Encounter-anchored**: `encounter.occurredAt >= startAt AND encounter.occurredAt < endAt` | Associated BP measurement is exposed factually regardless of whether `bpMeasuredAt` falls inside `queryInterval`. Zero completion flags. |
| `operationalAppointmentCandidates` | `scheduledAt >= startAt AND scheduledAt < endAt AND status = 'SCHEDULED'` | Cancelled appointments excluded. Zero action-linked or closure flags. |
| `coverageFacts` | Raw windows intersecting `queryInterval` for exact partition | Output clipped to `queryInterval`; effective and unasserted segments. |

### 5.3 Single-Statement Execution
All 5 streams are fetched in ONE single PostgreSQL statement snapshot using Common Table Expressions (CTEs) and JSON aggregation (`jsonb_build_object`, `jsonb_agg`), preventing mixed cross-table snapshots under READ COMMITTED transactions.

---

## 6. Authorization & Packaging Boundaries

### 6.1 Product Persistence Wrapper
`createNormalizedEvidencePersistence(connectionString)` enforces canonical lock ordering:
1. `SELECT id FROM public.users WHERE id = actor.userId FOR NO KEY UPDATE`
2. `SELECT id FROM public.sessions WHERE id = actor.sessionId FOR UPDATE`
3. Active session & user recheck with clock expiry validation.
4. Clinician assignment verification: `clinician_patient_assignments` active check `FOR SHARE`.
5. Patient self verification: `patient_profiles` check `FOR SHARE`.
6. Single statement snapshot execution.
7. Final session recheck before commit.

### 6.2 Access Matrix
- **PATIENT:** Allowed to query own evidence only. Cross-patient requests fail with `EVIDENCE_NOT_FOUND`.
- **ACTIVE CLINICIAN:** Allowed to query assigned patient evidence. Unassigned or wrong-patient requests fail with `EVIDENCE_NOT_FOUND`.
- **ADMIN:** Denied by role alone (`EVIDENCE_NOT_FOUND`).
- **AUDIT:** Normalized evidence reads append zero audit events.

### 6.3 Packaging Boundary Enforcement
- Public `@egyhealth/db` root index exports only `createNormalizedEvidencePersistence`, `NormalizedEvidenceError`, `RecordCoverageError`, and TypeScript types.
- Low-level machine writers (`internalCreateRecordCoverageWindow`) and raw readers (`internalGetNormalizedPatientEvidence`) are internal modules and are not exported from package root.
- `apps/api` contains zero imports of internal raw readers or writers.

## Issue #31 approved evidence filtering extension

The BP and structural encounter/BP rows above now additionally require no terminal exclusion and no wrong-patient privacy restriction. This filter applies within the existing single-statement authorized query; intervals/partitions, coverage normalization, appointment candidates and encounter facts remain unchanged. Excluded BP cannot return through an old encounter link. This is exclusion/privacy filtering only, with no qualification or completion inference. See [BP_CORRECTION_INVALIDATION_CONTRACT.md](BP_CORRECTION_INVALIDATION_CONTRACT.md).
