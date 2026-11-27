"""Read-only preservation proof against the pinned baseline; no application execution."""
from pathlib import Path
import hashlib
import json
import os
import subprocess

BASE = "5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3"
ROOT = Path(__file__).resolve().parents[3]
PILOT = ROOT / "docs/zero-cost-design-pilot"
ALLOWED = {"docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md"}
entries = subprocess.check_output(["git", "ls-tree", "-r", "-z", BASE], cwd=ROOT).split(b"\0")
unchanged, modified = [], []
for entry in entries:
    if not entry:
        continue
    meta, path = entry.split(b"\t", 1)
    name = path.decode()
    expected = meta.decode().split()[2]
    file = ROOT / name
    if file.is_symlink():
        data = os.readlink(file).encode()
    elif file.is_file():
        data = file.read_bytes()
    else:
        modified.append(name)
        continue
    actual = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    (unchanged if actual == expected else modified).append(name)
tracked = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT).decode().split("\0")
base_paths = set(unchanged + modified)
added = sorted(set(p for p in tracked if p and p not in base_paths))
unexpected = [p for p in modified if p not in ALLOWED] + [p for p in added if not p.startswith("docs/zero-cost-design-pilot/")]
report = {"base": BASE, "baseline_files": len(base_paths), "unchanged_baseline_files": len(unchanged), "modified_baseline_paths": sorted(modified), "unexpected_changes": unexpected, "product_and_contract_bytes_preserved": not unexpected, "unchanged_path_list_sha256": hashlib.sha256("\n".join(sorted(unchanged)).encode()).hexdigest(), "added_paths": added, "note": "Current status/source index only are allowed to change among baseline files; all other baseline bytes, including historical screenshots, runtime, dependency, schema, CI and approved contracts are checked."}
(PILOT / "evidence/preservation.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({k: v for k, v in report.items() if k != "added_paths"}, indent=2))
if unexpected:
    raise SystemExit("Scope violation")
manifest = []
for p in sorted(PILOT.rglob("*")):
    if p.is_file() and p.name != "artifact-hashes.json":
        manifest.append({"path": str(p.relative_to(PILOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size})
(PILOT / "evidence/artifact-hashes.json").write_text(json.dumps(manifest, indent=2) + "\n")
