# Foundation Reboot V2 — validation and fresh-agent comprehension

HISTORICAL EVIDENCE for the Stage 0+1 documentation proposal, not a new authorization. Baseline: `eb61da263ce44db5ca71ffdfea6a87309c8e17ef`; branch: `docs/foundation-reboot-v2-stage0-stage1`; [issue #72 final authorization](https://github.com/abuhmaid28/egyhealth360/issues/72#issuecomment-6563757904). Exact final PR/head and remote CI are recorded in the PR handoff, avoiding a self-referential document commit hash.

## Focused validation

- Scope allowlist: only Markdown under docs plus root AGENTS.md, README.md and FIRST_AGENT_PROMPT.txt. No runtime/config/CI edits or dependency additions.
- Byte comparison against baseline for every tracked file under `apps/`, `packages/`, `scripts/`, `tests/`, `.github/`, `docs/ui-screenshots/`, plus OpenAPI, package/lock/workspace/Docker/Compose files: **463 protected files unchanged**. Thus no Prisma schema/migration, API/OpenAPI, backend/frontend behavior, security/auth/clinical rule, logo/font/DS code or screenshot change.
- Schema/OpenAPI inventories checked: **63 models, 22 migrations, 82 paths**. Every model appears in the current data inventory; every documentation Markdown path appears in SOURCE_OF_TRUTH.
- Main I1/I2/I3 contract text after the added scope notice matches its original body exactly. D01–D36 decision-register block remains byte-identical. Delivery/status edits do not amend frozen clinical/security/product requirements.
- Focused local Markdown target/anchor and fence checks cover every changed Markdown file; all new references resolve. No Markdown/link tool exists in the repository workflow. The check does not claim every external historical URL is available.
- Manual consistency pass covers accepted versus implemented versus Live, active versus unauthorized, final-domain protection, owner decision gates, B verdict/no required Stage 1.5, future roadmap and authority/privacy invariants.
- `git diff --check` passes. Required full GitHub CI is retained; expensive runtime suites were not duplicated locally for a docs-only change.

Reproduce primary scope checks from the PR head, using the baseline above:

```sh
git diff --check eb61da263ce44db5ca71ffdfea6a87309c8e17ef HEAD
git diff --exit-code eb61da263ce44db5ca71ffdfea6a87309c8e17ef HEAD -- apps packages scripts tests .github docs/openapi.json docs/ui-screenshots package.json pnpm-lock.yaml pnpm-workspace.yaml Dockerfile compose.yaml compose.local.yaml
git diff --name-only eb61da263ce44db5ca71ffdfea6a87309c8e17ef HEAD
```

## Screenshot preservation proof

All **18 doctor-demo files** (PNG and JSON), **2,560,222 bytes**, remain byte-identical to baseline. No screenshot was deleted, overwritten or regenerated; all other existing screenshot paths are also unchanged.

- Baseline and retained Git directory tree: **`c4abdc4430d581ef2c5c136ff78066c66da5a2d0`**.
- Sorted SHA-256 manifest digest: **`6d3863bbc0da4351d7facd605b4cd8999fae604ea5c14613d7b6a2416fcf2686`**.
- Manifest definition: concatenate, in sorted repository-relative path order, `<file SHA256><two spaces><repository-relative path><LF>` for all doctor-demo files, then SHA-256 those UTF-8 bytes.

Reproduce the manifest without writing any screenshot:

```sh
python - <<'PY'
from pathlib import Path
import hashlib
files = sorted(Path('docs/ui-screenshots/doctor-demo').glob('*'))
manifest = ''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p}\n' for p in files)
print(len(files), sum(p.stat().st_size for p in files))
print(hashlib.sha256(manifest.encode()).hexdigest())
PY
git rev-parse HEAD:docs/ui-screenshots/doctor-demo
```

## Fresh-agent comprehension simulation

Method: after drafting the new reading path, answer these questions from only AGENTS → current issue/final authorization → CURRENT_STATUS → charter/source index, following their links to current architecture/roadmap where needed. No older PR discussion was needed to infer current state. This is a **self-simulated comprehension pass**, not a separately delegated independent review. Result: **20/20 answerable**, with source locations below.

| # | Question | Answer from the new path | Source |
| --- | --- | --- | --- |
| 1 | What is EgyHealth 360? | Integrated synthetic graduation healthcare journey platform, with later continuity and bounded HTN research | CURRENT_STATUS: Product |
| 2 | What architecture exists now? | Next.js → NestJS modular monolith → PostgreSQL 18/Prisma 7; pnpm/REST/OpenAPI/Docker/Actions; pre-final Vercel web/API and Neon | CURRENT_STATUS / ARCHITECTURE |
| 3 | What milestones are complete? | M0/M1/M2, G0, I1, I2, I3 contract and Slices 1/2; not overall I3 | CURRENT_STATUS: Accepted implementation |
| 4 | What parts of I3 are complete? | Contract; Slice 1 medication catalog/prescription source; Slice 2 pharmacy routing/full-item dispense | CURRENT_STATUS / roadmap |
| 5 | What is Live? | Evidenced pre-final I2 patient/clinician journey through close, EN/AR/RTL; exact-main/I3 cloud parity unverified; Demo shells are distinct | CURRENT_STATUS: Live versus merged |
| 6 | What is active? | Issue #72 Foundation Reboot V2 Stage 0+1 docs/governance/audit proposal and independent review | CURRENT_STATUS: Active |
| 7 | Is Lab authorized? | No, Slices 3/4/5 paused; accepted future contract is not execution permission | CURRENT_STATUS: Paused |
| 8 | Is EACCE authorized? | No; I5 and AI inference remain unauthorized | CURRENT_STATUS: Paused |
| 9 | Is current UI final? | No, FUNCTIONAL V1 PROTOTYPE / BEFORE BASELINE | CURRENT_STATUS / charter |
| 10 | Is current logo final? | No; logo/brand choices require owner approval | CURRENT_STATUS / charter |
| 11 | Who chooses future design? | Product Owner selects/rejects/hybridizes the three directions and approves final choices | Charter: Future process |
| 12 | May Codex invent final UI? | No; approved UX/content/brand/DS/high-fidelity prototype are prerequisites | AGENTS / charter: Decision boundary |
| 13 | What docs are current? | CURRENT_STATUS delivery, charter governance, index classification, current architecture/product/domain/API/data/security/testing/project/roadmap references | SOURCE_OF_TRUTH: Current authoritative |
| 14 | What docs are historical? | Validation/exit/UI/hosting/screenshot/research-planning evidence; old status in accepted contracts is adoption context; legacy visual direction is not final spec | SOURCE_OF_TRUTH classifications |
| 15 | Core authority/privacy invariants? | Assignment is clinical grant; booking none; exact current staff artifact scope; ADMIN operational; own data/private-note/explicit release, immutable history, wrong-patient suppression, atomic audit/replay/concurrency | AGENTS / charter / ARCHITECTURE |
| 16 | Protected domain? | `egyhealth360.vercel.app`, no promotion/alias/DNS change | CURRENT_STATUS |
| 17 | What happens after Stage 1? | Independent review/owner acceptance, then separate authorization for Product UX/IA/content/Arabic unless P0/P1 requires Stage 1.5 first | CURRENT_STATUS / roadmap |
| 18 | When is Stage 1.5 required? | Concrete P0/P1 foundation debt before Product UX; current verdict B does not require it; never automatic execution | CURRENT_STATUS / charter |
| 19 | Future approval gates? | UX/IA/content/Arabic approval → research/three distinct directions → owner choice/hybrid → Brand V2/DS V2 approvals → Patient/Clinician prototypes → final visual approval → Frontend Architecture V2 → implementation/Visual QA | Charter: Future process |
| 20 | Next authorized action? | Independently review Stage 0+1, exact diff/head/main CI and health verdict; no next feature/design phase starts automatically | CURRENT_STATUS: Next authorized action |

The 20 answers do not require the old authorization comment, slice-era status paragraphs or PR archaeology. A future agent must still recheck the latest applicable authorization and remote main because this is a pinned baseline snapshot.

## CI and delivery evidence

PR #71 exact-main post-merge **Bootstrap CI [41348249063](https://github.com/abuhmaid28/egyhealth360/actions/runs/41348249063): SUCCESS**, head `eb61da263ce44db5ca71ffdfea6a87309c8e17ef`. All `static-browser`, `postgres`, `docker-runtime` and `validate` jobs completed successfully; no genuine main regression was exposed by that run.

Final PR CI must be checked against the actual branch head (or GitHub's synthetic merge ref whose parents contain that exact head and base). A green older run is insufficient. The final PR handoff records its exact head/base/run/result and confirms OPEN / UNMERGED / auto-merge OFF. No CI gate is weakened or skipped by this proposal.

## Scope conclusion

No UI redesign, logo/Design System implementation, backend/API/security/auth/database behavior change, Lab implementation, I4/I5/EACCE/AI or final-domain change. Proposed health verdict B and no required Stage 1.5 remain subject to independent review and owner acceptance. Later Product/Design and remediation work needs its own authorization.
