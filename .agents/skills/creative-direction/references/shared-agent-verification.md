# Shared skill verification and receiver handoff

Use the exact candidate in a separate clean checkout. Record HEAD, tree and agent version. The authorities are root AGENTS.md and current approved scope. The project skills live in .agents/skills and load references on demand. The current task remains a local documentation audit.

| Capability | Codex | Antigravity |
| --- | --- | --- |
| Documented project discovery | [Codex skills](https://developers.openai.com/codex/skills) | [Antigravity skills](https://antigravity.google/docs/skills) |
| Runtime discovery | CLI 0.159.2 app-server skills/list with forceReload returned all four as enabled repo skills at expected paths. Model-visible prompt discovery also listed all four. | NOT TESTED. No Antigravity App/CLI was available in the execution environment. |
| Model-driven invocation | NOT RUN. The local discovery test made no model call. | NOT RUN. Execute receiver steps below. |
| Metadata and references | Shared frontmatter uses directory-matched name and description. Local links checked by the repository docs gate. | Same files and metadata. No duplicated instructions or installed connectors are required. |

## Antigravity receiver verification

1. Open the authorized checkout root in Antigravity and reload the workspace. In its terminal run: git rev-parse HEAD HEAD^{tree}, git status --porcelain and git ls-files ".agents/skills/*/SKILL.md". Record the client version and exact pins. Stop if the checkout is dirty or the pins differ from the authorized handoff.
2. In fresh chats, type a slash and verify autocomplete for creative-direction, asset-rights-provenance, frontend-implementation-handoff and visual-review-and-a11y. Invoke each by selecting its slash entry. Use this prefix each time: “Read-only synthetic verification. Local read-only instructions and linked reference files may be opened. No edits, shell commands, network, uploads or external tools.”
3. Ask creative-direction for three distinct prioritizations for a fictional directory. Ask asset-rights-provenance how to inventory and dispose of an unlicensed placeholder. Ask frontend-implementation-handoff which approvals, pins, and evidence a fictional handoff needs. Ask visual-review-and-a11y to separate keyboard/reflow checks from a visual score. Each answer must apply the corresponding linked reference and keep Owner approval and rights gates intact.
4. In a fresh chat ask “How should I record the source and disclosure rights for a fictional illustration?” without naming a skill. Record automatic selection only if the client exposes an activation trace. Record missing traces as NOT OBSERVABLE.
5. Record discovery and invocation separately with skill names, relevant reference paths, and sanitized evidence of outputs. PASS requires four discovered project skills and four matching manual outputs with no side effects. Missing installation or checkout access is BLOCKED, missing skill or wrong instructions is FAIL. Finish with empty git status. Share only a sanitized receipt through the permitted GitHub route.

## Prioritized pilot after receiver verification

First re-pin the approved #154-derived candidate with Antigravity and verify source and parent dependencies. Then seek separate approval for read-only concept exploration and rights-safe fixtures using the [Patient Discovery brief](patient-discovery-pilot.md). Compare the three concepts in the browser. Ask the Owner to select the exact version and authorize the implementation allowlist and pilot thresholds. Run browser and independent review only within that authorized follow-up. Keep wider rollout and release gated.
