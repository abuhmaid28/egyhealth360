"""DP02 artifact roles, immutable history and full review inventory."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
PRIOR = '864e84a8fe525b08dfd2449063832ef9af516b3d'
OUT = ROOT / 'evidence/dp02'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(name, obj):
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')


# All earlier artifacts/evidence, including screenshots and sources, are protected.
allowed = ['docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md'] + [
    f'docs/brand-source-exact-100/{name}' for name in [
        'README.md', 'VALIDATION.md', 'INDEPENDENT_REVIEW.md', 'index.html',
        'tools/generate.py', 'tools/audit.py', 'tools/qa.mjs',
    ]
]
rows = []
for name in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', PRIOR], cwd=REPO, text=True).splitlines():
    before = subprocess.check_output(['git', 'show', f'{PRIOR}:{name}'], cwd=REPO)
    after = (REPO / name).read_bytes()
    same = before == after
    assert same or name in allowed, f'Protected previous-head file changed: {name}'
    rows.append({'path': name, 'previous_sha256': sha(before), 'candidate_sha256': sha(after), 'identical': same})
write('previous-head-preservation.json', {
    'result': 'PASS', 'previous_head': PRIOR, 'file_count': len(rows),
    'identical': sum(r['identical'] for r in rows), 'permitted_updates': allowed, 'files': rows,
})
assert (ROOT / 'HISTORICAL_INDEPENDENT_REVIEW.md').read_bytes() == subprocess.check_output([
    'git', 'show', f'{PRIOR}:docs/brand-source-exact-100/INDEPENDENT_REVIEW.md'], cwd=REPO)
assets = []
for path in sorted((ROOT / 'assets').glob('*.svg')):
    name = path.stem
    role = ('primary' if name.startswith('primary-') else 'compact-primary' if name.startswith('compact-')
            else 'archival-reference-only' if name.startswith('bilingual-') else 'symbol-or-icon')
    assets.append({'path': str(path.relative_to(ROOT)), 'role': role, 'sha256': sha(path.read_bytes()),
                   'tagline': role == 'archival-reference-only'})
write('asset-manifest.json', {'primary_policy': 'Symbol and source-exact name/digits only; no tagline.',
                            'default_review': 'index.html', 'archive_review': 'historical.html', 'assets': assets,
                            'source_role': 'source/*.svg are byte-preserved original historical evidence, never primary delivery artwork.',
                            'previous_evidence_role': 'All files directly in evidence/ are immutable historical snapshots; current evidence is in evidence/dp02/.',
                            'current_evidence': 'evidence/dp02/*.png and JSON; historical-arabic-* explicitly tests archived DP01 evidence.'})
files = [f for f in sorted(ROOT.rglob('*')) if f.is_file() and f != OUT / 'artifact-hashes.json' and '__pycache__' not in f.parts]
base = '5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3'
old = set(subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', base], cwd=REPO, text=True).splitlines())
changed = subprocess.check_output(['git', 'diff', '--name-only', base], cwd=REPO, text=True).splitlines()
new = [str(f.relative_to(REPO)) for f in ROOT.rglob('*') if f.is_file() and str(f.relative_to(REPO)) not in old and '__pycache__' not in f.parts]
write('artifact-hashes.json', {'base': base, 'previous_head': PRIOR, 'head_binding': 'Exact final commit is recorded in PR #101 handoff; manifest hashes bind artifacts without self-reference.',
    'changed_files_vs_main': sorted(set(changed + new)), 'artifact_count': len(files),
    'files': [{'path': str(f.relative_to(ROOT)), 'sha256': sha(f.read_bytes()), 'bytes': f.stat().st_size} for f in files],
    'excluded': ['Only evidence/dp02/artifact-hashes.json itself; historical artifact manifest is included and also byte-preserved.']})
print(f'PASS: {len(rows)} previous-head files; {sum(r["identical"] for r in rows)} unchanged; {len(assets)} assets classified; {len(files)} artifact hashes.')
