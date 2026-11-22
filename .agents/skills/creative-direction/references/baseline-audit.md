# Issue #157 baseline and gap audit

The original #157 comparison used main `dd08b7380083f7cd4ef0340a25384cb32ff67f1a`. The original [#159](https://github.com/abuhmaid28/egyhealth360/pull/159) and [#160](https://github.com/abuhmaid28/egyhealth360/pull/160) drafts and the records below retain their point-in-time dispositions.

For Phase 0, use the [verified #158 baseline](../../../../docs/CURRENT_STATUS.md#active-baseline-and-phase-0-scope) at `42bfcfbe0f4ba4b3b14408befbc1545f1c9c668a`, tree `24bba04069b7097b97e7caa1719fb4b03c1cbae0`. The earlier removal commit `1eaac036` is historical. All 12 originals are present with [preview-only permission](../../asset-rights-provenance/references/asset-manifest.md#protected-demo-v1-disposition), and AP05 production clearance remains open. Issue #167 controls present ownership and future gates.

## Historical #157 comparison

| Path | Disposition | Existing capability or gap |
| --- | --- | --- |
| AGENTS.md | UPDATE | Keep #150 GitHub-first, evidence, authority and release rules. Correct obsolete permanent role assignment and add a discovery entrypoint. |
| README.md | NO CHANGE | Existing onboarding points into governance. #155 also changes this file. |
| FIRST_AGENT_PROMPT.txt | UPDATE | Existing reading order works. Add writer, skills and publication preflight cues. |
| docs/CURRENT_STATUS.md | NO CHANGE | #156 and #158 own concurrent updates. Issue receipts carry transient #157 state. |
| docs/SOURCE_OF_TRUTH.md | NO CHANGE | #156 and #158 own concurrent updates. The unchanged docs gate requires every docs/ Markdown document to be indexed. The workflow and templates live under the linked skills entrypoint. |
| docs/RELEASE_READINESS_135_149.md | NO CHANGE | Owned by #156. |
| docs/CI_POLICY.md | KEEP | Existing conservative classifier and gate suffice. |
| docs/TESTING.md | KEEP | Existing test and evidence contract. Reuse browser harness where authorized. |
| docs/FOUNDATION_CHARTER.md | KEEP | Current precedence and architecture preserved. |
| docs/SECURITY.md | KEEP | Current authority chain, booking separation, privacy and clinical constraints preserved. |
| docs/CONTENT_SYSTEM.md | KEEP | Existing bilingual copy and status guidance. |
| docs/ARABIC_UX.md | KEEP | Existing directionality, number and Egyptian Arabic guidance. |
| Design records #101, #105, #107, #109 and #111 | KEEP | Accepted Brand decisions are distinct from preferred or draft design references. No reclassification of historical artifacts or AP05 clearance. |
| .agents/skills/ | ADD | No tracked project-local SKILL.md found on main. Add four workflow skills and references. |
| Existing docs/ui-reference prompts | KEEP | Historical task prompts retain their provenance. |

Verified [Codex documentation](https://developers.openai.com/codex/skills) and [Antigravity documentation](https://antigravity.google/docs/skills) describe repository-local .agents/skills discovery. Use a matching directory/name and short description in SKILL.md frontmatter, with optional references loaded on demand. Actual IDE auto-discovery was not executed. No third-party skill code is imported. An installed tool or public repo does not establish license or execution trust.

The pinned #154 source contains existing Patient Discovery components and Playwright scripts. The focused script needs an already-available local axe bundle. Tool availability and runtime browser proofs remain distinct from reading these sources. The genuine gaps addressed here are project-local skill discovery, reusable rights and browser evidence templates, qualitative review rubric and a scoped flagship handoff.

| Evidence | Disposition |
| --- | --- |
| #134/#148, #135 and #150 | Historical integration and governance evidence. Use current exact issue authority for writes. |
| #154 14694a7e0aff9cccae8eef3c53a6f537d7568764 | Verified Draft and pinned source for the pilot. Prior full CI run 45043757862 belongs to that candidate. |
| #155 8c6ea2682fad7da4a3b687bae7a57a87611f25ac | Verified Draft. Prior full CI run 45048273473 belongs to that candidate. |
| #156 1dcc003cc8a2caf0dd54f35373c0cf52f8d1c697 | Verified Draft and exact-head run 45052377315 completed successfully. Preserve its files. |
| #158 1eaac036683e6bfc04f7dc9d07fc1bcf92553a8c | Verified separate preview Draft. AP05 removals and Demo fail-closed changes are candidate-specific and confer no publication or release authority. |
| #149 | Prior provider exclusions and smoke checks are bounded evidence. Any new push and Draft PR need applicable publication safety. |

For the broader follow-up, see the [repository documentation audit](documentation-audit.md) and [shared agent verification handoff](shared-agent-verification.md).
