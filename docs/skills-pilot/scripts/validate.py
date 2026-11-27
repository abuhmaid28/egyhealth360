"""Dependency-free static package validation; never reports behavioral activation."""
import collections
import json
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()
PILOT = ROOT / "docs/skills-pilot"
BASE = "5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3"
NAMES = {"eh360-ux-review", "eh360-visual-exploration", "eh360-visual-qa"}


def git(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


skills = sorted((ROOT / ".agents/skills").glob("*/SKILL.md"))
assert {p.parent.name for p in skills} == NAMES, "Exactly three pilot Skills required"
descriptions = []
links = 0
markdown = skills + sorted(PILOT.rglob("*.md"))
for path in skills:
    text = path.read_text()
    # This deliberately restricted YAML subset is valid YAML: plain name and
    # JSON-quoted single-line description, exactly two fields, no custom tags.
    match = re.match(r'^---\nname: ([a-z0-9-]+)\ndescription: ("[^\n]+")\n---\n', text)
    assert match, f"Invalid or unsafe manifest: {path}"
    assert match[1] == path.parent.name
    description = json.loads(match[2])
    assert 50 < len(description) <= 400 and "not " in description
    descriptions.append(description)
    assert len(text.encode()) < 7000, f"Context budget exceeded: {path}"
    assert "REFERENCE_MAP.md" in text and "AGENTS.md" in text
assert len(set(descriptions)) == 3, "Duplicate descriptions"
for path in markdown:
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text()):
        if re.match(r"[a-z]+://", target):
            continue
        target = target.split("#")[0]
        resolved = (path.parent / target).resolve() if target else path
        assert resolved.is_relative_to(ROOT) and resolved.exists(), f"Broken/escaping reference: {path}: {target}"
        links += 1
fixture = json.loads((PILOT / "EVALUATION_CASES.json").read_text())
assert fixture["provenance"] == "RECONSTRUCTED_S1_NOT_RECOVERED_R0"
cases = fixture["cases"]
assert fixture["case_count"] == len(cases) == 42
assert len({c["id"] for c in cases}) == 42
assert len({c["prompt"] for c in cases}) == 42
counts = {}
for name in sorted(NAMES):
    group = [c for c in cases if c["target_skill"] == name]
    counts[name] = dict(collections.Counter(c["category"] for c in group))
    assert counts[name] == {"explicit": 3, "implicit_positive": 4, "negative": 4, "adversarial_boundary": 3}
for case in cases:
    assert case["target_skill"] in NAMES
    assert case["expected_activation"] == (case["category"] != "negative")
    assert case["expected_skill_set"] == ([case["target_skill"]] if case["expected_activation"] else case["expected_skill_set"])
    assert all(n in NAMES for n in case["expected_skill_set"])
    assert case["target_skill"] not in case["expected_skill_set"] or case["expected_activation"]
    for key in ("prompt", "expected_behavior", "required_evidence", "hard_failure_conditions", "scoring_criteria"):
        assert case[key], f"Missing {key}: {case['id']}"
    for item in case["scoring_criteria"]:
        assert set(item["scale"]) == {"0", "1", "2"}
    for artifact in case["artifacts"]:
        assert (ROOT / artifact).is_file(), f"Missing fixture artifact: {artifact}"
    assert case["execution_status"] == "NOT_EXECUTED"
    assert case["observed_activation"] is None and case["score"] is None and case["evidence_paths"] == []
baseline = set(git("ls-tree", "-r", "--name-only", BASE).splitlines())
changed = set(git("diff", "--name-only", "--no-renames", BASE).splitlines())
changed |= set(git("ls-files", "--others", "--exclude-standard").splitlines())
allowed_updates = {"docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md"}
for path in changed:
    assert path in allowed_updates or path.startswith("docs/skills-pilot/") or any(path == f".agents/skills/{n}/SKILL.md" for n in NAMES), f"Unauthorized path: {path}"
assert not git("diff", "--name-only", "--diff-filter=D", BASE), "Deletion outside pilot not authorized"
assert not git("diff", BASE, "--", "AGENTS.md", "docs/FOUNDATION_CHARTER.md", "apps", "packages", ".github", "scripts", "tests", "pnpm-lock.yaml", "package.json"), "Protected source changed"
result = {"kind": "STATIC_CHECKS_ONLY", "base": BASE, "skills": len(skills), "cases": len(cases),
          "per_skill": counts, "local_links_checked": links, "changed_paths": sorted(changed),
          "baseline_files_unchanged": len(baseline - changed),
          "trigger_check": "Unique descriptions and fixture boundaries checked; model selection NOT tested",
          "behavioral_cases_executed": 0, "cloud_discovery": "CLOUD_DISCOVERY_UNVERIFIED", "result": "PASS"}
print(json.dumps(result, indent=2))
