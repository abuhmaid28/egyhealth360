"""Prove the bounded My Care slice preserves every other pre-existing byte."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parent.parent
BASE = "04311ba44336f164ca13c8ced310a64d957f2ed3"
ALLOWED = {
    "apps/web/src/components/application.tsx", "apps/web/public/fonts/README.md",
    "scripts/test-ui-browser.mjs", "scripts/support/ui-live-journey-browser.mjs",
    "scripts/support/ui-polish-browser.mjs", "scripts/support/ui-rtl-browser.mjs",
    "docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md", "docs/PROJECT.md", "docs/IMPLEMENTATION_ROADMAP.md",
}
NEW_FILES = {
    "apps/web/src/components/patient-my-care.tsx", "apps/web/src/components/patient-my-care.module.css",
    "apps/web/src/lib/patient-my-care.ts", "apps/web/src/lib/patient-my-care-copy.ts",
    "scripts/support/ui-my-care-browser.mjs", "scripts/capture-patient-my-care.mjs",
    "scripts/check-patient-my-care-scope.py", "tests/ui-my-care.test.mjs",
    "docs/ui-reference/PATIENT_MY_CARE_IMPLEMENTATION.md",
}
def git(*args): return subprocess.check_output(["git", *args], cwd=ROOT)
def digest(value): return hashlib.sha256(value).hexdigest()

preserved = []
baseline = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
for path in sorted(baseline - ALLOWED):
    original = git("show", f"{BASE}:{path}")
    current = (ROOT / path).read_bytes()
    assert original == current, f"Out-of-scope existing change: {path}"
    preserved.append({"path":path,"sha256":digest(current)})
changed = set(git("diff", "--name-only", BASE).decode().splitlines())
changed.update(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
for path in changed:
    if path in baseline: assert path in ALLOWED, path
    else: assert path in NEW_FILES or path.startswith(("docs/ui-reference/evidence/", "apps/web/public/fonts/my-care/")), f"Out-of-scope addition: {path}"
for name in ["manrope.ttf","plex-arabic-regular.ttf","plex-arabic-semibold.ttf","manrope-OFL.txt","plex-arabic-OFL.txt"]:
    assert (ROOT/f"apps/web/public/fonts/my-care/{name}").read_bytes() == (ROOT/f"docs/visual-directions-v2/assets/{name}").read_bytes(), name
source = (ROOT/"apps/web/src/components/application.tsx").read_text()
before = git("show", f"{BASE}:apps/web/src/components/application.tsx").decode()
start = source.index('  if (session.role === "PATIENT" && pathname === "/patient")')
end = source.index('  const allowed =', start)
restored = source[:start] + source[end:]
restored = restored.replace('import { PatientMyCare } from "./patient-my-care";\n', '')
assert restored == before, "Existing Application behavior changed beyond the exact-route insertion"
protected = [p for p in preserved if p["path"].startswith("docs/ui-screenshots/doctor-demo/")]
reference = next(p for p in preserved if p["path"]=="docs/ui-reference/reference/patient-my-care-reference.svg")
result = {
    "implementationBase":BASE,"allowedExistingChanges":sorted(ALLOWED),"changedPaths":sorted(changed),
    "preserved":preserved,"protectedV1":protected,"ownerReference":reference,
    "unchanged":"Backend, API/OpenAPI, DB/schema/migrations, security/authorization, CI policy, hosting/deployment, adapters, unrelated clinical workflows, original reference and prior visual evidence",
    "applicationGuard":"Exact Patient /patient route only; remainder of Application byte-identical after removing insertion",
    "fonts":"Byte-identical local copies of existing review assets and original SIL OFL licenses; no package dependency or runtime service",
}
out = ROOT/"docs/ui-reference/evidence/patient-my-care-preservation.json"
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
print(f"PASS: {len(preserved)} existing files unchanged; {len(protected)} protected V1 files; original reference preserved; exact-route Application guard; local font provenance; {len(changed)} bounded changed paths.")
