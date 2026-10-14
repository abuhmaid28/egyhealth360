# EH-009 clinical-definition contract

Approved by Issue #16 comment [6157539102](https://github.com/abuhmaid28/egyhealth360/issues/16#issuecomment-6157539102), from baseline `a4b2f2a4a496daba32aead5b612cb105e8873d27`. ADR-023 records this decision. This is M2 step 1 only; no patient evaluation or action generation.

## Clinical source and limits

Authoritative source: World Health Organization, *Guideline for the pharmacological treatment of hypertension in adults*, 2021, ISBN 978-92-4-003398-6. Source key `WHO-HTN-2021`, publication identity `2021`, reference identifier `ISBN:978-92-4-003398-6`, reference URL NULL. No exact publication date, URL, DOI, revision, or page number is invented.

Structured references preserve section 3.6 / Recommendation 6 / CONTROL_TARGET and section 3.7 / Recommendation 7 / FOLLOWUP_INTERVAL. The JSON source key/publication identity resolves through the rule's exact template FK to the immutable source. Publication checks all source metadata, not just the key.

Egyptian Hypertension Society, *Egyptian Hypertension Guidelines*, 2014, journal page 101 / PDF follow-up recommendation area, corroborates the stable interval only. It is not persisted as an authoritative relationship or executable predicate.

Repository sources: `research/CLINICAL_RULE_CATALOG_V1.md`, `research/CLINICAL_RULE_SOURCE_AUDIT.md`, `research/EXPERIMENT_PROTOCOL_V1.md`. WHO's target recommendation is recorded as strong/moderate-certainty; stable reassessment is conditional/low-certainty. A single observed controlled BP is a benchmark operationalization, not complete clinical management guidance or real-world validation.

Only CR-HTN-FU-001 is implemented. Known adult/non-pregnant/HTN/no-known-CVD/no-DM/no-CKD facts are required. Unknown applicability is never assumed favorable. Trigger requires systolic <140 AND diastolic <90 mmHg. Action HTN_BP_FOLLOWUP has a recommended +3 calendar-month start and +6 calendar-month due boundary; overdue only after that boundary. Completion requires a relevant encounter with associated BP after trigger and on/before due; early relevant reassessment is allowed. The follow-up BP need not itself satisfy an invented controlled-target requirement.

The future linked appointment, no automatic exemption, and relevant-coverage requirements are declarations only. Final SCHEDULED validity, manual workflow, coverage algorithm, clinical date/calendar arithmetic, normalization, FHIR concept sets, pregnancy vocabulary, BP ranges/rounding/averaging/unit conversion, encounter association, cancellations/rescheduling, and retrigger/occurrence semantics remain deferred. Protocol-only alive-through-due/horizon/index selection is not added to product-rule predicates. No final reason-code registry is persisted.

## Exact persistence and identity

Three models only, as declared in `packages/db/prisma/schema.prisma`:

- GuidelineSource: UUID id; unique sourceKey; title/publisher/publicationIdentity/year; nullable referenceIdentifier/referenceUrl; createdAt/updatedAt. Compound uniqueness publisher/title/publicationIdentity. Immutable from insertion. Updated timestamp equals creation timestamp.
- CarePlanTemplate: UUID id; templateKey/name/conditionDomain/version; source UUID FK; DRAFT/PUBLISHED/RETIRED status; nullable publishedAt/retiredAt; createdAt/updatedAt. Uniques (templateKey,version) and (name,version); source index.
- CareRuleDefinition: UUID id; exact template UUID FK; ruleKey/ruleVersion/actionType; JSONB definition; createdAt/updatedAt. Uniques (templateId,ruleKey) and (ruleKey,ruleVersion). No interpretation column and no independent lifecycle.

All FKs explicitly RESTRICT update/delete. UUIDs use gen_random_uuid(); timestamps use PostgreSQL TIMESTAMPTZ(3). New-table timestamps are database-trigger owned, not Prisma @updatedAt. Versions match MAJOR.MINOR.PATCH with optional -draft, without leading zeroes. Syntax validity does not authorize publication.

The ONLY publishable aggregate is source WHO-HTN-2021, template CPT-HTN-FU-001 / 1.0.0-draft / Controlled uncomplicated hypertension follow-up / HYPERTENSION, rule CR-HTN-FU-001 / 1.0.0-draft / HTN_BP_FOLLOWUP, and the exact JSON below. The -draft suffix is inherited identity, not lifecycle: this version can be PUBLISHED.

Future patient care plans must pin exact template/rule UUIDs and versions; retirement cannot erase those identities. No patient CarePlan/CareAction/evidence/assessment/research table is created here.

## Validation and lifecycle

