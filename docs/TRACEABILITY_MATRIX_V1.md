# EgyHealth 360 — Versioned Requirements Traceability

Current delivery: Product V3 APPROVED; V3-G0 and M0–M2 COMPLETE. Slices 1–5 COMPLETE; PR #45 merged at `9fc25a4cd2428b2aa990b39fad8208867c7c0201`, exact-main [Bootstrap 40252309467](https://github.com/abuhmaid28/egyhealth360/actions/runs/40252309467) SUCCESS; [Slice 5 completion 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6 exit/security review](V3_I1_SLICE6_EXIT_REVIEW.md) IMPLEMENTED / IN REVIEW under [authorization 6406691109](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406691109). V3-I1 INCOMPLETE; Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.

[I1 acceptance trace](V3_I1_CONTRACT.md#acceptance-traceability-and-exit-proof) remains the complete I1 exit map. Slice 1/2 COMPLETE; [Slice 3 implementation](V3_I1_SLICE3.md) and [evidence](V3_I1_SLICE3_VALIDATION.md) cover V3-FR-001, D06-A, FR-060/061, patient ownership and retained security/history requirements. Slice 2 covers bounded V3-FR-003/018. [Slice 4](V3_I1_SLICE4.md) / [evidence](V3_I1_SLICE4_VALIDATION.md) covers V3-FR-002 and the internal catalog/publication portion of V3-FR-018, D02/07/28 and retained privacy/history requirements. I1 NOT COMPLETE; Slice 3 COMPLETE; Slice 4 COMPLETE; Slice 5 COMPLETE; Slice 6 IMPLEMENTED / IN REVIEW. [Slice 5](V3_I1_SLICE5.md) / [evidence](V3_I1_SLICE5_VALIDATION.md) implements the V3-FR-004/D10/D11-A participant lifecycle (COMPLETE), with sole-assignment authority, genuine consent/end provenance, atomic accepted withdrawal, exact old-end safety and retained M1/M2 behavior. Complete integrated journeys remain later obligations.

## Current V3 authority and evidence status

Product V3 policy APPROVED; [D01–D36/approval lineage](PRODUCT_V3_DECISIONS.md). V3-G0 COMPLETE ([verified closeout](PROJECT.md#v3-g0-completion-evidence)); V3-I1 NOT COMPLETE; EACCE NOT STARTED; DESIGN FROZEN. The filename `TRACEABILITY_MATRIX_V1.md` is retained to preserve links, not to indicate V1 is the current product scope.

**APPROVED FUTURE** means a policy obligation, **FOUNDATION** means an accepted reusable slice, and **IMPLEMENTED** requires specific merged verification evidence. No V3 golden journey is marked implemented here. New requirement wording is in [REQUIREMENTS](REQUIREMENTS.md).

## V3 requirement → decision → milestone → future verification

| Requirements | Policy | Milestone | Required future evidence / golden journey |
|---|---|---|---|
| V3-FR-001 | D06-A/03 | I1 | Patient-only signup, own profile, managed staff/no privilege escalation; preserve M1 seed; A |
| V3-FR-002/003 | D02/05/07/28/36 | I1 | Public/private directory boundary, active org/membership and fixed staff scope, cross-provider denials; A/B/C |
| V3-FR-004 | D10/11-A | I1 | Explicit authorization + acceptance/ending, current ACTIVE checks, no booking/author bypass; A–D |
| V3-FR-005/006 | D08/09/10 | I2 | Capacity/provider/patient overlap, change history/safe retry/failed replacement, own schedule/booking isolation; A |
| V3-FR-007/008/009 | D12/13/14/15 | I2 | Actual treating provenance, human-only documentation, private notes/released summary, signed addenda/wrong-patient masking; A |
| V3-FR-010 | D16/17 | I3 | Signed prescribing/validity/cancel/replace, original history and prior-dispense reconciliation; A/C |
| V3-FR-011 | D18-A/19/36 | I3 | Routed full-item dispense, duplicate/concurrent entitlement protection, quantity/unit/actor/time, no adherence claim; C |
| V3-FR-012/013/014 | D20/21/22/23-B/36 | I3 | Order/result identity/provenance, final release/draft denial, correction/retraction versions, lab isolation/suspension; B |
| V3-FR-015/016 | D24/25 | I2/I4 | Unbooked follow-up intent, one booking authority, authorized source timeline, audit separation and masking; A/D |
| V3-FR-017/018 | D27/28/36 | I1–I4/I7 | In-app dedup/status/privacy; ADMIN no payload/impersonation/clinical fulfillment; A–D |
| V3-FR-019 | D26/30 | I4/I5 | Legacy regressions, explicit evidence links only, no auto applicability/coverage/closure; D |
| V3-FR-020 | D29/30 | I5/I7/I8 | Six product states/immutable explanations/override; frozen HTN B0/B1/P1 observed inputs/holdout/manifests/counts; D/research |

All rows are APPROVED FUTURE as complete V3 behavior. [DATA_MODEL](DATA_MODEL.md) / [API](API.md) show existing foundations; [Roadmap V3](IMPLEMENTATION_ROADMAP.md) defines dependency/readiness gates. Tier 2 imaging/measurements/richer reminder/admin work has no implementation evidence. Tier 3 and partial/refill/substitution exclusions remain active in [PRODUCT](PRODUCT.md).

## Cross-cutting safety trace

| Policy area | Decisions | Required future verification |
|---|---|---|
| Own data, public directory, own bookings/schedule and minimal pre-relationship access | D06–11 | Cross-patient IDOR and schedule/directory clinical payload denial |
| Clinical access/ending/private notes/released summaries | D10/11/12/13 | Current genuine relationship, other clinician own authority, no authorship entitlement, signed release/correction |
| Routed lab/pharmacy minimum necessary access | D05/17–22/36 | Wrong provider/artifact denied; current active user/org/membership/artifact required |
| Cancellation, suspension, completed source correction and independent patient/doctor authority | D15/17/20/21/36 | Subsequent revoked staff denied; no silent cancellation from relationship ending; preserve sources; no permanent author rights |
| Wrong-patient/longitudinal masking and audit separation | D15/25/26/27 | Payload/reference/count/notification non-disclosure, source history retained, no raw forensic view |
| Admin operations | D28/36 | No clinical payload/signing/fulfillment/impersonation or unconsented relationships by ADMIN alone |
| Research and clinical inference boundaries | D03/19/26/29/30 | No adherence/eligibility/completion/coverage inference; hidden truth isolated; unchanged bounded HTN study |

## Accepted M0–M2 implementation evidence

M0/M1/M2 are COMPLETE. Issue #28 CLOSED/completed. M2 functional proof: [PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33), [exit PASS](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518), [validation](EH-014_VALIDATION.md#post-merge-validation). The baseline already includes later documentation closeout. Historical reported counts remain historical results; they are not rerun claims for this docs PR.

FR-021 bounded INITIAL is satisfied; FR-024 remains foundation-only/incomplete; AC-004/005 unsatisfied. The [V2→V3 crosswalk](REQUIREMENTS.md#v2--v3-crosswalk-and-supersession) preserves old IDs/evidence. No old planned endpoint/screen/table is implementation evidence.

## Retained V2 traceability — historical scope and planned surfaces

The original matrix below preserves requirement IDs, planned test names and slice evidence. Its lab/pharmacy/general booking exclusions, three-experience and M3-next references are **superseded for current direction by ADR-031**. Visual/screen entries remain historical and frozen; they are not an instruction to build designs. Slice-era incomplete statuses remain historical. Use the V3 sections above for current scope/status.

## V1 matrix retained from Product V2

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

## Slice-specific historical foundation evidence

The EH-007 through Issue #31 sections below record each delivered slice and its limitations at that time; their incomplete/deferred milestone statements are historical, not current project status. Current FR-021/M2 evidence is in [EH-014 merged verification](#eh-014-bounded-initial-implementation--merged-and-verified). This does not change the historical scopes.

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

## EH-012 follow-up and encounter foundation

| Requirement | Implemented foundation | Verification |
|---|---|---|
| FR-012 / FR-023 | Raw encounter/association history, direct recording provenance | Genuine HTTP/minimized projection/internal actor tests + runtime |
| FR-024 foundation-only | Operational appointments with cancellation history | Lifecycle/future-time/history/no-op tests; no action link |
| BR-001/002/020, AC-010/011 | Own reads, ACTIVE-assigned clinician writes, Admin denied | Nested IDOR/current-state/race matrix |
| BR-005 / FR-060/061 | Immutable encounter/link, retained appointments and separate atomic audits | SQL/Prisma/TEMP/rollback/no-op tests |
| ERR-001 / BR-018 / ERR-003 | Generic denial and no fabricated eligibility/closure | HTTP safety + explicit scope assertions |
| NFR-006 | Separate independent review before merge | Pending separate review task |

FR-021 remains incomplete. FR-024 remains foundation-only/incomplete; AC-004/AC-005 and M2 exit are not satisfied. EH-013 coverage/normalization and UI remain deferred.

## EH-013 record coverage windows and normalized evidence queries

| Requirement | Implemented surface | Verification |
|---|---|---|
| FR-025 | Machine-process RecordCoverageWindow persistence | Schema constraints, ON CONFLICT DO NOTHING, DB immutability triggers |
| FR-023 coverage & normalization | Normalized coverage timeline + evidence snapshot query | Pure interval normalizer tests, single-statement snapshot queries |
| BR-007 / BR-008 | Source-partitioned coverage normalization (INCOMPLETE > UNKNOWN > COMPLETE) | Multi-interval, boundary clipping, coalescing, gap preservation tests |
| BR-001 / BR-002 / BR-020 | Patient own-data read, ACTIVE-assigned Clinician read, Admin/unassigned denied | Authorized normalized evidence persistence wrapper unit/integration tests |
| BR-005 | Append-only coverage windows; UPDATE/DELETE/TRUNCATE blocked | SQL immutability trigger integration tests |
| BR-014 / BR-018 | Logical isolation; zero public HTTP routes; no CareAction/EACCE inference | Zero-route tests, openapi.json diff check, architecture import tests |
| NFR-006 | Independent final review | EH-013 validation + final PR record |

FR-021 remains incomplete; FR-024 remains foundation-only; AC-001/002/004/005 remain deferred to M3/EACCE. M2 remains in progress.

## EH-015 observed clinical applicability foundation

| Requirement | Implemented surface | Verification |
|---|---|---|
| FR-023 applicability foundation | Machine-process ObservedClinicalApplicabilitySnapshot and Retraction persistence | Schema constraints, age check, unique keys, DB immutability triggers |
| BR-018 / ERR-003 | No invented medical rules; no clinical eligibility or CareAction inference | Scope assertions and deferred foundation gates (B2, B3, B4 open) |
| BR-014 | Research noninterference: hidden complete truth never backfills missing observed data | Inaccessible ground truth test, missingness preservation tests |
| BR-001 / BR-002 / BR-020 | Patient own-data read, ACTIVE-assigned Clinician read, Admin/unassigned denied | Authorized query persistence wrapper unit and integration tests |
| BR-005 | Append-only snapshots and terminal retractions; UPDATE/DELETE/TRUNCATE blocked | SQL immutability trigger integration tests |
| NFR-006 | Independent final review before merge | Independent implementation review on PR #30 (review 5563885959); fixes require exact-head re-review |

FR-021 remains incomplete; FR-024 remains foundation-only; AC-001/002/004/005 remain deferred to M3/EACCE. Slices B2, B3, and B4 remain open. Milestone M2 remains in progress.

## Issue #31 prerequisite trace

| Requirement/boundary | Implementation | Verification |
|---|---|---|
| FR-023 preserved evidence provenance | Immutable source, operation/exclusion/privacy records; fresh truthful paired replacement | bp-amendments unit/integration tests; populated migration upgrade proof |
| FR-002 / FR-060..061 | Current assigned-clinician writes; self/assigned reads; atomic minimized audits | Authorization, audit rollback, real concurrency and actual HTTP history tests |
| FR-012 / FR-043 foundation | Product-safe ordinary history; independent privacy for already-excluded BP | Patient/clinician GET/HEAD, reference/count masking; no UI completion claim |
| FR-021 / FR-024 / AC-004 / AC-005 | Incomplete / foundation-only / unsatisfied / unsatisfied | No action generation, scheduling classification or closure logic added |

Exact source: [Issue #31 contract](BP_CORRECTION_INVALIDATION_CONTRACT.md). Results: [validation](BP_CORRECTION_INVALIDATION_VALIDATION.md). No new EH number. M2 IN PROGRESS.


## EH-014 bounded INITIAL implementation — merged and verified

FR-021 — satisfied for the approved Core V1 bounded INITIAL generation scope. FR-024 remains foundation-only / incomplete pending the final SCHEDULED evidence contract. AC-004 (`SCHEDULED`) and AC-005 (`COMPLETED`) remain unsatisfied. M2 completion does not imply completion of all Core V1 acceptance criteria or EACCE. FR-012/FR-040 still have only minimal authorized internal action-read foundations; no UI completion is claimed.

| Requirement / boundary | Executable evidence | Verification |
|---|---|---|
| FR-021 bounded INITIAL | `CareAction`, `CareActionDecision`, `CareActionApplicabilityInput`; exact pinned rule/template and protected immutable evaluated decision snapshot | `tests/integration/care-actions.test.mjs`: R1–R8 acceptance, strict threshold, exact applicability/timing, immutable replay, calendar, idempotency and real concurrent transactions |
| BR-003/004/005/018 | `packages/db/src/care-actions.ts`; additive `20261022000000_eh014_initial_care_action` migration, unique INITIAL and same-patient exact-pin FKs, immutable guards/deferred completeness | Fresh and populated upgrade/redeploy across 10 migrations, checksum/row/ledger preservation and zero fabricated backfill |
| FR-023/060/061 | Exact protected selected evidence, selector provenance and atomic minimized selection/creation audits | Snapshot/linkage/immutability/audit rollback and current-privacy projection/count/retry tests |
| BR-001/002/020 / AC-010/011 | Current assigned-clinician invocation, own/assigned minimized reads, Admin denied | Session/assignment/IDOR and both-order authority/evidence race regressions |
| M2 functional exit | `scripts/lib/m2-action-proof.mjs`, `scripts/verify-care-action-runtime.mjs` (`pnpm m2:verify`) | `eh-m2-initial-action-proof-v1`: PASS, INITIAL_ONLY, four synthetic cases in exact-main runtime |
| FR-024 / AC-004 / AC-005 | Foundation-only/incomplete / unsatisfied / unsatisfied | Final SCHEDULED evidence contract and future EACCE closure evaluation required; no action–appointment coupling or completion inference |

[PR #33](https://github.com/abuhmaid28/egyhealth360/pull/33) merged at `4a717c4c6be5b1fa9d089823bb093eca43813853`; exact-main [Bootstrap CI 39664778127](https://github.com/abuhmaid28/egyhealth360/actions/runs/39664778127) completed successfully; [Issue #28 exit review 6329641518](https://github.com/abuhmaid28/egyhealth360/issues/28#issuecomment-6329641518) records **M2 EXIT GATE: PASS**. Exact post-merge results: 67/67 unit, 407/407 integration (69 EH-014), 10 migrations, 7/7 container auth, synthetic runtime proof PASS. [Contract](EH-014_INITIAL_CARE_ACTION_CONTRACT.md); [validation](EH-014_VALIDATION.md#post-merge-validation).

## Current Slice 6 applicability

Slices 1–5 are COMPLETE through [PR #45](https://github.com/abuhmaid28/egyhealth360/pull/45), exact-main Bootstrap 40252309467 and [completion comment 6406188558](https://github.com/abuhmaid28/egyhealth360/issues/39#issuecomment-6406188558). [Slice 6](V3_I1_SLICE6_EXIT_REVIEW.md) is IMPLEMENTED / IN REVIEW by comment 6406691109 for combined verification/security review and strictly necessary contract fixes only. Historical slice/ADR status text records its adoption point. V3-I1 remains INCOMPLETE pending independent exact-head review, successful CI, separate Product Owner merge approval, merge and independently confirmed exact-main verification. Issue #39 OPEN; V3-I2 NOT AUTHORIZED; EACCE NOT STARTED; Design/UI FROZEN.
