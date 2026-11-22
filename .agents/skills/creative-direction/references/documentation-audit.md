# Repository documentation audit

Audit cut: original local #157 HEAD d5d107b198cd52e8e963a7f1848edb759589aa2e on main dd08b7380083f7cd4ef0340a25384cb32ff67f1a. Dispositions refer to the named scope at that cut. Accepted contracts retain their authority and dated reports retain their original limits. An accurate classification does not independently re-prove each underlying runtime or hosted result.

## Stale and conflicting assertions

| Path | Assertion and evidence | Risk | Disposition |
| --- | --- | --- | --- |
| README.md | Stage 3 active and Content/Arabic paused. #76 and #77 are accepted and merged. | Medium | Defer to #155 owner. Replace transient stage summary with canonical pointers after coordination. |
| docs/CURRENT_STATUS.md | Leads with November 5 #85 source. Actual main is dd08b738 and #154/#155/#156/#158 remain drafts. | High | Defer to #156/#158. Reconcile on the verified integration lineage, distinguishing source and deployments. |
| docs/SOURCE_OF_TRUTH.md | Calls November 5 staging repair current and uses earlier absolute Brand wording. #101 records AP01 typography and AP04 palette acceptance. AP05 is open. | High | Defer to #156/#158. Reclassify historical references, and index this workflow only upon adoption. |
| docs/IMPLEMENTATION_ROADMAP.md | #80 is the current exception and #79 open. GitHub confirms both merged. | Medium | Defer to active #94–#99 lanes touching this file. Relabel historical gates and preserve future sequencing. |
| docs/STAGING_UI_POLISH.md | “Current” refers to the #85 capture cutoff. | High | Preserve exact report. Adjust index classification after ownership is coordinated. |
| docs/CONTENT_SYSTEM.md and docs/ARABIC_UX.md | Proposal openers precede Owner CD01–CD07 acceptance 6568210676 and merged #77. | Medium | Defer to #113. Clarify foundations were accepted and example strings remain scoped. |
| docs/PROJECT.md | Calls #80 active and historical I2 hosting current. #80 is merged and hosted proof is historical. | High | Updated. Separate historical proof, main and Draft candidate lineage. |
| docs/ARCHITECTURE.md | Staging observations read as current and V2 strictly future. #154 is an unmerged V2 candidate. | High | Updated provenance and candidate status. Retained architecture. |
| docs/API.md | Says “in this reboot”. Current OpenAPI has 82 paths. | Low | Updated wording to checked-in API authority. |
| docs/DATA_MODEL.md | Current baseline points to eb61da. Main inventory still matches 63 models, 22 migrations. | Low | Updated provenance without changing counts. |
| docs/FOUNDATION_CHARTER.md | Names Codex as permanent UI executor. #157 current authority separates governance and Frontend ownership. | Medium | Updated role-neutral wording with Owner design gate intact. |
| docs/INFORMATION_ARCHITECTURE.md | Accepted IA and terminology read as proposals. Owner 6567526978 and #77 establish foundations. | Medium | Clarified accepted hierarchy and provenance of adoption-time text. |

## Coordinated status and index follow-up

Re-pin #154 14694a7, #155 8c6ea26, #156 1dcc003 and #158 1eaac03. #156 tracks release evidence on #154. #158 tracks preview-only restrictions on the stacked hardening lineage. The authorized editor should preserve #156 release findings while treating #158 AP05 removals and fail-closed behavior as candidate-specific facts. Compare overlapping sections against the exact authorized base before writing. Preserve AP05 OPEN_GATE, F06/E2 NO-GO, protected release HOLD, staging migration-parity uncertainty, inactive Pharmacy Live writes and Lab FUTURE. Keep exact toolchain on main, and label #155 Node 24.22.3 as candidate-only until proven otherwise.

MISSING / RECOMMENDED at the audit cut: a project-wide inventory and practical cross-client verification handoff. This companion supplies both. Actual Antigravity runtime results remain pending.

## File inventory