Specialized typed structured JSON was chosen over relational predicate tables or a DSL. Every property is required, every type/value exact, unknown properties rejected at every depth, arrays ordered, no coercion/defaults. TypeScript validates structure without executing getters and returns the canonical deeply frozen contract. PostgreSQL eh009_is_htn_fu_v1 compares JSONB to the same approved value; tests verify both against an independently committed reviewed fixture. JSON object-key order is immaterial. No code, eval, expression interpreter, arbitrary operators, or patient evaluator exists.

Only DRAFT -> PUBLISHED -> RETIRED. Direct PUBLISHED/RETIRED insertion is rejected. Template identity/key/version/domain/source and rule identity/version/action/template never change. DRAFT template display-name edits are allowed, but publication requires the exact approved name. With no free-form rule prose and only one valid JSON value, no alternate DRAFT clinical content is accepted. Identical no-op updates preserve timestamps. Source mutation is prohibited even before publication.

Publication requires exactly the approved rule membership, metadata, versions, and JSON. Content cannot change in the publication statement. Published/retired aggregates cannot change; retirement changes only lifecycle and database-owned retiredAt/updatedAt. No backwards transition, republishing, version reuse, hard delete, truncate, or identity repointing. DELETE/TRUNCATE guards are statement-level, including zero-row attempts. Future versions need a separately approved manifest/validator/decision update, not a new version string alone.

Migration-owned objects:

- eh009_is_htn_fu_v1: immutable SQL boolean validator.
- eh009_guard_guideline_source, eh009_guard_template, eh009_guard_rule: row BEFORE INSERT/UPDATE guards.
- eh009_reject_catalog_removal: statement BEFORE DELETE/TRUNCATE guards on all three tables.
- CHECKs cover nonblank metadata, year, version syntax, fixed domain/action/key, JSON, timestamps and lifecycle chronology.

All functions use invoker privileges and a fixed trusted search path; table/type/function references in the guards are explicitly qualified so TEMP objects cannot shadow catalog checks or parent locks. SQL/Prisma ordinary writes are protected; schema owners/superusers are outside this guarantee. Historical migrations are unchanged. No db push.

Rule writes lock the exact parent FOR UPDATE before checking DRAFT status. Publication/retirement serialize on that row. Stale REPEATABLE READ/SERIALIZABLE snapshots abort or fail publication validation; no unguarded retry exists. No second rule can enter a published aggregate. SQL can perform genuine guarded lifecycle transitions; system audit events are emitted by the normal persistence boundary, not claimed for arbitrary privileged/direct SQL administration.

## Bootstrap and package boundary

`pnpm clinical:bootstrap` runs only on explicit invocation with DATABASE_URL and already built/migrated artifacts. It accepts no CLI arguments, external manifest, content, force, reset, or version override. It never installs/builds/migrates/starts services or runs at API startup. No new HTTP route/auth/authorization behavior.

Manifest `eh-clinical-catalog-v1` and validator live in packages/clinical-rules; private Prisma persistence in packages/db/src/clinical-catalog.ts. Only the approved internal workspace dependency was added; external resolutions unchanged.

createClinicalCatalogPersistence exposes bootstrapApprovedCatalog, inspectApprovedCatalog, retireTemplateVersion and close. No general client/JSON write/query/CRUD/delete. Inspection is a read-only REPEATABLE READ snapshot and returns validated typed complete state; missing/conflicting state throws rather than repairs. Retirement is limited to the supported exact PUBLISHED aggregate.

Bootstrap validates the built-in definition, requires all three migration checksums and no unfinished/rolled-back migration ledger entries, then locks source/template/rule tables in fixed order with SHARE ROW EXCLUSIVE. Additional completed migrations remain permitted. Lock timeout 10s; lock statement timeout 15s; later statements 5s; transaction maxWait 5s and timeout 30s. Short catalog-wide write locks do not lock M1 tables.

First invocation inserts missing compatible source/template/rule DRAFT rows, publishes, verifies, and commits once. Compatible partial state is retained; conflicts in source/template/rule/version/content fail without reconciliation. Matching PUBLISHED state is zero-write, retaining UUIDs/timestamps/lifecycle. RETIRED target version fails without resurrection. Published incomplete aggregates fail. All late failures roll back.

Normal publication and retirement append CLINICAL_TEMPLATE_PUBLISHED / CLINICAL_TEMPLATE_RETIRED atomically, actor NULL, entity_type care_plan_template, entity_id template UUID, safe_metadata {}. No duplicate publication event on repeat; failed operations leave none. No broader audit taxonomy.

Success CLI output is a fixed JSON manifest/result/created/published summary after commit; failure is nonzero with an allowlisted error code. Credentials, connection strings, arbitrary errors and payloads are not printed. Lost commit acknowledgement can yield failure despite a committed transaction; safe repeat inspects exact state. Logical content is deterministic, UUIDs/timestamps naturally generated.

