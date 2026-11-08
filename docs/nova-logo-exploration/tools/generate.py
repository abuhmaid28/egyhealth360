"""Original logo geometry and local-font outlines. No third-party logo assets."""
import json
import re
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path('docs/nova-logo-exploration')
SOURCE_PIN = '9e5fca14c7f931a49e94dd88915f8c9fa24a45da'
ASSETS = ROOT / 'assets'
CONCEPTS = [
    dict(id='a', name='Shared stem', ar='حروف مترابطة', idea='A drawn e–h ligature: two initials share one structural stem, keeping the name at the center of recognition.',
         shape='<g transform="translate(4 2) scale(.875)"><path fill-rule="evenodd" d="M35 34C35 23 28 18 19 18C7 18 2 26 2 38C2 51 10 58 21 58C26 58 30 56 31 54V44H27C25 47 24 48 21 48C15 48 12 44 12 40H36V34ZM12 32H25C25 27 22 25 19 25C15 25 13 28 12 32Z"/><path d="M35 5H45V21C47 19 49 18 52 18C59 18 64 23 64 32V58H56V35C56 31 54 28 51 28C48 28 45 30 45 35V58H35Z"/></g>',
         tradeoff='The joined initials carry an explicit name cue, but e-health lettermarks remain crowded. Test whether the shared stem reads clearly rather than as an unrelated abstract glyph.'),
    dict(id='b', name='Changing course', ar='مسار مستمر', idea='An open rising ribbon with two unequal landings: care can continue through a change of context without a closed loop.',
         shape='<path d="M6 39H11C18 39 20 34 23 25C27 12 34 7 46 7H58V20H47C40 20 38 24 35 34C31 48 24 57 10 57H6Z"/>',
         tradeoff='A route or transport reading remains possible. This is a continuity metaphor, not speed, automatic referral, complete records or unrestricted access.'),
    dict(id='c', name='Unequal facets', ar='أوجه متكاملة', idea='Three unequal planes form a compact oblique silhouette. Shared visual language allows distinct responsibilities without literal role badges.',
         shape='<path d="M7 10L35 5L52 20L24 25Z"/><path d="M28 33L56 28L60 49L44 59Z"/><path d="M5 23L16 34L34 60L6 48Z"/>',
         tradeoff='Faceted systems are crowded in software, infrastructure and finance. Three planes are a construction choice, not a claim that the platform has three roles or a centralized data grant.'),
]

