# Source of truth and document index

CURRENT AUTHORITATIVE classification index. **CURRENT_STATUS is the single mutable current-state summary**; current explicit GitHub owner authorization sets executable scope. This index classifies rather than repeats that state.

## Fast reading order

Read [AGENTS](../AGENTS.md) → current issue/latest applicable explicit authorization → [CURRENT_STATUS](CURRENT_STATUS.md) → [FOUNDATION_CHARTER](FOUNDATION_CHARTER.md) + this index → task-relevant contracts/references → implementation/tests. PROJECT/history is optional context, not mandatory archaeology. For this reboot the current authorization is [issue #72 comment 6563757904](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6563757904); 6563631251 is superseded.

## Priority and classification rules

The charter defines precedence: current explicit owner scope, stable governance, accepted contracts, actual implementation/tests/schema/OpenAPI, current summaries, historical evidence, assumptions. A code/contract conflict is a reportable defect, not implicit permission to change policy.

- **CURRENT AUTHORITATIVE:** maintained current reference for its named responsibility; it grants no task authorization by itself.
- **ACCEPTED CONTRACT:** binding behavior within its accepted scope. Adoption-time inventories/status/future exclusions remain historical; do not rewrite accepted clinical/security policy to hide drift.
- **HISTORICAL EVIDENCE:** evidence or retained planning at a named candidate; no current permission, deployment-parity or completion claim beyond that scope.
- **SUPERSEDED / LEGACY REFERENCE:** earlier scope/design/process direction; never a final implementation specification or current execution grant.

Within current documents, explicitly labeled historical sections retain that classification even though the file has a current reference opening. V1 visual evidence is not final Product/Brand/Design approval. A planned clinical/research contract does not authorize execution. Check task authorization for amendments rather than resolving a conflict by guessing.

## Repository entrypoints and executable evidence

| Path/source | Class and responsibility |
| --- | --- |
| [AGENTS](../AGENTS.md) | CURRENT AUTHORITATIVE stable execution rules; no sprint status |
| [README](../README.md) | CURRENT AUTHORITATIVE entry/local runbooks; delegates delivery to CURRENT_STATUS |
| [FIRST_AGENT_PROMPT](../FIRST_AGENT_PROMPT.txt) | CURRENT AUTHORITATIVE stable startup pointer, no mutable authorization |
| Current GitHub issue/owner comment | CURRENT AUTHORITATIVE executable scope, checked for supersession |
| [OpenAPI](openapi.json), [schema](../packages/db/prisma/schema.prisma), migrations, current source/tests | Executable evidence of actual behavior/inventory; report contract conflicts |
| `docs/ui-screenshots/**` including all doctor-demo PNG/JSON | HISTORICAL EVIDENCE / V1 BEFORE; preserve existing bytes/paths |
| `apps/web/public/fonts` and current logo/icon code | Existing implementation/assets, not final brand/typography approval |
| [CI workflow](../.github/workflows/ci.yml), package/workspace/Docker configuration | Actual tooling/runtime truth, not historical “typical CI” sketches |

All tracked documentation Markdown paths are classified below. Research files are under `docs/research/`; there is no top-level `research/` directory at the audited baseline.

## CURRENT AUTHORITATIVE

| Document | Responsibility / limits |
| --- | --- |
| [API.md](API.md) | Current route families; later accepted slice notes retain introduction context. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Actual runtime/module/frontend/data/deployment architecture. |
| [CI_POLICY.md](CI_POLICY.md) | Deterministic CI classification, targeted dependencies, full regression, caching/cancellation and evidence limits. |
| [CURRENT_STATUS.md](CURRENT_STATUS.md) | Single mutable delivery/Live/authorization snapshot; start here. |
| [DATA_MODEL.md](DATA_MODEL.md) | Current schema-derived inventory; later slice notes are historical. |
| [DOMAIN.md](DOMAIN.md) | Current domain boundaries and preserved meaning distinctions. |
| [EXECUTION_POLICY.md](EXECUTION_POLICY.md) | Stable synthetic/free-first academic/execution constraints. |
| [FOUNDATION_CHARTER.md](FOUNDATION_CHARTER.md) | Stable authority, preservation, owner gates and mandatory milestone health review. |
| [FOUNDATION_REBOOT_V2_AUDIT.md](FOUNDATION_REBOOT_V2_AUDIT.md) | Proposed current health verdict, evidence, drift/debt and review limits. |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Current sequencing; entries are not execution authorization. |
| [PRODUCT.md](PRODUCT.md) | Approved product scope, distinct from delivered/Live subsets. |
| [PROJECT.md](PROJECT.md) | Concise product/current opening and clearly separated completion evidence. |
| [PROJECT_PLAN_6_MONTHS.md](PROJECT_PLAN_6_MONTHS.md) | Capacity inputs/constraints; no current dates or completion weights. |
| [REQUIREMENTS.md](REQUIREMENTS.md) | Versioned requirement definitions with reconciled delivery column; V2 sections historical. |
| [RESEARCH.md](RESEARCH.md) | Research boundary/retained plans only; no implemented experiment or result claims. |
| [SECURITY.md](SECURITY.md) | Current authority map and accepted security details. |
| [SOURCE_OF_TRUTH.md](SOURCE_OF_TRUTH.md) | Classification and reading path; no competing task status. |
| [TESTING.md](TESTING.md) | Actual CI lanes, risk-based validation and retained historical evidence. |
| [TRACEABILITY_MATRIX_V1.md](TRACEABILITY_MATRIX_V1.md) | Current requirement-to-evidence map first; old trace matrices historical. |
| [UX.md](UX.md) | Conceptual workspace/UX boundary; not approved final IA/navigation/content. |

## ACCEPTED CONTRACT

| Document | Responsibility / limits |
| --- | --- |
| [BP_CORRECTION_INVALIDATION_CONTRACT.md](BP_CORRECTION_INVALIDATION_CONTRACT.md) | Accepted BP correction/privacy behavior; independent restriction semantics. |
| [DECISIONS.md](DECISIONS.md) | Accepted ADR register; adoption-time status/old scope is historical. |
| [EH-005_PERSISTENCE.md](EH-005_PERSISTENCE.md) | Accepted identity/persistence foundation; historical inventory. |
| [EH-006_AUTH.md](EH-006_AUTH.md) | Accepted auth/session/request defenses. |
| [EH-007_AUTHORIZATION.md](EH-007_AUTHORIZATION.md) | Accepted own-data/current-assignment foundation. |
| [EH-008_DEMO_IDENTITIES.md](EH-008_DEMO_IDENTITIES.md) | Accepted fixed M1 synthetic fixtures and seed constraints. |
| [EH-009_CLINICAL_DEFINITION_CONTRACT.md](EH-009_CLINICAL_DEFINITION_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-010_CARE_PLAN_CONTRACT.md](EH-010_CARE_PLAN_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-011_BP_PROVENANCE_CONTRACT.md](EH-011_BP_PROVENANCE_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md](EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md](EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-014_INITIAL_CARE_ACTION_CONTRACT.md](EH-014_INITIAL_CARE_ACTION_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [EH-015_OBSERVED_APPLICABILITY_CONTRACT.md](EH-015_OBSERVED_APPLICABILITY_CONTRACT.md) | Accepted bounded clinical/evidence contract; historical delivery context, no new clinical rules. |
| [PRODUCT_V3_DECISIONS.md](PRODUCT_V3_DECISIONS.md) | D01–D36 accepted policy. Original D35 freeze is historical; charter governs final V2 gates. |
| [V3_I1_CONTRACT.md](V3_I1_CONTRACT.md) | Accepted I1 behavior; adoption-time inventories/status are historical. |
| [V3_I1_SLICE2.md](V3_I1_SLICE2.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I1_SLICE3.md](V3_I1_SLICE3.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I1_SLICE4.md](V3_I1_SLICE4.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I1_SLICE5.md](V3_I1_SLICE5.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_CONTRACT.md](V3_I2_CONTRACT.md) | Accepted I2 behavior; all seven slices complete, not current scope authorization. |
| [V3_I2_SLICE1.md](V3_I2_SLICE1.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_SLICE2.md](V3_I2_SLICE2.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_SLICE3.md](V3_I2_SLICE3.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_SLICE4.md](V3_I2_SLICE4.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_SLICE5.md](V3_I2_SLICE5.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I2_SLICE6.md](V3_I2_SLICE6.md) | Accepted bounded slice behavior; historical introduction/status/authorization, not a current task grant. |
| [V3_I3_CONTRACT.md](V3_I3_CONTRACT.md) | Accepted I3 behavior, with only Slices 1/2 implemented; Lab remains paused. |
| [V3_I3_SLICE1.md](V3_I3_SLICE1.md) | Accepted implemented I3 slice behavior; merged checkpoint, not Live deployment proof. |
| [V3_I3_SLICE2.md](V3_I3_SLICE2.md) | Accepted implemented I3 slice behavior; merged checkpoint, not Live deployment proof. |

## HISTORICAL EVIDENCE

| Document | Responsibility / limits |
| --- | --- |
| [BP_CORRECTION_INVALIDATION_VALIDATION.md](BP_CORRECTION_INVALIDATION_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-003_VALIDATION.md](EH-003_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-006_VALIDATION.md](EH-006_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-007_VALIDATION.md](EH-007_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-008_VALIDATION.md](EH-008_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-009_VALIDATION.md](EH-009_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-010_VALIDATION.md](EH-010_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-011_VALIDATION.md](EH-011_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-012_VALIDATION.md](EH-012_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-013_VALIDATION.md](EH-013_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-014_VALIDATION.md](EH-014_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [EH-015_VALIDATION.md](EH-015_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [FOUNDATION_REBOOT_V2_VALIDATION.md](FOUNDATION_REBOOT_V2_VALIDATION.md) | This sprint’s scope/hash/reference checks and 20-question comprehension simulation; exact-head CI lives in PR handoff. |
| [M1_DEMO_RUNBOOK.md](M1_DEMO_RUNBOOK.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [POST_SLICE3_DEPENDENCY_SECURITY_HOTFIX.md](POST_SLICE3_DEPENDENCY_SECURITY_HOTFIX.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [PRE_FINAL_DOCTOR_DEMO_UI.md](PRE_FINAL_DOCTOR_DEMO_UI.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [PRE_FINAL_LIVE_STAGING.md](PRE_FINAL_LIVE_STAGING.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [THESIS_STRUCTURE_V1.md](THESIS_STRUCTURE_V1.md) | Retained reporting plan; distinguish future work from completed experiments when presenting. |
| [V3_I1_CLOSEOUT.md](V3_I1_CLOSEOUT.md) | Accepted milestone completion/review evidence at its recorded commit; old task instructions are historical. |
| [V3_I1_SLICE2_VALIDATION.md](V3_I1_SLICE2_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I1_SLICE3_VALIDATION.md](V3_I1_SLICE3_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I1_SLICE4_VALIDATION.md](V3_I1_SLICE4_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I1_SLICE5_VALIDATION.md](V3_I1_SLICE5_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I1_SLICE6_EXIT_REVIEW.md](V3_I1_SLICE6_EXIT_REVIEW.md) | Accepted milestone completion/review evidence at its recorded commit; old task instructions are historical. |
| [V3_I1_SLICE6_VALIDATION.md](V3_I1_SLICE6_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE2_VALIDATION.md](V3_I2_SLICE2_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE3_VALIDATION.md](V3_I2_SLICE3_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE4_VALIDATION.md](V3_I2_SLICE4_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE5_VALIDATION.md](V3_I2_SLICE5_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE6_VALIDATION.md](V3_I2_SLICE6_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_I2_SLICE7_EXIT_REVIEW.md](V3_I2_SLICE7_EXIT_REVIEW.md) | Accepted milestone completion/review evidence at its recorded commit; old task instructions are historical. |
| [V3_I2_SLICE7_VALIDATION.md](V3_I2_SLICE7_VALIDATION.md) | Point-in-time validation/implementation evidence; preserve links/paths; old counts/status/permissions do not set current scope. |
| [V3_UI_AR_RTL.md](V3_UI_AR_RTL.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_DEMO.md](V3_UI_DEMO.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_FOLLOW_UP_INTENT_LIVE.md](V3_UI_FOLLOW_UP_INTENT_LIVE.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_I2_LIVE_CLOSEOUT.md](V3_UI_I2_LIVE_CLOSEOUT.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_LIVE_ACCELERATOR.md](V3_UI_LIVE_ACCELERATOR.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_PHASE3_POLISH.md](V3_UI_PHASE3_POLISH.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_PHASE4_CONSULTATION_OPENING.md](V3_UI_PHASE4_CONSULTATION_OPENING.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_PHASE5_DOCUMENTATION.md](V3_UI_PHASE5_DOCUMENTATION.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [V3_UI_REAL_BOOKING.md](V3_UI_REAL_BOOKING.md) | V1 feature/hosting/browser evidence at its recorded candidate; no final UX/brand approval or current deployment parity claim. |
| [research/CLINICAL_RULE_CATALOG_V1.md](research/CLINICAL_RULE_CATALOG_V1.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/CLINICAL_RULE_SOURCE_AUDIT.md](research/CLINICAL_RULE_SOURCE_AUDIT.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/COMPETITOR_EVIDENCE_MATRIX.md](research/COMPETITOR_EVIDENCE_MATRIX.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/EXPERIMENT_PROTOCOL_V1.md](research/EXPERIMENT_PROTOCOL_V1.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/LITERATURE_REVIEW.md](research/LITERATURE_REVIEW.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/METRICS_SPEC_V1.md](research/METRICS_SPEC_V1.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |
| [research/RELATED_WORK_MATRIX.md](research/RELATED_WORK_MATRIX.md) | Retained research/source/planning evidence; protocol may be a design draft. No engine/pipeline/evaluation execution or measured results implied. |

## SUPERSEDED / LEGACY REFERENCE

| Document | Responsibility / limits |
| --- | --- |
| [DEEP_PLANNING_AUDIT_SUMMARY.md](DEEP_PLANNING_AUDIT_SUMMARY.md) | Earlier planning audit; useful history, superseded execution/status. |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Incomplete historical V1 direction; insufficient for final implementation; no final V2 choices. |
| [EH-001_BOOTSTRAP_ISSUE.md](EH-001_BOOTSTRAP_ISSUE.md) | Historical bootstrap task proposal; not current execution authority. |
| [UX_VALIDATION_V2.md](UX_VALIDATION_V2.md) | Legacy scope/design research and recommendations; no final V2 UX or design approval. |
| [diagrams/SYSTEM_DIAGRAMS_V1.md](diagrams/SYSTEM_DIAGRAMS_V1.md) | Historical V1 system sketches; current topology is ARCHITECTURE. |

## Historical cleanup and drift prevention

Do not mass-delete/move historical files. Existing issue/PR/screenshot paths remain stable. Prefer explicit index/header classifications and precise current reference repairs; any future archive move needs a link-preserving plan. Old mutable status paragraphs inside classified accepted/historical documents are not current instructions.

Each milestone delivery updates CURRENT_STATUS and affected current references, preserves contract/history evidence and verifies mutual consistency before handoff. Add new important documents to this index. At every major milestone health review recheck architecture, roadmap, debt, Product/UX/Design, security/data, CI/runtime and deployment truth. Final UX/content/brand/Design System/prototype approval is separate from technical CI. [Charter](FOUNDATION_CHARTER.md).