## Approved JSON value

Row envelope: ruleKey CR-HTN-FU-001; ruleVersion 1.0.0-draft; actionType HTN_BP_FOLLOWUP; templateId is the approved template-version UUID. This JSON stores declarations now; later issues evaluate them.

```json
{
  "schemaVersion": "eh-cr-htn-fu-001/v1",
  "domain": "HYPERTENSION",
  "applicability": {
    "combination": "ALL",
    "requiredKnownFacts": [
      "age_years_at_trigger",
      "pregnancy_status_at_trigger",
      "hypertension_diagnosis",
      "known_CVD",
      "diabetes_mellitus",
      "chronic_kidney_disease"
    ],
    "age": {
      "field": "age_years_at_trigger",
      "operator": "GTE",
      "value": 18
    },
    "pregnancy": {
      "field": "pregnancy_status_at_trigger",
      "requirement": "KNOWN_NON_PREGNANT"
    },
    "hypertensionDiagnosis": {
      "field": "hypertension_diagnosis",
      "equals": true
    },
    "knownCvd": {
      "field": "known_CVD",
      "equals": false
    },
    "diabetesMellitus": {
      "field": "diabetes_mellitus",
      "equals": false
    },
    "chronicKidneyDisease": {
      "field": "chronic_kidney_disease",
      "equals": false
    },
    "missingOrUnknownRequiredFact": "DO_NOT_ASSUME_ELIGIBLE"
  },
  "trigger": {
    "kind": "QUALIFYING_OBSERVED_BP_ASSESSMENT",
    "combination": "ALL",
    "systolic": {
      "unit": "mmHg",
      "operator": "LT",
      "value": 140
    },
    "diastolic": {
      "unit": "mmHg",
      "operator": "LT",
      "value": 90
    },
    "triggerTime": "ASSESSMENT_TIME"
  },
  "action": {
    "code": "HTN_BP_FOLLOWUP",
    "label": "Hypertension BP reassessment / follow-up"
  },
  "timing": {
    "anchor": "TRIGGER_TIME",
    "recommendedWindowStart": {
      "operation": "ADD_CALENDAR_MONTHS",
      "value": 3
    },
    "dueBy": {
      "operation": "ADD_CALENDAR_MONTHS",
      "value": 6
    },
    "overdueBoundary": "STRICTLY_AFTER_DUE_BY"
  },
  "completion": {
    "combination": "ALL",
    "relevantFollowupEncounter": "REQUIRED",
    "bpAssessmentAssociatedWithFollowup": "REQUIRED",
    "followupTime": {
      "afterTrigger": "STRICT",
      "atOrBeforeDueBy": true
    },
    "beforeRecommendedWindowStartAllowed": true
  },
  "scheduleEvidence": {
    "kind": "FUTURE_APPOINTMENT",
    "explicitLinkToActionRequired": true,
    "finalScheduledDecisionContract": "DEFERRED"
  },
  "exemptionPolicy": {
    "automaticMedicalExemption": "NONE",
    "manualExemptionRequirements": [
      "EXPLICIT",
      "AUDITABLE",
      "REASONED"
    ],
    "manualWorkflow": "DEFERRED"
  },
  "coverageRequirement": {
    "trueGapRequires": "SUFFICIENT_RELEVANT_RECORD_COVERAGE",
    "relevantPeriod": {
      "start": "AFTER_TRIGGER_TIME",
      "end": "EXPLICIT_EVALUATION_TIME"
    },
    "insufficientCoverageWithoutStrongerResolvingEvidence": "UNCERTAIN",
    "outsideRelevantPeriodAloneForcesUncertain": false,
    "sufficiencyAlgorithm": "DEFERRED"
  },
  "sourceReferences": [
    {
      "sourceKey": "WHO-HTN-2021",
      "publicationIdentity": "2021",
      "section": "3.6",
      "recommendation": 6,
      "purpose": "CONTROL_TARGET"
    },
    {
      "sourceKey": "WHO-HTN-2021",
      "publicationIdentity": "2021",
      "section": "3.7",
      "recommendation": 7,
      "purpose": "FOLLOWUP_INTERVAL"
    }
  ],
  "repositoryEvidence": {
    "baselineCommit": "a4b2f2a4a496daba32aead5b612cb105e8873d27",
    "catalog": "docs/research/CLINICAL_RULE_CATALOG_V1.md",
    "sourceAudit": "docs/research/CLINICAL_RULE_SOURCE_AUDIT.md",
    "researchProtocol": "docs/research/EXPERIMENT_PROTOCOL_V1.md"
  }
}
```