| Path | Audit-cut classification | Basis |
| --- | --- | --- |
| `.agents/skills/asset-rights-provenance/SKILL.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/asset-rights-provenance/references/asset-manifest.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/creative-direction/SKILL.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/creative-direction/references/baseline-audit.md` | HISTORICAL / PRESERVE | Repository entrypoint or point-in-time reference |
| `.agents/skills/creative-direction/references/patient-discovery-pilot.md` | HISTORICAL / PRESERVE | Repository entrypoint or point-in-time reference |
| `.agents/skills/creative-direction/references/workflow.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/frontend-implementation-handoff/SKILL.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/visual-review-and-a11y/SKILL.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `.agents/skills/visual-review-and-a11y/references/evidence-manifest.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `AGENTS.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `FIRST_AGENT_PROMPT.txt` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `README.md` | CURRENT / OUTDATED | See assertion above |
| `apps/web/public/fonts/README.md` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `docs/API.md` | CURRENT / OUTDATED | See assertion above |
| `docs/ARABIC_UX.md` | CURRENT / CONFLICTING | See assertion above |
| `docs/ARCHITECTURE.md` | CURRENT / OUTDATED | See assertion above |
| `docs/BP_CORRECTION_INVALIDATION_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/BP_CORRECTION_INVALIDATION_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/BRAND_DECISION_REGISTER.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/BRAND_EXPLORATION_BRIEF.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/BRAND_REFERENCE_MAP.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/BRAND_RESEARCH.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/BRAND_RESEARCH_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/BRAND_STRATEGY.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/CI_POLICY.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/CONTENT_DECISION_REGISTER.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/CONTENT_SYSTEM.md` | CURRENT / CONFLICTING | See assertion above |
| `docs/CONTENT_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/CURRENT_STATUS.md` | CURRENT / OUTDATED | See assertion above |
| `docs/DATA_MODEL.md` | CURRENT / OUTDATED | See assertion above |
| `docs/DECISIONS.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/DEEP_PLANNING_AUDIT_SUMMARY.md` | SUPERSEDED / RETAIN FOR TRACEABILITY | SUPERSEDED / LEGACY REFERENCE |
| `docs/DESIGN_SYSTEM.md` | SUPERSEDED / RETAIN FOR TRACEABILITY | SUPERSEDED / LEGACY REFERENCE |
| `docs/DOMAIN.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/EH-001_BOOTSTRAP_ISSUE.md` | SUPERSEDED / RETAIN FOR TRACEABILITY | SUPERSEDED / LEGACY REFERENCE |
| `docs/EH-003_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-005_PERSISTENCE.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-006_AUTH.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-006_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-007_AUTHORIZATION.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-007_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-008_DEMO_IDENTITIES.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-008_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-009_CLINICAL_DEFINITION_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-009_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-010_CARE_PLAN_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-010_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-011_BP_PROVENANCE_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-011_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-012_FOLLOWUP_ENCOUNTER_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-012_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-013_COVERAGE_NORMALIZED_EVIDENCE_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-013_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-014_INITIAL_CARE_ACTION_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-014_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EH-015_OBSERVED_APPLICABILITY_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/EH-015_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/EXECUTION_POLICY.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/FOUNDATION_CHARTER.md` | CURRENT / CONFLICTING | See assertion above |
| `docs/FOUNDATION_REBOOT_V2_AUDIT.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/FOUNDATION_REBOOT_V2_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/IA_DECISION_REGISTER.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/IA_SITEMAPS.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/IA_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/IMPLEMENTATION_ROADMAP.md` | CURRENT / OUTDATED | See assertion above |
| `docs/INFORMATION_ARCHITECTURE.md` | CURRENT / CONFLICTING | See assertion above |
| `docs/M1_DEMO_RUNBOOK.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/POST_SLICE3_DEPENDENCY_SECURITY_HOTFIX.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/PRE_FINAL_DOCTOR_DEMO_UI.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/PRE_FINAL_LIVE_STAGING.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/PRODUCT.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/PRODUCT_UX_INVENTORY.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/PRODUCT_UX_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/PRODUCT_V3_DECISIONS.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/PROJECT.md` | CURRENT / OUTDATED | See assertion above |
| `docs/PROJECT_PLAN_6_MONTHS.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/R1_UX_INTEGRATION_REPAIR.md` | HISTORICAL / PRESERVE | Repository entrypoint or point-in-time reference |
| `docs/REQUIREMENTS.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/RESEARCH.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/SECURITY.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/SOURCE_OF_TRUTH.md` | CURRENT / CONFLICTING | See assertion above |
| `docs/STAGING_UI_POLISH.md` | HISTORICAL / PRESERVE | Point-in-time evidence |
| `docs/TERMINOLOGY_GLOSSARY.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/TESTING.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/THESIS_STRUCTURE_V1.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/TRACEABILITY_MATRIX_V1.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/USER_JOURNEYS.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/UX.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/UX_DECISION_REGISTER.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/UX_FOUNDATION.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/UX_VALIDATION_V2.md` | SUPERSEDED / RETAIN FOR TRACEABILITY | SUPERSEDED / LEGACY REFERENCE |
| `docs/V3_I1_CLOSEOUT.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I1_SLICE2.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I1_SLICE2_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_SLICE3.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I1_SLICE3_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_SLICE4.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I1_SLICE4_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_SLICE5.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I1_SLICE5_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_SLICE6_EXIT_REVIEW.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I1_SLICE6_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE1.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE2.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE2_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE3.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE3_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE4.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE4_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE5.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE5_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE6.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I2_SLICE6_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE7_EXIT_REVIEW.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I2_SLICE7_VALIDATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_I3_CONTRACT.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I3_SLICE1.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_I3_SLICE2.md` | CURRENT / ACCURATE | ACCEPTED CONTRACT |
| `docs/V3_UI_AR_RTL.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_DEMO.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_FOLLOW_UP_INTENT_LIVE.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_I2_LIVE_CLOSEOUT.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_LIVE_ACCELERATOR.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_PHASE3_POLISH.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_PHASE4_CONSULTATION_OPENING.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_PHASE5_DOCUMENTATION.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/V3_UI_REAL_BOOKING.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/diagrams/SYSTEM_DIAGRAMS_V1.md` | SUPERSEDED / RETAIN FOR TRACEABILITY | SUPERSEDED / LEGACY REFERENCE |
| `docs/openapi.json` | CURRENT / ACCURATE | Repository entrypoint or point-in-time reference |
| `docs/research/CLINICAL_RULE_CATALOG_V1.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/CLINICAL_RULE_SOURCE_AUDIT.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/COMPETITOR_EVIDENCE_MATRIX.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/EXPERIMENT_PROTOCOL_V1.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/LITERATURE_REVIEW.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/METRICS_SPEC_V1.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/research/RELATED_WORK_MATRIX.md` | HISTORICAL / PRESERVE | HISTORICAL EVIDENCE |
| `docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_CODEX_PROMPT.md` | HISTORICAL / PRESERVE | Historical execution prompt |
| `docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_IMPLEMENTATION.md` | HISTORICAL / PRESERVE | Pinned implementation evidence |
| `docs/ui-reference/CLINICIAN_ACTIVE_CONSULTATION_MASTER_SPEC.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/CLINICIAN_PATIENT_DNA_PREMIUM.md` | HISTORICAL / PRESERVE | PR #80 delivery-time scope |
| `docs/ui-reference/CODEX_PROMPT.md` | HISTORICAL / PRESERVE | Historical execution prompt |
| `docs/ui-reference/PATIENT_MY_CARE_COMPOSITION.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/PATIENT_MY_CARE_IMPLEMENTATION.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/PATIENT_MY_CARE_POLISH.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/PATIENT_MY_CARE_REFINEMENT.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/PREMIUM_SYNTHESIS_SPEC.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/ui-reference/README_START_HERE.md` | CURRENT / ACCURATE | CURRENT AUTHORITATIVE |
| `docs/visual-directions-v2/COMPARISON.md` | HISTORICAL / PRESERVE | Point-in-time evidence |
| `docs/visual-directions-v2/README.md` | HISTORICAL / PRESERVE | Point-in-time evidence |
| `docs/visual-directions-v2/REFERENCE_STUDY.md` | HISTORICAL / PRESERVE | Point-in-time evidence |
| `docs/visual-directions-v2/VALIDATION.md` | HISTORICAL / PRESERVE | Point-in-time evidence |
| `docs/visual-directions/README.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/comparison/MATRIX.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/direction-a/README.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/direction-b/README.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/direction-c/README.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/evidence/VALIDATION.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |
| `docs/visual-directions/logos/REVIEW.md` | HISTORICAL / PRESERVE | VISUAL EXPLORATION — OWNER DECISION REQUIRED |

Coverage: 160 individually classified files, including all repository Markdown, the starter prompt and OpenAPI.

## Other tracked docs artifacts

The other 849 docs entries are preserved as historical evidence or supporting assets. The command git ls-tree -r d5d107b198cd52e8e963a7f1848edb759589aa2e -- docs lists their exact paths and blob IDs. Extension counts: .css 4, .html 128, .json 45, .log 19, .mjs 2, .png 618, .py 4, .svg 19, .ttf 4, .txt 6.
