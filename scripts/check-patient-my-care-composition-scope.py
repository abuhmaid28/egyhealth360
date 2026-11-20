"""Preserve every pre-existing byte outside the owner-authorized My Care composition."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASE = "b1421ecf41a01c9734649f3d1833608fab19dc43"
ALLOWED = {
    "apps/web/src/components/patient-my-care.tsx",
    "apps/web/src/components/patient-my-care.module.css",
    "apps/web/src/lib/patient-my-care-copy.ts",
    "scripts/capture-patient-my-care.mjs", "scripts/test-ui-browser.mjs",
    "scripts/support/ui-my-care-browser.mjs", "scripts/support/ui-rtl-browser.mjs",
    "scripts/support/ui-live-journey-browser.mjs", "docs/CURRENT_STATUS.md",
    "docs/SOURCE_OF_TRUTH.md", "docs/PROJECT.md", "docs/IMPLEMENTATION_ROADMAP.md",
}
NEW = {"scripts/check-patient-my-care-composition-scope.py", "docs/ui-reference/PATIENT_MY_CARE_COMPOSITION.md"}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


baseline = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
preserved = []
for path in sorted(baseline - ALLOWED):
    value = (ROOT / path).read_bytes()
    assert value == git("show", f"{BASE}:{path}"), f"Out-of-scope existing change: {path}"
    preserved.append({"path": path, "sha256": hashlib.sha256(value).hexdigest()})

changed = set(git("diff", "--name-only", BASE).decode().splitlines())
changed.update(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
for path in changed:
    assert path in ALLOWED or path in NEW or (path not in baseline and path.startswith("docs/ui-reference/composition-evidence/")), path

path = "apps/web/src/components/patient-my-care.tsx"
current = (ROOT / path).read_text()
old = git("show", f"{BASE}:{path}").decode()
assert current.split("  return (\n    <>", 1)[0] == old.split("  return (\n    <>", 1)[0], "Read/state/session composition changed"
for start, end in [("function AppointmentAnchor(", "function NextForYou("), ("function NextForYou(", "function CareShortcuts("), ("function CareShortcuts(", "function RecentCare(")]:
    a = current[current.index(start):current.index(end)]
    b = old[old.index(start):old.index(end)]
    assert re.sub(r"\s", "", a) == re.sub(r"\s", "", b), f"Behavior/source content changed in {start}"
for handler in ["onRoleChange(e.target.value as Role)", "setPreview(e.target.value as ScreenState)"]:
    assert handler in current and handler in old, handler
copy_path = "apps/web/src/lib/patient-my-care-copy.ts"
copy = (ROOT / copy_path).read_text().replace('    demoUtility: "Demo options",\n', '').replace('    demoUtility: "خيارات التجربة",\n', '')
assert copy == git("show", f"{BASE}:{copy_path}").decode(), "Copy changed beyond the authorized Demo utility label"
css_path = "apps/web/src/components/patient-my-care.module.css"
pattern = r"\.root \{.*?\n\}"
assert re.search(pattern, (ROOT / css_path).read_text(), re.S).group() == re.search(pattern, git("show", f"{BASE}:{css_path}").decode(), re.S).group(), "Fonts/color/token root changed"

protected = [p for p in preserved if p["path"].startswith("docs/ui-screenshots/doctor-demo/")]
prior = [p for p in preserved if p["path"].startswith(("docs/ui-reference/evidence/", "docs/ui-reference/refinement-evidence/"))]
result = {
    "compositionBase": BASE, "authority": "Product Owner's second My Care composition instruction in the current chat",
    "allowedExistingChanges": sorted(ALLOWED), "changedPaths": sorted(changed),
    "preserved": preserved, "protectedV1": protected, "priorImplementationEvidence": prior,
    "unchanged": "Application dispatch; API/adapters/read projections; read/state/session logic; appointment/next-action/shortcut data and routes; fonts/licenses/palette tokens; backend; API/OpenAPI; DB/schema/migrations; security/authorization; CI policy; hosting/deployment; unrelated workspaces and clinical workflows; original owner references and prior evidence",
    "authorizedChanges": "Presentation/composition, absent recent metadata omission, collapsed Demo utility with original handlers/capability, scoped mobile/RTL polish and supporting QA/governance",
}
out = ROOT / "docs/ui-reference/composition-evidence/patient-my-care-composition-preservation.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"PASS: {len(preserved)} existing files unchanged; {len(protected)} protected V1 files; {len(prior)} prior evidence files; data/state/session and appointment/action/shortcut behavior preserved; {len(changed)} bounded paths.")
