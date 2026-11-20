"""Verify only the independent review's Patient My Care refinements changed."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASE = "218887c5d15b88bbad6e5bb5a336202305fe655e"
ALLOWED = {
    "apps/web/src/components/patient-my-care.tsx",
    "apps/web/src/components/patient-my-care.module.css",
    "apps/web/src/lib/patient-my-care-copy.ts",
    "tests/ui-my-care.test.mjs", "scripts/capture-patient-my-care.mjs",
    "scripts/test-ui-browser.mjs", "scripts/support/ui-live-journey-browser.mjs",
    "scripts/support/ui-my-care-browser.mjs", "docs/CURRENT_STATUS.md",
    "docs/SOURCE_OF_TRUTH.md", "docs/PROJECT.md", "docs/IMPLEMENTATION_ROADMAP.md",
}
NEW = {
    "apps/web/src/lib/patient-my-care-avatar.ts",
    "docs/ui-reference/PATIENT_MY_CARE_REFINEMENT.md",
    "scripts/check-patient-my-care-refinement-scope.py",
}


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


baseline = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
preserved = []
for path in sorted(baseline - ALLOWED):
    actual = (ROOT / path).read_bytes()
    assert actual == git("show", f"{BASE}:{path}"), f"Out-of-scope existing change: {path}"
    preserved.append({"path": path, "sha256": hashlib.sha256(actual).hexdigest()})

changed = set(git("diff", "--name-only", BASE).decode().splitlines())
changed.update(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
for path in changed:
    assert path in ALLOWED or path in NEW or (path not in baseline and path.startswith("docs/ui-reference/refinement-evidence/")), path

path = "apps/web/src/components/patient-my-care.tsx"
actual = (ROOT / path).read_text()
original = git("show", f"{BASE}:{path}").decode()
without_import = actual.replace('import { clinicianMonogram } from "../lib/patient-my-care-avatar";\n', "")
assert without_import.split("function AppointmentAnchor(")[0] == original.split("function AppointmentAnchor(")[0], "Read/state/session composition changed"
tail = actual[actual.index("function CareShortcuts("):].replace("data-care-shortcuts", "")
before_tail = original[original.index("function CareShortcuts("):]
assert re.sub(r"\s", "", tail) == re.sub(r"\s", "", before_tail), "Shortcut/recent-care routes, source/status content or behavior changed"

copy_path = "apps/web/src/lib/patient-my-care-copy.ts"
copy = (ROOT / copy_path).read_text().replace('greeting: "Welcome back,"', 'greeting: "Good morning,"').replace('greeting: "أهلاً يا"', 'greeting: "صباح الخير يا"')
assert copy == git("show", f"{BASE}:{copy_path}").decode(), "Content changed beyond the two authorized greeting strings"
css_path = "apps/web/src/components/patient-my-care.module.css"
tokens = re.search(r"\.root \{.*?\n\}", (ROOT / css_path).read_text(), re.S).group()
original_tokens = re.search(r"\.root \{.*?\n\}", git("show", f"{BASE}:{css_path}").decode(), re.S).group()
assert tokens.replace("--care-muted: #526178", "--care-muted: #64748b") == original_tokens, "Slice tokens changed beyond the authorized muted role"

protected = [p for p in preserved if p["path"].startswith("docs/ui-screenshots/doctor-demo/")]
old_evidence = [p for p in preserved if p["path"].startswith("docs/ui-reference/evidence/")]
result = {
    "refinementBase": BASE,
    "review": "https://github.com/abuhmaid28/egyhealth360/pull/79#issuecomment-6577639703",
    "allowedExistingChanges": sorted(ALLOWED), "changedPaths": sorted(changed),
    "preserved": preserved, "protectedV1": protected, "originalImplementationEvidence": old_evidence,
    "unchanged": "Application route guard; own data/source projections and adapters; backend; API/OpenAPI; DB/schema/migrations; security/authorization; CI policy; hosting/deployment; all unrelated clinical workflows; fonts/licenses; original owner handoff/SVG; prior reports and visual evidence",
    "goodDecisions": "Exact read/state/session composition preserved; shortcut/recent-care routes and logic preserved; real adapter data, 24-hour actual event timezone, RTL/bidi, explicit Demo/Live separation, source privacy and booking-is-not-authority retained",
}
out = ROOT / "docs/ui-reference/refinement-evidence/patient-my-care-refinement-preservation.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(f"PASS: {len(preserved)} existing files unchanged; {len(protected)} protected V1 files; {len(old_evidence)} original evidence files; read/state/session and shortcut/source behavior preserved; {len(changed)} bounded changed paths.")
