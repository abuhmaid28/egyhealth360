"""Verify licensed binaries, real weight instances and preservation; no network writes."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
PREVIOUS = '81ea915d10c4ad83578465dcd8b2d26d69d1b6fe'
BASE = '5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(name, value):
    (ROOT / 'evidence' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


provenance = json.loads((ROOT / 'evidence/font-provenance.json').read_text())
instances = []
for row in provenance['files']:
    path = ROOT / row['file']
    assert sha(path.read_bytes()) == row['sha256'], path
    font = TTFont(path)
    assert font['name'].getDebugName(6) == row['names']['6']
    assert font['OS/2'].usWeightClass == row['OS2WeightClass']
    assert 'SIL OPEN FONT LICENSE' in (ROOT / row['license']).read_text()
    if row['axes']:
        actual = [{'tag': a.axisTag, 'min': a.minValue, 'default': a.defaultValue, 'max': a.maxValue} for a in font['fvar'].axes]
        assert actual == row['axes']
    for weight in row['usedWeights']:
        axes = {a['tag']: (weight if a['tag'] == 'wght' else a['default']) for a in row['axes']}
        instance = instantiateVariableFont(font, axes, inplace=False) if axes else font
        assert instance['OS/2'].usWeightClass == weight
        glyphs = instance['glyf'].compile(instance)
        sample = 'Available information 0123456789' if 'inter-' in row['file'] else 'مُلخّص الزيارة والمعلومات المُتاحة'
        missing = sorted({c for c in sample if ord(c) not in instance.getBestCmap()})
        assert not missing, (path, missing)
        instances.append({'file': row['file'], 'weight': weight, 'axes': axes, 'OS2WeightClass': instance['OS/2'].usWeightClass, 'glyphTableSha256': sha(glyphs), 'sample': sample, 'missingCodepoints': missing})
for file in {x['file'] for x in instances}:
    hashes = [x['glyphTableSha256'] for x in instances if x['file'] == file]
    assert len(set(hashes)) == len(hashes), f'Weights must have different outlines: {file}'
write('font-instance-audit.json', {'method': 'fontTools real variable instances at wght; other axes at documented defaults; no derived font redistributed', 'instances': instances, 'supportingFiles': [{'file': str(p.relative_to(ROOT)), 'sha256': sha(p.read_bytes())} for p in sorted((ROOT / 'fonts').iterdir()) if p.suffix != '.ttf']})

preservation = []
for ref in [PREVIOUS, BASE]:
    archive = subprocess.check_output(['git', 'archive', ref], cwd=REPO)
    rows = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar.getmembers():
            if not member.isfile():
                continue
            before = tar.extractfile(member).read()
            path = REPO / member.name
            after = path.read_bytes() if path.is_file() else b''
            allowed = member.name in ['docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md']
            identical = before == after
            assert identical or allowed, f'Unauthorized prior-file change: {ref}:{member.name}'
            rows.append({'path': member.name, 'beforeSha256': sha(before), 'afterSha256': sha(after), 'identical': identical, 'allowedSummaryUpdate': allowed})
    preservation.append({'ref': ref, 'files': rows, 'total': len(rows), 'identical': sum(r['identical'] for r in rows)})
write('preservation.json', preservation)
files = []
for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or path.name == 'artifact-hashes.json':
        continue
    data = path.read_bytes()
    files.append({'path': str(path.relative_to(REPO)), 'bytes': len(data), 'sha256': sha(data)})
changed = sorted([row['path'] for row in files] + [str((ROOT / 'evidence/artifact-hashes.json').relative_to(REPO)), 'docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md'])
write('artifact-hashes.json', {'exclusion': 'this self-referential inventory only', 'changedFilesFromAcceptedHead': changed, 'changedFileCountFromAcceptedHead': len(changed), 'files': files})
print(f'PASS: {len(instances)} real font weights, {len(files)} artifacts; ' + '; '.join(f"{r['identical']}/{r['total']} identical at {r['ref']}" for r in preservation))
