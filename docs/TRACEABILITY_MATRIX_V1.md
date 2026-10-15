# EgyHealth 360 — Requirements Traceability Matrix V1

## Purpose
Trace every Core V1 problem and requirement to its planned product surface, API/domain boundary, acceptance criteria, and verification evidence.

Status legend:
- PLANNED — specified but not implemented yet
- REQUIRED — mandatory verification gate
- DEFERRED — intentionally outside Core V1

## Problem-to-requirement trace

| Problem | Requirements | Primary verification |
|---|---|---|
| P-001 False gaps under incomplete records | FR-025, FR-030..035, BR-007..011, AC-001..008 | EACCE golden tests + corruption benchmark |
| P-002 Need explainable/inspectable classification | FR-013, FR-032, FR-035, AC-007 | Care Action Detail component/API tests + explanation-consistency tests |
| P-003 Relationship-aware authorization | FR-001..003, FR-010..013, BR-001, BR-002, BR-020, AC-010, AC-011 | Auth/session integration + IDOR matrix |
| P-004 Preserve assessment/review history | FR-033..035, FR-060..061, BR-004, BR-005, BR-011, BR-012, AC-008, AC-009 | DB immutability + re-evaluation + override integration tests |
| P-005 Reproducible research without leakage/cherry-picking | FR-051..054, BR-014..019, AC-012..014, NFR-005 | Research-integrity tests + reproducibility manifest + locked holdout procedure |
| P-006 Simpler patient action view | FR-040..043, BR-013, AC-015 | Patient mobile E2E + accessibility/wording tests |

## Detailed functional traceability

| Requirement | Product/Screen | API / Domain boundary | Acceptance / Rule | Planned tests |
|---|---|---|---|---|
| FR-001 Authenticate roles with server-side sessions | Login | `/auth/login`, session store | BR-001/002/020, AC-010 | T-AUTH-001 login success/failure; T-SEC-SESSION-001 |
| FR-002 Backend authorization | All protected screens | guards/policies on every protected resource | BR-001, BR-002, BR-020, AC-010/011 | T-AUTHZ-IDOR-* matrix |
| FR-003 Logout/current user | Account/session | `/auth/logout`, `/auth/me` | NFR-008 | T-AUTH-002 logout invalidates session |
| FR-010 Assigned patient list | Patient List | `GET /clinician/patients` | BR-002 | T-API-PAT-001; T-E2E-CLIN-001 |
| FR-011 Patient summary | Patient Overview | `GET /clinician/patients/:patientId/summary` | BR-002, AC-011 | T-API-PAT-002; T-AUTHZ-IDOR-PATIENT |
| FR-012 Timeline/care plan/BP inspection | Patient workspace tabs | summary/timeline/measurements/care-plan endpoints | BR-002 | T-E2E-CLIN-002 |
| FR-013 Care Action Detail explanation | Care Action Detail | `/care-actions/:id`, current assessment/evidence | AC-007, AC-015 | T-UI-CARE-001; T-EACCE-EXPL-001 |
| FR-020 Care-plan lifecycle | Clinician care plan UI | create/activate/cancel care-plan endpoints | BR-003/004 | T-PLAN-STATE-001..004 |
| FR-021 Versioned action generation | Care plan/action backend | CarePlanTemplate/CareRuleDefinition/CareAction | BR-003/004/018 | T-RULE-VERSION-001; T-ACTION-IDEMP-001 |
| FR-022 BP submission | BP Measurement | patient/clinician BP endpoints | ERR-006 | T-BP-VALID-001; T-AUTHZ-BP-001 |
| FR-023 Evidence provenance | Timeline/evidence panel | evidence normalization/provenance fields | AC-007 | T-EVID-PROV-001 |
| FR-024 Follow-up scheduling evidence | Schedule / action detail | follow-up endpoints | BR-009, AC-004 | T-SCHED-001; GC-003 |
| FR-025 Coverage windows | Care Action Detail / backend | RecordCoverageWindow | BR-007/008 | T-COVERAGE-001..003; GC-005/EC-10 |
| FR-030 Deterministic evaluation | Care Action Detail / worker | shared closure-engine package | BR-015, AC-013 | T-EACCE-DETERMINISM-001 |
| FR-031 Six closure states | Badges/details/patient wording | closure-engine output contract | AC-001..006 | Golden cases GC-001..006 |
| FR-032 Explanation/version trace | Care Action Detail | ClosureAssessment | AC-007 | T-EACCE-EXPL-001..N |
| FR-033 Re-evaluate on new evidence | Action detail/stale UI | assessment persistence/re-evaluate | BR-011, AC-008 | T-ASSESS-REEVAL-001 |
| FR-034 Confirm/override | Override modal | confirm/override endpoints | BR-012, AC-009 | T-REVIEW-001..003 |
| FR-035 Effective reviewed state | Care Action Detail | assessment + latest review resolution | BR-012 | T-REVIEW-EFFECTIVE-001 |
| FR-040 Patient care plan/actions | Patient Home/My Plan | patient-view endpoints | BR-001 | T-E2E-PAT-001 |
| FR-041 Simplified patient wording | Patient Home/My Plan | UI mapping only | AC-015 | T-UI-PAT-LABELS-001 |
| FR-042 Next expected action | Patient Home | patient care-actions endpoint | BR-013 | T-E2E-PAT-002 |
| FR-043 BP history | Measurements | patient BP GET | BR-001 | T-E2E-PAT-003 |
| FR-050 Demo admin | Admin | admin users/demo reset | BR-020 | T-AUTHZ-ADMIN-001 |
| FR-051 Start experiment | Evaluation Lab | `POST /admin/experiments` | BR-014..019 | T-EXP-RUN-001 |
| FR-052 Persist manifests/metrics | Experiment Results | ExperimentRun/Metric tables | AC-014 | T-EXP-MANIFEST-001; T-METRIC-UNIT-* |
| FR-053 Real results only | Experiment Results | experiment result API | AC-016 | T-UI-RESULT-NOFAKE-001; E2E experiment |
| FR-054 Same EACCE package in product/worker | Product + Research | package import boundary | BR-015/016 | T-ARCH-SHARED-ENGINE-001 |
| FR-060 Audit sensitive actions | Internal/admin | AuditLog append-only | AC-009, NFR-008 | T-AUDIT-001..N |
| FR-061 Keep audit separate from patient timeline | Timeline/Internal audit | query/domain separation | P-004 | T-DOMAIN-AUDIT-SEPARATION-001 |

