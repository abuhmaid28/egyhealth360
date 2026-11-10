#!/usr/bin/env python3
"""Prepare nine immutable Brand inputs locally; never writes tracked Brand files."""
import base64
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
target = root / '.reference'
target.mkdir(exist_ok=True)
for item in json.loads((root / 'reference-manifest.json').read_text()):
    try:
        data = subprocess.check_output(['git', 'cat-file', 'blob', item['blob']], stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        response = subprocess.check_output(['gh', 'api', 'repos/abuhmaid28/egyhealth360/git/blobs/' + item['blob']])
        data = base64.b64decode(json.loads(response)['content'])
    assert len(data) == item['bytes'] and hashlib.sha256(data).hexdigest() == item['sha256'], item['file']
    (target / item['file']).write_bytes(data)
print('Nine pinned font/logo/license files verified in ignored .reference/.')
