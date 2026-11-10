"""Strict source/provenance, XML, ordered path bytes and allowed-delta audit."""
from pathlib import Path
from collections import Counter
from copy import deepcopy
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
NS = '{http://www.w3.org/2000/svg}'
META = json.loads((ROOT / 'evidence/provenance.json').read_text())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(name, value):
    (ROOT / 'evidence' / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def groups(root):
    return [e for e in root.iter() if e.get('id') == 'master-symbol' or e.get('data-text')]


def label(e):
    return e.get('data-text') or e.get('id')


def inventory(e):
    paths = [p.get('d').encode() for p in e.iter(NS + 'path')]
    packed = b''.join(len(d).to_bytes(8, 'big') + d for d in paths)
    return {'group': label(e), 'path_count': len(paths), 'ordered_length_prefixed_d_sha256': sha(packed),
            'path_d_sha256': [sha(d) for d in paths], 'elements': dict(Counter(p.tag.removeprefix(NS) for p in e.iter())),
            'source_group_attributes': e.attrib}


source_roots = {}
for name, entry in META['sources'].items():
    file = ROOT / ('source' if name.endswith(('primary', 'dark', 'light')) else 'assets') / (name + '.svg' if not Path(name).suffix else name)
    data = file.read_bytes()
    original = subprocess.check_output(['git', 'show', f"{entry['commit']}:{entry['path']}"])
    assert data == original and sha(data) == entry['sha256'], f'Source changed: {name}'
    if file.suffix == '.svg':
        source_roots[name] = ET.fromstring(data)

original_groups = groups(source_roots['lockup-dark'])
assert [label(e) for e in original_groups] == ['master-symbol', 'EgyHealth', '360', '360', 'إيجي هيلث', 'رعاية متكاملة حولك', 'Integrated care around you']
assert len(list(original_groups[0].iter(NS + 'path'))) == 8
assert len(list(original_groups[0].iter(NS + 'ellipse'))) == 1
assert [p.attrib for p in source_roots['symbol-primary'].iter(NS + 'path')] == [p.attrib for p in original_groups[0].iter(NS + 'path')]

expected = {'symbol-transparent': ['master-symbol'], 'maskable-512': ['master-symbol']}
for size in [16, 24, 32, 64, 192, 512]:
    expected[f'icon-{size}'] = ['master-symbol']
for theme in ['dark', 'light']:
    expected[f'compact-en-{theme}'] = ['master-symbol', 'EgyHealth', '360']
    expected[f'compact-ar-{theme}'] = ['master-symbol', 'إيجي هيلث', '360']
    expected[f'bilingual-{theme}'] = [label(e) for e in original_groups]
assert {f.stem for f in (ROOT / 'assets').glob('*.svg')} == set(expected)


def compare(actual, original, location='group'):
    assert actual.tag == original.tag and len(actual) == len(original), location
    assert actual.text == original.text, location
    deltas = []
    for key in set(actual.attrib) | set(original.attrib):
        before, after = original.get(key), actual.get(key)
        if before != after:
            assert key == 'fill' and (location == 'group' or actual.get('id') in ['left-rim', 'right-rim']), (location, key)
            deltas.append({'element': location, 'attribute': key, 'from': before, 'to': after})
    for i, (a, b) in enumerate(zip(actual, original, strict=True)):
        deltas.extend(compare(a, b, f'{location}/{i}:{a.tag.removeprefix(NS)}'))
    return deltas


assets = []
for name, labels in expected.items():
    path = ROOT / 'assets' / f'{name}.svg'
    data = path.read_bytes()
    root = ET.fromstring(data)
    assert not list(root.iter(NS + 'text')) and not list(root.iter(NS + 'image')) and not list(root.iter(NS + 'script'))
    actual = groups(root)
    assert [label(e) for e in actual] == labels, name
    assert sum(len(list(e.iter(NS + 'path'))) for e in actual) == len(list(root.iter(NS + 'path'))), name
    # Check literal d bytes in the serialized XML, not just parsed values.
    raw_d = re.findall(rb'\bd="([^"]*)"', data)
    assert raw_d == [p.get('d').encode() for p in root.iter(NS + 'path')]
    records = []
    for group in actual:
        candidates = [o for o in original_groups if label(o) == label(group)]
        source = next((o for o in candidates if o.get('transform') == group.get('transform')), None)
        assert source is not None, (name, label(group), 'inner transform changed')
        delta = compare(group, source)
        records.append({'inventory': inventory(group), 'allowed_color_deltas': delta})
    # Definition changes can only be stop-color; no geometry/offset/opacity edits.
    definition = root.find(NS + 'defs')
    before = deepcopy(source_roots['symbol-primary'].find(NS + 'defs'))
    stops = []
    for a, b in zip(definition.iter(), before.iter(), strict=True):
        assert a.tag == b.tag
        attrs = dict(a.attrib)
        if a.tag == NS + 'stop':
            stops.append({'from': b.get('stop-color'), 'to': a.get('stop-color')})
            attrs['stop-color'] = b.get('stop-color')
        assert attrs == b.attrib
    wrappers = [e.attrib for e in root if e.tag == NS + 'g']
    assets.append({'file': str(path.relative_to(ROOT)), 'sha256': sha(data), 'groups': records,
                   'external_wrappers': wrappers, 'gradient_stop_color_deltas': stops,
                   'presentation_root': root.attrib, 'backgrounds': [e.attrib for e in root if e.tag == NS + 'rect']})

write('path-audit.json', {'result': 'PASS', 'hash_encoding': 'SHA-256 of ordered 8-byte big-endian d byte length + raw UTF-8 d, per path and per group',
                        'source_group_inventory': {k: [inventory(e) for e in groups(v)] for k, v in source_roots.items()},
                        'asset_count': len(assets), 'assets': assets})

exceptions = ['docs/CURRENT_STATUS.md', 'docs/SOURCE_OF_TRUTH.md']
files = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', META['base']], cwd=REPO, text=True).splitlines()
rows = []
for file in files:
    data = (REPO / file).read_bytes()
    base = subprocess.check_output(['git', 'show', f"{META['base']}:{file}"], cwd=REPO)
    same = data == base
    assert same or file in exceptions, f'Protected baseline changed: {file}'
    rows.append({'path': file, 'baseline_sha256': sha(base), 'working_sha256': sha(data), 'identical': same})
write('preservation.json', {'base': META['base'], 'baseline_count': len(rows), 'identical': sum(r['identical'] for r in rows),
                            'permitted_governance_exceptions': exceptions, 'files': rows})
print(f'PASS: {len(assets)} XML assets, exact group inventory, raw d identity, ellipse/internal transforms; {len(rows)} baseline files checked.')