## Closure acceptance trace

| Acceptance criterion | Rule / method | Product evidence | Research evidence | Required tests |
|---|---|---|---|---|
| AC-001 TRUE_GAP only with complete relevant coverage | BR-007 | Care Action Detail explanation | P1 corruption benchmark | GC-004, T-COVERAGE-TRUEGAP |
| AC-002 Incomplete relevant coverage -> UNCERTAIN | BR-007/008 | More information needed state | false-gap benchmark | GC-005, EC-10 |
| AC-003 Future due -> NOT_DUE | closure timing | Upcoming | product fixtures | GC-001 |
| AC-004 Future relevant schedule -> SCHEDULED | BR-009 | Schedule + action detail | product-only in V1 primary research | GC-003, T-SCHED-001 |
| AC-005 Qualifying completion -> COMPLETED | BR-010 | completed action | primary ground-truth negative | GC-002 |
| AC-006 Explicit exemption -> EXEMPT | source/product workflow | action detail | not in primary V1 research benchmark | GC-006 |
| AC-007 Explanation consistent with decision | FR-032 | explanation panel | persisted reason trace | T-EACCE-EXPL-* |
| AC-008 Immutable assessment history | FR-033 | stale/superseded states | versioned predictions | T-ASSESS-IMMUT-001 |
| AC-009 Override preserves engine result | FR-034/035 | override modal/review state | N/A | T-REVIEW-OVERRIDE-001 |
| AC-010 Backend auth independent of UI | FR-002 | permission-denied states | N/A | T-AUTHZ-* |
| AC-011 Unassigned clinician denied | BR-002 | access denied | N/A | T-AUTHZ-IDOR-PATIENT |
| AC-012 Ground truth isolated | BR-014 | N/A | benchmark architecture | T-RI-GT-001..003 |
| AC-013 Deterministic output | BR-015 | stable product result | reproducible predictions | T-EACCE-DETERMINISM-001 |
| AC-014 Reproducible experiment manifests | FR-052 | Eval metadata | protocol/manifest | T-EXP-REPRO-001 |
| AC-015 TRUE_GAP vs UNCERTAIN accessible distinction | FR-041 | patient/clinician UI | N/A | T-A11Y-STATE-001 |
| AC-016 No fabricated metrics | FR-053 | Experiment Results | actual run only | T-UI-RESULT-NOFAKE-001 |

