"""Build a transparent screenshot index and HEX color table from measured QA."""
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
qa = json.loads((ROOT / 'evidence/browser-qa.json').read_text())
pairs = json.loads((ROOT / 'evidence/color-pairs.json').read_text())


def hex_color(value):
    return '#' + ''.join(f'{int(v):02X}' for v in re.findall(r'[\d.]+', value)[:3])


for row in pairs['pairs']:
    for field in ['foreground', 'background', 'border', 'adjacent']:
        if field in row:
            row[field + 'Hex'] = hex_color(row[field])
(ROOT / 'evidence/color-pairs.json').write_text(json.dumps(pairs, ensure_ascii=False, indent=2) + '\n')
table = '\n'.join(f"<tr><td>{html.escape(r['theme'])}</td><td>{html.escape(r.get('selector', r.get('example', r['role'])))}</td><td>{r.get('state', 'rest')}</td><td>{r['role']}</td><td>{r['foregroundHex']}</td><td>{r['backgroundHex']}</td><td>{r['ratio']:.3f}:1 / {r['threshold']}:1</td></tr>" for r in pairs['pairs'])
groups = []
for role, lang, width in [('patient', 'ar', 390), ('doctor', 'ar', 1440), ('patient', 'en', 390), ('doctor', 'en', 1440)]:
    for theme in ['dark', 'light']:
        images = ''.join(f'<figure><figcaption>{font} · {role} · {lang} · {theme} · {width}px</figcaption><a href="evidence/screenshots/{font}-{role}-{lang}-{theme}-{width}-normal.png"><img loading="lazy" src="evidence/screenshots/{font}-{role}-{lang}-{theme}-{width}-normal.png" alt="Actual {font} screenshot, {role}, {lang}, {theme}, {width} CSS px"></a></figure>' for font in ['plex', 'noto'])
        groups.append(f'<section><h2>{role} / {lang} / {theme} / {width} CSS px</h2><p>Open the original PNG at native size. Preview images below are scaled to fit the index.</p><div class="pair">{images}</div></section>')
links = ''.join(f'<li><a href="evidence/{r["screenshot"]}">{r["name"]}</a></li>' for r in qa['cases'])
native = json.loads((ROOT / 'evidence/native-zoom.json').read_text())
zoom_links = ''.join(f'<li><a href="evidence/{r["screenshot"]}">{r["name"]}</a> · CSS width {r["innerWidth"]} / DPR {r["dpr"]}</li>' for r in native['cases'] if r['screenshot'])
page = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AP01 / AP04 actual evidence index</title>
<style>body{{font:16px/1.6 system-ui,sans-serif;margin:2rem;background:#F8F7FB;color:#17142B}}a{{color:#6240B8}}.pair{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}}figure{{margin:0}}img{{width:100%;height:auto}}section{{margin-block:3rem}}table{{border-collapse:collapse;font-size:14px}}td,th{{padding:.5rem;border:1px solid #787084;text-align:left}}.scroll{{overflow:auto}}@media(max-width:700px){{body{{margin:1rem}}.pair{{grid-template-columns:1fr}}}}</style>
<h1>AP01 / AP04 — actual screenshot comparisons</h1><p>Evidence only; pending owner decision. No final typography, color tokens, Design System or runtime integration. DP01/DP02 artwork remains byte-preserved.</p><p><a href="index.html">Interactive specimen</a> · <a href="README.md">Review appendix</a> · <a href="#matrix">Full 160-case matrix</a> · <a href="#zoom">Native zoom</a> · <a href="#colors">Measured color pairs</a></p>
{''.join(groups)}<h2 id="matrix">Full responsive matrix — original PNGs</h2><p>2 fonts × 2 roles × 2 languages × 2 themes × 5 widths × normal / 200% computed text. Chromium Linux at DPR1.</p><ul>{links}</ul>
<h2 id="zoom">Native 200% browser page zoom</h2><p>Browser profile page zoom. Window widths 640/1280 become CSS widths 320/640, DPR2; CSS text sizes unchanged, visual viewport scale1. Paired 100% observations are in native-zoom.json.</p><ul>{zoom_links}</ul>
<h2 id="colors">Actual measured foreground/background pairs</h2><p>WCAG sRGB luminance. Text 4.5:1; required control and focus boundaries 3:1. Decorative card/divider borders are exempt from the meaningful-boundary claim. Disabled colors voluntarily meet text contrast; no system-wide WCAG certification.</p><div class="scroll"><table><thead><tr><th>Theme</th><th>Example / selector</th><th>State</th><th>Role</th><th>Foreground HEX</th><th>Background HEX</th><th>Ratio / threshold</th></tr></thead><tbody>{table}</tbody></table></div></html>'''
(ROOT / 'gallery.html').write_text(page)
print(f"Indexed {len(qa['cases'])} responsive screenshots, 32 native zoom screenshots, {len(pairs['pairs'])} measured pairs")