def svg(content, width=64, height=64, color='#dcfa94', title='EgyHealth 360 — proposed symbol'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" color="{color}" fill="currentColor" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title>{content}</svg>\n'

font = instantiateVariableFont(TTFont(ASSETS / 'manrope.ttf'), {'wght': 700}, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font['head'].unitsPerEm

def outline(text):
    x = 0
    result = []
    for char in text:
        glyph = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[glyph].draw(pen)
        if pen.getCommands():
            result.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>')
        x += font['hmtx'].metrics[glyph][0] - 9
    return ''.join(result), x

name_path, name_width = outline('EgyHealth 360')
scale = 36 / upm
lockup_width = round(80 + name_width * scale)

for concept in CONCEPTS:
    folder = ASSETS / concept['id']
    folder.mkdir(parents=True, exist_ok=True)
    for variant, color in [('dark', '#dcfa94'), ('light', '#30243c'), ('mono', '#171717'), ('reverse', '#ffffff')]:
        title = f"EgyHealth 360 — concept {concept['id'].upper()} {concept['name']} — {variant} proposal"
        (folder / f'symbol-{variant}.svg').write_text(svg(concept['shape'], color=color, title=title))
        lockup = f'<g transform="translate(4 4) scale(.875)">{concept["shape"]}</g><g data-text="EgyHealth 360" transform="translate(80 46) scale({scale} {-scale})">{name_path}</g>'
        (folder / f'wordmark-{variant}.svg').write_text(svg(lockup, lockup_width, 64, color, title.replace('symbol','wordmark')))
    (folder / 'favicon.svg').write_text(svg(f'<rect width="64" height="64" rx="14" fill="#211a30"/><g transform="translate(8 8) scale(.75)">{concept["shape"]}</g>', title=f'Concept {concept["id"].upper()} favicon study'))
    (folder / 'app-icon.svg').write_text(svg(f'<rect width="192" height="192" rx="44" fill="#211a30"/><g transform="translate(40 40) scale(1.75)">{concept["shape"]}</g>', 192, 192, title=f'Concept {concept["id"].upper()} app-icon study'))

STYLE = '''@font-face{font-family:Manrope;src:url('assets/manrope.ttf');font-weight:200 800}@font-face{font-family:Plex;src:url('assets/plex-arabic-regular.ttf')}@font-face{font-family:Plex;src:url('assets/plex-arabic-semibold.ttf');font-weight:600}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#171221;color:#faf8ff;font:16px/1.75 Manrope,Plex,sans-serif}a{color:inherit;text-underline-offset:4px}button{font:inherit}h1,h2,h3,p{margin:0;overflow-wrap:anywhere}h1{font-size:clamp(30px,5vw,54px);line-height:1.4;letter-spacing:-1.5px}h2{font-size:26px;line-height:1.4}h3{font-size:18px}p{overflow-wrap:anywhere}.wrap{max-width:1280px;margin:auto;padding:38px 30px}header{border-bottom:1px solid #78668d;padding-bottom:26px;margin-bottom:26px}.eyebrow{font-size:12px;letter-spacing:.1em;color:#d6c7e4;margin-bottom:12px}.intro{max-width:760px;color:#e0d6e9;margin-top:14px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.concept{display:flex;flex-direction:column;min-width:0;background:#292235;border:1px solid #8e7d9e;border-radius:24px;padding:24px}.concept .hero{display:flex;justify-content:center;align-items:center;height:220px}.hero img{width:148px;height:148px}.wordmark{display:block;width:100%;height:auto;margin:8px 0 22px}.code{display:inline-block;border:1px solid #baa6cf;border-radius:12px;padding:2px 12px;font-size:14px;margin-bottom:10px}.arabic{font-family:Plex,sans-serif;color:#dfd0ee;font-size:19px;margin-top:8px}.note{font-size:14px;color:#ded2e9;margin-top:12px}.concept .actions{margin-top:auto;padding-top:18px}.concept .note{margin-bottom:18px}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.actions a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:8px 16px;border-radius:13px;background:#dcfa94;color:#20222a;font-weight:700;text-decoration:none}.actions a.secondary{background:#d9cbee;color:#281e38}.native{display:flex;gap:24px;align-items:end;justify-content:center;margin:24px 0}.native span{display:grid;gap:10px;justify-items:center;font-size:12px;color:#d6c7e4}.panel{padding:24px;border-radius:18px;background:#211a30;border:1px solid #78668d}.variants{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:24px 0}.variant{padding:20px;border-radius:16px;background:#211a30}.variant img{width:100%;height:auto}.variant.light{background:#f7f4fb;color:#30243c}.variant.mono{background:white;color:#171717}.context-grid{display:grid;grid-template-columns:repeat(2,390px);justify-content:center;gap:24px;margin-top:20px}.context-grid iframe{display:block;width:390px;height:340px;border:1px solid #8e7d9e;border-radius:12px}.iconrow>img{border-radius:23px;outline:1px solid #bda3d3;outline-offset:4px}.iconrow{display:flex;align-items:center;gap:28px;flex-wrap:wrap;margin:26px 0}.tab{background:#30263f;border:1px solid #8e7d9e;padding:10px 20px;border-radius:12px;display:flex;align-items:center;gap:10px;font-size:14px}.proof .hero{height:230px;display:flex;align-items:center;gap:44px}.proof .hero>.large{width:176px;height:176px}.proof .hero>.wordmark{width:560px;max-width:70%;margin:0}.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}.footer{margin-top:28px;padding-top:20px;border-top:1px solid #78668d;color:#dfd0e9;font-size:14px}.download-list{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}.download-list a{min-height:44px;padding:7px 12px;border:1px solid #b49ac9;border-radius:12px}:focus-visible{outline:3px solid #e5ff9c;outline-offset:4px}.skip{position:fixed;top:-200px;left:20px;z-index:10;background:#fff;color:#211a30;padding:12px 20px}.skip:focus{top:12px}footer,main{min-width:0}@media(max-width:900px){.grid{grid-template-columns:1fr}.wrap{padding:28px 20px}.concept .hero{height:180px}.hero img{width:128px;height:128px}.wordmark{max-width:400px;margin-inline:auto}.context-grid{grid-template-columns:1fr}.context-grid iframe{max-width:100%}.variants{grid-template-columns:1fr}.proof .hero{gap:24px;flex-wrap:wrap;height:auto;min-height:230px;padding-block:24px;justify-content:center}.proof .hero>.large{width:96px;height:96px}.two{grid-template-columns:1fr}.proof .hero>.wordmark{max-width:100%;width:100%}h1{letter-spacing:-.7px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}'''
(ROOT / 'gallery.css').write_text(STYLE)
(ROOT / 'header.css').write_text('.brand{display:inline-flex;align-items:center;gap:8px;max-inline-size:100%;white-space:normal}.header-context .masthead{flex-wrap:wrap}.brand-symbol{width:28px;height:28px;flex:none}.brand-name{min-inline-size:0;white-space:normal;overflow-wrap:anywhere}.brand>.brand-name{color:var(--ink);font-weight:800}.brand-name>span{font-weight:400;color:var(--accent)}.header-context .shell{max-width:1440px}html[lang=en] .brand-symbol{transform:none}.context-note{font-size:12px;padding:8px 20px;color:#c8bed8;margin:0}\n')

def page(title, content, cls=''):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — EgyHealth 360 proposals</title><link rel="stylesheet" href="gallery.css"><link rel="icon" href="data:,"><script src="proof-frames.js" defer></script></head><body class="{cls}"><a class="skip" href="#main">Skip to concepts</a><div class="wrap">{content}</div></body></html>'

for c in CONCEPTS:
    for locale in ['ar','en']:
        text = subprocess.check_output(['git','show',f'{SOURCE_PIN}:docs/patient-finalist-validation/{locale}.html'],text=True)
        defs = re.search(r'<svg class="icon-defs".*?</svg>', text, re.S).group()
        masthead = re.search(r'<header class="masthead">.*?</header>', text, re.S).group()
        heading = re.search(r'<header class="page-heading">.*?</header>', text, re.S).group()
        masthead = masthead.replace('EgyHealth <span>360</span>', f'<img class="brand-symbol" src="assets/{c["id"]}/symbol-dark.svg" alt=""><span class="brand-name">EgyHealth <span>360</span></span>')
        context = f'<!doctype html><html lang="{locale}" dir="{"rtl" if locale=="ar" else "ltr"}" data-ready="true"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{c["id"].upper()} / {locale} NOVA header context</title><link rel="stylesheet" href="assets/nova-base.css"><link rel="stylesheet" href="assets/validation-base.css"><link rel="stylesheet" href="header.css"><link rel="icon" href="data:,"></head><body class="header-context">{defs}<div class="shell">{masthead}<main id="main">{heading}</main></div><p class="context-note">{"دراسة مكان الشعار · القايمة مش متصلة بخدمة" if locale=="ar" else "Logo placement study · navigation is not connected"}</p></body></html>'
        (ROOT / f'{c["id"]}-{locale}-header.html').write_text(context)
    variants = ''.join(f'<div class="variant {v}"><p>{label}</p><img src="assets/{c["id"]}/wordmark-{v}.svg" alt="EgyHealth 360 {label}"></div>' for v,label in [('dark','Dark'),('light','Light'),('mono','Monochrome')])
    sizes = ''.join(f'<span><img src="assets/{c["id"]}/symbol-dark.svg" width="{s}" height="{s}" alt="Concept {c["id"]} at{s}px">{s}px</span>' for s in [16,24,32])
    proof = f'<header><p class="eyebrow">EGYHEALTH 360 / NOVA / ORIGINAL LOGO EXPLORATION</p><span class="code">CONCEPT {c["id"].upper()} · PROPOSAL</span><h1>{c["name"]}</h1><p class="intro">{c["idea"]}</p></header><main id="main" tabindex="-1"><div class="hero"><img class="large" src="assets/{c["id"]}/symbol-dark.svg" alt="Concept {c["id"]} symbol"><img class="wordmark" src="assets/{c["id"]}/wordmark-dark.svg" alt="EgyHealth 360 full wordmark"></div><div class="variants">{variants}</div><div class="two"><section class="panel"><h2>Actual CSS pixel sizes</h2><p class="note">Unscaled source sizes; no optical substitute or simplified extra mark.</p><div class="native">{sizes}</div><div class="native" style="background:white;padding:18px;border-radius:12px">'+''.join(f'<span><img src="assets/{c["id"]}/symbol-mono.svg" width="{s}" height="{s}" alt="Monochrome at{s}px"><b style="color:#30243c">{s}px</b></span>' for s in [16,24,32])+f'</div></section><section class="panel"><h2>Compact applications</h2><div class="iconrow"><img src="assets/{c["id"]}/app-icon.svg" width="96" height="96" alt="Masked app icon preview"><div class="tab"><img src="assets/{c["id"]}/favicon.svg" width="16" height="16" alt="16px favicon preview"><span>EgyHealth 360</span></div></div><p class="note">App mask and browser-tab studies, not a published app or selected favicon.</p></section></div><section style="margin-top:28px"><h2>Pinned NOVA Patient header context</h2><p class="note">PR #94 at9e5fca14; original Arabic/English navigation, patient identity and page heading. Only the proposal symbol/brand spacing is introduced here.</p><div class="context-grid"><iframe src="{c["id"]}-ar-header.html" title="Arabic RTL Patient header"></iframe><iframe src="{c["id"]}-en-header.html" title="English LTR Patient header"></iframe></div></section><p class="note">{c["tradeoff"]}</p><div class="download-list"><a href="assets/{c["id"]}/symbol-dark.svg">Editable symbol SVG</a><a href="assets/{c["id"]}/wordmark-dark.svg">Outlined full wordmark SVG</a><a href="index.html">All three concepts</a></div></main><footer class="footer">All concepts unselected. No final Brand V2, Design System, application or deployment approval. No trademark clearance.</footer>'
    (ROOT / f'{c["id"]}-proof.html').write_text(page(c['name'], proof, 'proof'))

cards=[]
for c in CONCEPTS:
    sizes=''.join(f'<span><img src="assets/{c["id"]}/symbol-dark.svg" width="{s}" height="{s}" alt="{s}px symbol">{s}px</span>' for s in [16,24,32])
    cards.append(f'<article class="concept" id="concept-{c["id"]}"><span class="code">CONCEPT {c["id"].upper()}</span><h2>{c["name"]}</h2><p class="arabic" lang="ar" dir="rtl">{c["ar"]}</p><div class="hero"><img src="assets/{c["id"]}/symbol-dark.svg" alt="Concept {c["id"].upper()} proposed symbol"></div><img class="wordmark" src="assets/{c["id"]}/wordmark-dark.svg" alt="EgyHealth 360 full wordmark"><p>{c["idea"]}</p><div class="native">{sizes}</div><p class="note">{c["tradeoff"]}</p><div class="actions"><a href="{c["id"]}-proof.html">Inspect proofs</a><a class="secondary" href="assets/{c["id"]}/symbol-dark.svg">SVG</a></div></article>')
content='<header><p class="eyebrow">EGYHEALTH 360 / NOVA / OWNER SELECTION PACKAGE</p><h1>Three ideas. One name.</h1><p class="intro">Original proposals for visual review. Same scale, palette and wordmark family; silhouette and construction carry the differences. No concept is selected.</p><p class="arabic" lang="ar" dir="rtl">تلات مقترحات لشعار EgyHealth 360. الاختيار أو التعديل أو الرفض لصاحب المنتج. دي مش هوية نهائية.</p></header><main id="main" tabindex="-1"><div class="grid">'+''.join(cards)+'</div></main><footer class="footer">Choose A, B or C for further refinement, reject all, or name specific changes. A concept preference does not finalize the full identity.<br>Final Brand V2 and Design System V2 remain owner-gated. No legal clearance or measured user recognition is claimed.</footer>'
(ROOT/'index.html').write_text(page('Three logo concepts',content))
(ROOT/'evidence/concepts.json').write_text(json.dumps(CONCEPTS,indent=2)+'\n')
print('Exactly three original concept families generated; all variants share their family geometry.')