## Research-method trace

| Research protocol element | Requirement/rule | Implementation artifact | Verification |
|---|---|---|---|
| Synthea v4.0.0 / FHIR R4 pin | NFR-005 | dataset manifest | manifest snapshot test |
| Clinical rule CR-HTN-FU-001 | BR-018 | clinical-rules package | source/version fixture tests |
| One index case per patient | Experiment Protocol §7 | benchmark builder | uniqueness/integrity test |
| Hidden complete-record ground truth | BR-014 | research ground-truth namespace | T-RI-GT-* |
| Identical corrupted input to B0/B1/P1 | BR-016 | experiment runner | T-RI-PAIR-001 |
| Observable/silent corruption | P-005 | corruption engine | deterministic corruption tests |
| Fixed corruption seeds | BR-017 | experiment config | manifest validation |
| Locked final holdout | BR-017 | release/final-run workflow | holdout guard test/process |
| Metric formulas | FR-052 | metric calculator | independent fixture unit tests |
| Failed runs retained | ERR-005 | ExperimentRun FAILED | integration test |

## UX trace

| Screen | Main requirements | Critical states/tests |
|---|---|---|
| Clinician Dashboard | FR-010, FR-013 | loading/empty/error; TRUE_GAP/UNCERTAIN priority |
| Patient List | FR-010 | filters/pagination/permission |
| Patient Overview | FR-011/012 | no-active-gaps wording; stale/error |
| Care Action Detail | FR-013, FR-031..035 | all closure states; evidence; explanation; override |
| Patient Home | FR-040..042 | mobile; next action; simplified labels |
| My Plan | FR-040/041 | upcoming/completed/needs-info |
| BP Measurement | FR-022/043 | validation/error/accessibility |
| Evaluation Lab | FR-051/052 | config validation/run states |
| Experiment Results | FR-052/053 | real metrics only/failure/no-results |

## Security trace

| Security concern | Requirement | Required verification |
|---|---|---|
| Patient cross-account access | BR-001 | patient A cannot read/write patient B routes |
| Clinician IDOR | BR-002/AC-011 | assigned vs unassigned clinician matrix |
| Admin overreach | BR-020 | admin denied protected clinical records unless separately authorized |
| Session theft/exposure | FR-001/NFR-008 | HttpOnly/Secure/SameSite + invalidation tests |
| CSRF | Security design | state-changing request CSRF tests |
| Mass assignment | API principle | server-owned identity/status cannot be client-forced |
| Audit tampering | FR-060/061 | append-only behavior contract |
| Ground-truth leakage | BR-014 | runtime/schema isolation tests |

## Scope exclusion trace
The following are explicitly NOT required for any Core V1 acceptance criterion and must not be added merely because an agent can implement them:
- lab portal;
- pharmacy portal;
- doctor marketplace;
- payment/insurance;
- chat/video consultation;
- diagnostic AI;
- medication recommendation/dosing;
- diabetes-risk model;
- OCR/medical-image AI;
- real-patient ingestion;
- field interviews/surveys as a default project dependency.

Any future proposal to add one of these requires a new approved scope decision and traceability update.

## Implementation rule
An Issue is not Definition-of-Ready if its requirement/acceptance/test trace cannot be identified in this matrix or added through an approved documentation change.

A requirement is not considered implemented merely because a screen exists; verification evidence must include the planned automated/integration/E2E/security/research checks appropriate to that row.

## EH-007 foundation evidence

| Requirement | Implemented surface | Verification |
|---|---|---|
| P-003 / FR-002 / AC-010 | Scoped patient-profile read independent of UI | T-AUTHZ-IDOR-* HTTP suite |
| BR-001 | patient_profiles.user_id self scope | patient own/cross/user-ID tests |
| BR-002 / AC-011 | ACTIVE assignment of authenticated clinician profile | active/ended/never/wrong/reassignment tests |
| BR-020 | ADMIN excluded from patient read | admin generic-denial tests |
| ERR-001 | Uniform object 404, minimal projection | forbidden/nonexistent/malformed/leakage tests |
| NFR-006 | Independent second-pass review before merge | EH-007 validation + PR evidence |

These are foundation proofs only. FR-010/FR-011 and later clinical-resource tests
remain pending; no full M1 completion claim is made.

