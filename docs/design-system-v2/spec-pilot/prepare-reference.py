"""Materialize seven exact pinned references locally. Requires authenticated gh; no server.
Only .reference/ is written. No files are sent or changed remotely.
"""
import base64
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'reference-manifest.json').read_text())
target = root / '.reference'
target.mkdir(exist_ok=True)
for item in manifest:
    path = target / item['file']
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == item['sha256']:
        continue
    payload = subprocess.check_output([
        'gh', 'api', f"repos/abuhmaid28/egyhealth360/git/blobs/{item['blob']}"
    ])
    data = base64.b64decode(json.loads(payload)['content'])
    if hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError(f"Reference hash mismatch: {item['file']}")
    path.write_bytes(data)
print('Seven pinned local references verified. Open gallery.html directly (file://).')
