"""Verify selected assets and every baseline tracked file without changing them."""
from pathlib import Path
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path('docs/brand-identity-v2')
source = json.loads((ROOT / 'evidence/source.json').read_text())
def git_blob(revision, path):
    return subprocess.check_output(['git', 'show', revision + ':' + path])

for row in source['copiedArtifacts']:
    current = (ROOT / row['path']).read_bytes()
    assert current == git_blob(source['sourceHead'], row['sourcePath']), row['path']
    assert hashlib.sha256(current).hexdigest() == row['sha256'], row['path']

board = git_blob(source['sourceHead'], 'docs/brand-identity-reconstruction/source/approved-board.png')
assert hashlib.sha256(board).hexdigest() == source['originalBoardSHA256']
exceptions = {'docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md', 'docs/IMPLEMENTATION_ROADMAP.md'}
baseline = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', source['base']], text=True).splitlines()
changed = []
for path in baseline:
    assert Path(path).is_file(), path
    if Path(path).read_bytes() != git_blob(source['base'], path):
        changed.append(path)
assert set(changed) == exceptions, changed
svgs = list((ROOT / 'assets').glob('*.svg'))
for path in svgs:
    tree = ET.fromstring(path.read_bytes())
    for element in tree.iter():
        tag = element.tag.split('}')[-1]
        assert tag not in {'script', 'image', 'foreignObject'}, path
        for key, value in element.attrib.items():
            assert not key.lower().startswith('on'), path
            if key.split('}')[-1] == 'href':
                assert value.startswith('#'), path

dimensions = {}
for path in (ROOT / 'evidence').glob('*.png'):
    size = Image.open(path).size
    dimensions[path.name] = list(size)
    if path.name.startswith('favicon-'):
        n = int(path.stem.split('-')[1]); assert size == (n, n)
    if path.name == 'app-icon-512.png':
        assert size == (512, 512)
assert dimensions['owner-desktop.png'][0] == 1440
assert dimensions['owner-mobile.png'][0] == 390

validation = json.loads((ROOT / 'evidence/validation.json').read_text())
assert len(validation['cases']) == 16
assert all(row['result'] == 'PASS' for row in validation['cases'])
report = {
    'base': source['base'], 'sourceHead': source['sourceHead'],
    'sourceBoardSHA256Verified': source['originalBoardSHA256'],
    'byteIdenticalSourceCopies': len(source['copiedArtifacts']), 'parsedRasterFreeSVGs': len(svgs),
    'baselineTrackedFiles': len(baseline), 'byteIdenticalBaselineFiles': len(baseline) - len(changed),
    'onlyChangedBaselineFiles': sorted(changed), 'pngDimensions': dimensions,
    'browserCasesPassed': len(validation['cases']), 'result': 'PASS',
}
(ROOT / 'evidence/preservation.json').write_text(json.dumps(report, indent=2) + '\n')
hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in sorted(ROOT.rglob('*')) if p.is_file() and p.name != 'artifact-hashes.json'}
(ROOT / 'evidence/artifact-hashes.json').write_text(json.dumps(hashes, indent=2) + '\n')
print(json.dumps(report, indent=2))