## EH-008 executable M1 evidence

| Requirement | Surface | Verification |
|---|---|---|
| FR-001/003 | Five synthetic role logins/me/logout | real HTTP m1:verify + integration |
| FR-002 / BR-001/002/020 / AC-010/011 | Own/cross/assigned/unassigned/ADMIN profiles | m1:verify + preserved full EH-007 IDOR suite |
| BR-019 | Obviously synthetic fixed fixture names/emails | manifest tests |
| ERR-001 / NFR-008 | Uniform denial + credential/output protection | CLI/HTTP failure/leakage tests |
| NFR-006 | Seed credential/persistence independent review | final PR/validation evidence |
| M1 step4/exit | Deterministic seed and executable verification | clean/repeat/container/CI evidence |

M1 is complete at `a4b2f2a4a496daba32aead5b612cb105e8873d27`; [recorded exit evidence](https://github.com/abuhmaid28/egyhealth360/issues/14#issuecomment-6154959884). FR-010/FR-011 and clinical/product milestones remain incomplete.

## EH-009 clinical-definition foundation

| Requirement | Implemented foundation | Verification |
|---|---|---|
| BR-003 | Exact template/rule version identities for future pinning | version/relationship uniqueness tests |
| BR-004/005 | Immutable published/retired aggregate and source/history guards | SQL/Prisma mutation/removal/lifecycle/concurrency tests |
| BR-018 | WHO identity, structured sections, exact CR-HTN-FU-001 definition | reviewed JSON fixture + source/SQL/application agreement |
| ERR-003 | Required-known applicability declaration | strict exact representation tests; evaluation deferred |
| FR-021 foundation only | Durable versioned definitions and explicit bootstrap | bootstrap first/repeat/conflict/rollback tests |
| FR-060 | Genuine system publication/retirement audit | atomic rollback and duplicate-event tests |
| NFR-006 | Independent clinical/schema/immutability review | EH-009 validation / PR evidence |

FR-021 care-action generation, patient planning, M2 exit gate and EACCE remain incomplete.

## EH-010 service foundation

| Requirement | Implemented scope | Verification |
|---|---|---|
| FR-020 foundation only | Principal-checked create/activate/cancel/inspect; no HTTP workflow | CarePlan service lifecycle/actor/race tests |
| BR-003/004/018 | Exact template + rule FKs and source trace, approved aggregate only | Composite FK, SQL bypass, retirement and projection tests |
| BR-005 | Immutable plan identity/history and DELETE/TRUNCATE guards | Direct SQL and service history tests |
| BR-002/020 | Current clinician assignment required, Patient/Admin denied | Service actor matrix and revocation races |
| FR-060 | Three atomic genuine clinician lifecycle events | Exact actor/entity/metadata, rollback/no-op tests |
| FR-021 incomplete | Read-only deferred declaration specification only | Pure determinism/no-action/no-evidence tests |
| NFR-006 | Independent second-pass review | EH-010 validation / PR evidence |

FR-020 remains foundation only, FR-021 remains incomplete and M2 remains in progress.
No CareAction/EACCE/clinical eligibility or product HTTP behavior is claimed.


## EH-011 BP persistence and API scope

| Requirement | Implemented surface | Required evidence |
|---|---|---|
| FR-022 | Patient self / ACTIVE-assigned Clinician POST | Genuine-session HTTP/runtime submission + denial matrix |
| FR-012 / FR-043 foundation | Authorized paginated BP GET/HEAD | HTTP pagination/projection/ownership; UI remains pending |
| FR-023 BP only | Immutable entry kind and recorder UUID | Exact internal actor/source, SQL guards and runtime checks |
| BR-001/002/020 / AC-010/011 | Current ownership/assignment; ADMIN denied | IDOR + both lock-order race tests |
| ERR-001/006 | Generic target denial; strict no-coercion input | Malformed/encoded paths, lexical/type/time/error tests |
| BR-005 / FR-060/061 | Immutable BP + distinct atomic creation audit | SQL/Prisma history, rollback, empty metadata tests |
| BR-018 / ERR-003 | No inferred clinical eligibility/action | Scope assertions and documented deferred gates |
| NFR-006 | Independent final review | EH-011 validation + final PR record |

FR-012/FR-043 are API/data foundations, FR-023 covers BP entry provenance only;
FR-021 and M2 remain incomplete. No eligibility/EACCE or correction workflow claimed.
