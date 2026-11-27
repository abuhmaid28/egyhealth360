# Basic Skill audit and cost model

**Decision: permit a pinned, static Basic-derived playbook for this bounded pilot; do not install the upstream package or claim full Skill efficacy.** The original [MIT Basic repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/b7d5353e0130feb8c5574ef1251f8a1db1873ccb) was inspected in a temporary checkout outside the product repository on 7 November 2026. Reviewed commit: `b7d5353e0130feb8c5574ef1251f8a1db1873ccb` (5 November 2026, “add Apple Native Experience UI style”). [Pinned file digests](vendor/upstream-lock.json). MIT copyright: 2024 Next Level Builder; [full notice retained](vendor/LICENSE).

## Scope and supply chain

| Surface | Observed behavior / implication | Pilot disposition |
| --- | --- | --- |
| README Basic/Premium section | Basic offers local style/product/UX catalogs, BM25 search and system generation. Premium advertises expanded identity/logo/asset generation. This is an upstream description, not independent performance proof. | Only selected static Basic UX checklist rows used. No brand/logo/banner/image subskills, Premium assets or generation. |
| `cli/package.json` v2.5.0 | Dependencies: chalk ^5.3.0, commander ^12.1.0, ora ^8.1.1, prompts ^2.4.2; dev tooling includes Playwright, Bun/Node types, TypeScript. prepublishOnly syncs/validates/builds. | CLI not installed, built or executed. No dependency or lockfile additions. Transitive packages are not cleared for adoption by this audit. |
| `cli/src/utils/github.ts` | Uses GitHub release API/latest and release/archive download. Reads explicit token or UI_PRO_MAX_GITHUB_TOKEN/GITHUB_TOKEN; forwards Authorization to download URL. No host restriction visible in downloadRelease. | Installer network and token exposure path excluded. No tokens passed to upstream. |
| `init.ts`, `template.ts`, `extract.ts`, `sync-assets.mjs`, `update.ts` | Installation writes assistant instruction directories, copies data/subskills; shell unzip/copy fallback uses interpolated paths. Update can invoke npm and refresh moving versions; sync/uninstall paths use recursive deletion. | All excluded. No npm/uipro/curl-pipe-shell installation, update, global manifest or assistant-directory mutation. These are risk-bearing capabilities, not a proven exploit report. |
| Python entrypoints | AST/import and file/network-call inspection: core/search/design_system/reasoning_contract use standard library and local modules; validate_data uses urllib.parse for URL parsing. No network-client imports found in these five entrypoints. | No upstream Python executed or vendored. Search result quality, full execution behavior and security are not certified. |
| `design_system.py` persistence | Can create design-system/project MASTER/pages; --force replaces files, with temp/atomic write behavior. Output location is caller-controlled. | No generator, persist or force used. Cannot overwrite an accepted system. |
| CSV and instructions | Recommendations include 4.5:1 text, focus, labels, reflow and platform-dependent targets. Some compact-label nowrap examples conflict with small Arabic text; tabindex example can mislead. Broad mandatory generation/implementation instructions exceed pilot scope. | Only 26 exact Basic CSV rows retained in JSON. [Adaptation](PLAYBOOK.md) resolves conflicts in favor of accepted contracts, natural DOM order, wrapping and user scope. |
| Catalog links/assets | Font/icon catalogs reference external services; no license of an external asset follows merely from MIT code. | No catalog font, icon, screenshot, image, paid asset, remote import or copied competitor interface used. Existing local OFL fonts only. |

This is a targeted source/capability review for a **non-executable static subset**, not a full upstream penetration test or dependency advisory audit. Readable upstream text was treated as untrusted reference during inspection. Only the constrained playbook below is loaded as workflow instruction. A future decision to run/search/install requires a separate execution-path audit and repinning; this pilot does not grant it.

## Compatibility

The product remains Next.js/TypeScript + NestJS + PostgreSQL/Prisma/pnpm. A local HTML/CSS/JS specimen has no package integration and imports no product components. The adapted principles can inform a later approved frontend specification but cannot choose production tokens or component APIs. Accepted UXD10–16, IA01–05/Patient B/Clinician B and CD01–07 override generic “healthcare dashboard” catalog suggestions. Arabic, actual clinical source states and privacy need repository-specific expertise; the general-purpose Skill cannot supply them. No assertion that its Basic catalog alone generates original premium healthcare design is made.

## Actual activation

One host availability check in this task: `skills.list({authority:{kind:"executor"}})` returned `skills: []`, `warnings: []`, `next_cursor: null`. The active session catalog contains no ui-ux-pro-max Skill and exposes no native install/select/load event for it. **NATIVE ACTIVATION NOT VERIFIED / NOT AVAILABLE IN THIS SESSION.** No local CLI discovery probe is substituted for hosted activation; no repeated authentication workaround was attempted.

Actual mode: **EXPLICIT_AUDITED_PLAYBOOK_ONLY**. The separate design agent reports explicitly reading [PLAYBOOK.md](PLAYBOOK.md) before authoring. Selected upstream rows were inherited context and applied through that playbook; the retained JSON was separately opened only during the later evidence follow-up. [Loading record and hashes](evidence/activation.json) preserve that distinction. This is agent-reported explicit file loading only, not host activation telemetry. The native selection/loading gate remains unfulfilled. PR #87's local discovery is historical independent evidence of local catalog behavior, not this mode. S1 remains PAUSED_EXTERNAL_HOST_BLOCKER with hosted behavioral/paired efficacy unmeasured; no S1 file or score is changed.

## Incremental cost model

| Resource | Pilot use | Additional purchase / paid dependency |
| --- | --- | --- |
| Basic source/checklist | Public pinned MIT text; no Premium service/account | $0 license charge |
| Authoring/review | Existing conversation and provided agent runtime; no model API key, external LLM/image API or credit purchase | No new subscription/API charge initiated; existing account access is a prerequisite, not claimed universally free |
| Renders | Installed Chromium + Playwright on provided machine; localhost only | $0 new software/service; no install required |
| Type/assets | Existing Manrope / IBM Plex Sans Arabic OFL files; original CSS/SVG UI treatment | $0; existing notices unchanged |
| Storage/review | Public GitHub repository, committed PNG/HTML/specifications; unmerged PR | No new hosting or deployment service |
| Required CI | Existing unchanged ubuntu-24.04 standard hosted runners on a verified public repository; one stable final candidate | Standard public-repository Actions use is free under GitHub's published model; no larger runner, subscription, paid API or billing-setting change |

[GitHub standard runner billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions) documents the public-repository distinction. No budget/spend cap is changed. The pilot verifies actions taken and dependencies used; it cannot certify the owner's pre-existing subscription invoices or future pricing. “Zero additional cost” means **no new purchase, credit spend, paid dependency or subscription is required or initiated by this workflow**, not zero underlying compute cost. The owner only views PNGs in GitHub/chat and chooses a direction; no install, code, manual design or IDE is required.

## Fit verdict

**Useful as a free checklist input; insufficient as autonomous art direction or clinical/Arabic authority.** Continue this temporary explicit mode for a bounded comparison. Do not adopt it as a native Skill, freeze a system, claim measured improvement, or import the installer based on this pilot. The independent rendered review and owner decision remain distinct gates.
