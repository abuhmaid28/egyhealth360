"""Byte-preservation proof for the final owner-directed My Care optical pass."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASE = "47fa8e8bafaac1b96d4ba0065a65250f80448156"
ALLOWED = {
    "apps/web/src/components/patient-my-care.tsx",
    "apps/web/src/components/patient-my-care.module.css",
    "scripts/support/ui-my-care-browser.mjs",
    "docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md",
    "docs/PROJECT.md", "docs/IMPLEMENTATION_ROADMAP.md",
}
NEW = {"scripts/capture-patient-my-care-polish.mjs", "scripts/check-patient-my-care-polish-scope.py", "docs/ui-reference/PATIENT_MY_CARE_POLISH.md"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


baseline = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
preserved = []
for path in sorted(baseline - ALLOWED):
    value = (ROOT / path).read_bytes()
    assert value == git("show", f"{BASE}:{path}"), f"Out-of-scope change: {path}"
    preserved.append((path, hashlib.sha256(value).hexdigest()))
changed = set(git("diff", "--name-only", BASE).decode().splitlines())
changed.update(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
for path in changed:
    assert path in ALLOWED or path in NEW or (path not in baseline and path.startswith("docs/ui-reference/polish-evidence/")), path
component = "apps/web/src/components/patient-my-care.tsx"
current = (ROOT / component).read_text()
old = git("show", f"{BASE}:{component}").decode()
assert current.split("  return (\n    <>", 1)[0] == old.split("  return (\n    <>", 1)[0], "Read/state/session changed"
assert current.split("function StateLabel(", 1)[1] == old.split("function StateLabel(", 1)[1], "Appointment/actions/shortcuts/recent behavior changed"
for handler in ["onRoleChange(e.target.value as Role)", "setPreview(e.target.value as ScreenState)"]:
    assert handler in current and handler in old
css_path = "apps/web/src/components/patient-my-care.module.css"
css = (ROOT / css_path).read_text()
old_css = git("show", f"{BASE}:{css_path}").decode()
assert css.split("/* Owner-directed premium composition:")[0].replace("overflow-wrap: normal;\n  word-break: normal;\n  hyphens: none;", "overflow-wrap: anywhere;") == old_css.split("/* Owner-directed premium composition:")[0], "Earlier core sizing/type/RTL architecture changed"
assert re.search(r"\.root \{.*?\n\}", css, re.S).group() == re.search(r"\.root \{.*?\n\}", old_css, re.S).group()
prior = [p for p, _ in preserved if p.startswith(("docs/ui-reference/evidence/", "docs/ui-reference/refinement-evidence/", "docs/ui-reference/composition-evidence/"))]
result = {
    "base": BASE, "changedPaths": sorted(changed), "preservedExistingFiles": len(preserved),
    "preservedInventorySha256": hashlib.sha256(json.dumps(preserved, ensure_ascii=False).encode()).hexdigest(),
    "priorEvidenceFilesPreserved": len(prior),
    "unchanged": "All other existing bytes, including original references, all prior evidence/reports, copy, fonts/palette, data/read/state/session and appointment/next-action/shortcut/recent-care behavior, backend/API/DB/schema/security, unrelated workspaces, CI/hosting",
}
out = ROOT / "docs/ui-reference/polish-evidence/scope-checks.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"PASS: {len(preserved)} other existing files and {len(prior)} prior evidence files preserved; {len(changed)} bounded paths; core behavior/type/palette/structure preserved.")
