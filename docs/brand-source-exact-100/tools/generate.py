"""Issue #100: assemble existing outlines; never shape, trace or edit a path."""
from pathlib import Path
from copy import deepcopy
import hashlib
import json
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = '5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3'
SOURCE = 'cb3fd9112f15e17b3d500d7a9dd085dd6e412525'
FOUNDATION = 'e1abedc3d1c8811912f0fe6576e4b4f3459210ce'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)


def tag(name):
    return f'{{{NS}}}{name}'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def blob(ref, path):
    return subprocess.check_output(['git', 'show', f'{ref}:{path}'])


def write_json(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


sources = {}
for name in ['symbol-primary', 'lockup-dark', 'lockup-light']:
    path = f'docs/brand-identity-reconstruction/assets/{name}.svg'
    data = blob(SOURCE, path)
    (ROOT / 'source' / f'{name}.svg').write_bytes(data)
    sources[name] = {'commit': SOURCE, 'path': path, 'sha256': sha(data)}

for name in ['inter.woff2', 'Inter-OFL.txt', 'plex-arabic-regular.ttf', 'plex-arabic-OFL.txt']:
    path = f'docs/brand-identity-reconstruction/assets/{name}'
    data = blob(SOURCE, path)
    (ROOT / 'assets' / name).write_bytes(data)
    sources[name] = {'commit': SOURCE, 'path': path, 'sha256': sha(data)}

master = ET.parse(ROOT / 'source/symbol-primary.svg').getroot()
lockup = ET.parse(ROOT / 'source/lockup-dark.svg').getroot()
symbol = master.find(".//*[@id='master-symbol']")
groups = [e for e in lockup if e.get('data-text')]
english, digits_en, digits_ar, arabic, tagline_ar, tagline_en = groups

# Only stop-color changes; gradient geometry, offsets and opacity are retained.
materials = {
    'm-left': ['#A78BFA', '#A78BFA', '#6240B8'],
    'm-right': ['#F6F2FF', '#A78BFA', '#A78BFA'],
    'm-under': ['#17142B', '#6240B8', '#17142B'],
    'm-gold': ['#F6F2FF', '#FFB88B', '#FFB88B'],
    'm-head': ['#F6F2FF', '#FFB88B', '#FFB88B', '#FFB88B'],
    'm-leftLight': ['#F6F2FF', '#F6F2FF'],
    'm-darkFold': ['#17142B', '#17142B'],
    'wordGold': ['#FFB88B', '#FFB88B'],
    'wordGoldLight': ['#6240B8', '#6240B8'],
    'm-bg': ['#10121D', '#1D2030', '#1D2030'],
}
defs = deepcopy(master.find(tag('defs')))
for gradient in defs:
    for stop, color in zip(gradient, materials[gradient.get('id')], strict=True):
        stop.set('stop-color', color)


def svg(viewbox, title, background=None):
    root = ET.Element(tag('svg'), {'viewBox': viewbox, 'role': 'img', 'aria-labelledby': 'title'})
    ET.SubElement(root, tag('title'), {'id': 'title'}).text = title
    root.append(deepcopy(defs))
    if background:
        _, _, w, h = viewbox.split()
        ET.SubElement(root, tag('rect'), {'width': w, 'height': h, 'fill': background})
    return root


def place(root, group, transform, fill=None):
    wrapper = ET.SubElement(root, tag('g'), {'transform': transform})
    child = deepcopy(group)
    if fill:
        child.set('fill', fill)
    if child.get('id') == 'master-symbol':
        for e in child:
            if e.get('id') in ['left-rim', 'right-rim']:
                e.set('fill', '#F6F2FF')
    wrapper.append(child)


def save(name, root):
    ET.ElementTree(root).write(ROOT / 'assets' / f'{name}.svg', encoding='utf-8', xml_declaration=True)


r = svg('145 70 310 320', 'EgyHealth 360 — source-exact Violet × Apricot symbol; transparent')
place(r, symbol, 'translate(0 0)')
save('symbol-transparent', r)

for theme, bg, ink, digits in [('dark', '#10121D', '#F6F2FF', '#FFB88B'), ('light', '#F8F7FB', '#17142B', '#6240B8')]:
    for locale in ['en', 'ar']:
        r = svg('0 0 780 145', f'{"EgyHealth 360" if locale == "en" else "إيجي هيلث 360"} — compact {theme}; no tagline')
        place(r, symbol, 'translate(-42 -8) scale(.36)')
        if locale == 'en':
            place(r, english, 'translate(-190 0)', ink)
            place(r, digits_en, 'translate(-190 0)', digits)
        else:
            place(r, arabic, 'translate(-190 -123)', ink)
            place(r, digits_ar, 'translate(-190 -123)', digits)
        save(f'compact-{locale}-{theme}', r)

    r = svg('0 0 1010 402', f'EgyHealth 360 / إيجي هيلث 360 — {theme} bilingual specimen; reference-only taglines; DP02 OPEN', bg)
    place(r, symbol, 'translate(-125 -55)')
    for g in groups:
        text = g.get('data-text')
        delta = 'translate(0 28)' if g is tagline_ar else 'translate(0 34)' if g is tagline_en else 'translate(0 0)'
        place(r, g, delta, digits if text == '360' else ink)
    save(f'bilingual-{theme}', r)

for size in [16, 24, 32, 64, 192, 512]:
    r = svg('0 0 512 512', f'EgyHealth 360 — {size}px source-exact icon', '#10121D')
    r.set('width', str(size))
    r.set('height', str(size))
    place(r, symbol, 'translate(-128 -38.4) scale(1.28)')
    save(f'icon-{size}', r)

r = svg('0 0 512 512', 'EgyHealth 360 — maskable candidate; exact symbol inside central 80% circle', '#10121D')
r.set('width', '512')
r.set('height', '512')
place(r, symbol, 'translate(16 72) scale(.8)')
save('maskable-512', r)

# Existing bilingual assets are immutable historical DP01/DP02 specimens.
# Full-size primary outputs omit entire tagline groups, preserving name/symbol placement.
for theme, bg, ink, digits in [('dark', '#10121D', '#F6F2FF', '#FFB88B'), ('light', '#F8F7FB', '#17142B', '#6240B8')]:
    for locale in ['en', 'ar']:
        r = svg('0 0 780 145', f'{"EgyHealth 360" if locale == "en" else "إيجي هيلث 360"} — full-size primary {theme}; no tagline', bg)
        place(r, symbol, 'translate(-42 -8) scale(.36)')
        if locale == 'en':
            place(r, english, 'translate(-190 0)', ink)
            place(r, digits_en, 'translate(-190 0)', digits)
        else:
            place(r, arabic, 'translate(-190 -123)', ink)
            place(r, digits_ar, 'translate(-190 -123)', digits)
        save(f'primary-{locale}-{theme}', r)
    r = svg('0 0 1010 350', f'EgyHealth 360 / إيجي هيلث 360 — full-size bilingual primary {theme}; no tagline', bg)
    place(r, symbol, 'translate(-125 -55)')
    for g in [english, digits_en, digits_ar, arabic]:
        place(r, g, 'translate(0 0)', digits if g.get('data-text') == '360' else ink)
    save(f'primary-bilingual-{theme}', r)

write_json('evidence/dp02/provenance.json', {
    'issue': 'https://github.com/abuhmaid28/egyhealth360/issues/100',
    'authorization': 'PR #101 owner authorization issuecomment-6757793824, 10 Nov 2026: bounded DP02 tagline-free primary refinement on existing branch.',
    'base': BASE, 'source_pr_96': SOURCE, 'foundation_pr_97': FOUNDATION,
    'baseline_checked_utc': '2026-11-10',
    'supersession_check': 'Issue #100/comments, umbrella #72 comments, open review PRs/branches and fresh main checked; no later instruction found.',
    'sources': sources,
    'palette_status': 'Provisional issue-local values; not global approved tokens or medical semantic statuses.',
    'path_policy': 'Raw UTF-8 d bytes, order, child transforms and ellipse geometry immutable. No shaping/tracing/fonts used for logo.',
    'allowed_deltas': ['stop-color only in existing gradients', 'rim fill colors', 'outline group fill colors', 'external wrapper transforms and spacing', 'SVG presentation root/title/viewBox/size/background', 'omission of whole tagline groups from all primary/default variants; whole non-applicable groups from locale/icon variants'],
    'dp01': 'Owner accepted at 864e84a8fe525b08dfd2449063832ef9af516b3d. Name/symbol/internal transforms preserved. Historical tagline +28/+34 wrappers retained only in archived specimens.',
    'dp02': 'Owner content decision accepted: no tagline. Primary asset implementation verification pending exact-new-head review; no new slogan. Old bilingual-* assets and pre-refinement evidence are archival only.',
    'render_tool': 'Free local Playwright 1.64.1 in /tmp/eh100-tools and existing /usr/bin/chromium; no repository dependency changes.',
})
print('Captured 3 original SVGs; generated 20 source-derived SVG assets (6 new tagline-free primaries; 2 archived bilingual specimens).')
