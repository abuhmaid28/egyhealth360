#!/usr/bin/env python3
"""Focused checks for the actual static delivery: inventory, local links, contrast and preserved scope."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import hashlib, json, subprocess
ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent
BASE='0a0e9c2038ecad420e95c2c67ae367129e195839'
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.ids=set()
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  for k in ['src','href']:
   if k in a:self.links.append(a[k])
parsed={}
for p in ROOT.rglob('*.html'):
 parser=Links();parser.feed(p.read_text());parsed[p]=parser
count=0
for p,parser in parsed.items():
 for value in parser.links:
  url=urlsplit(value)
  assert not url.scheme and not url.netloc, f'Nonlocal HTML dependency: {p}: {value}'
  target=(p.parent/unquote(url.path)).resolve() if url.path else p
  assert target.is_relative_to(REPO) and target.is_file(),f'Broken local reference {p}: {value}'
  if url.fragment and target in parsed:assert url.fragment in parsed[target].ids, f'Broken anchor {value}'
  count+=1
for d in 'abc':
 folder=ROOT/f'direction-{d}'
 assert len(list(folder.glob('*.png')))==15
 for lang in ['ar','en']:
  for kind in ['patient','patient-mobile','appointment','schedule','consultation','doctor-mobile','states']:
   source=(folder/f'{kind}-{lang}.html').read_text()
   assert f'lang="{lang}"' in source
   assert f'dir="{"rtl" if lang=="ar" else "ltr"}"' in source
   assert 'Omar Abdelrahman' in source or kind=='states'
 for code in [d+'1',d+'2']:
  for suffix in ['symbol.svg','proof.svg','proof.png']:assert (ROOT/'logos'/f'{code}-{suffix}').is_file()
render=json.loads((ROOT/'evidence/render-results.json').read_text())
assert not render['errors'] and not render['failures']
assert len(render['results'])==47
assert len(list(ROOT.glob('direction-*')))==3
# Evaluate actual foreground/background pairs used in the concepts. All are normal-text targets.
def lum(h):
 rgb=[int(h[i:i+2],16)/255 for i in [1,3,5]]
 return sum(c*w for c,w in zip([x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb],[.2126,.7152,.0722]))
def contrast(a,b):
 x,y=sorted([lum(a),lum(b)]);return (y+.05)/(x+.05)
data=json.loads((ROOT/'evidence/direction-data.json').read_text())
pairs=[]
for key,d in data.items():
 surface='#FBF9F3' if key=='a' else '#FFFFFF'
 for role,fg,bg in [('Body',d['ink'],d['bg']),('Body on surface',d['ink'],surface),('Secondary',d['muted'],d['bg']),('Secondary on surface',d['muted'],surface),('Primary action','#FFFFFF',d['primary']),('Primary on soft',d['primary'],d['soft']),('Support',d['support'],d['bg']),('Field boundary',d['muted'],surface),('Focus ring',d['primary'],d['bg'])]:
  pairs.append(dict(direction=key.upper(),role=role,foreground=fg,background=bg,ratio=round(contrast(fg,bg),2),target=4.5 if role not in ['Field boundary','Focus ring'] else 3))
for name,fg,bg in [('Success','#256045','#EAF4ED'),('Warning','#775008','#FFF3D5'),('Error','#912E35','#FCEDEF'),('Information','#254F78','#E9F1FA'),('Uncertain','#654308','#FFF3D5'),('Unavailable','#4C4D58','#ECECF1'),('B secondary on context','#4C6171','#DDE6ED'),('B rail labels','#D4E3EE','#123B60'),('C masthead labels','#E9E2F5','#473477'),('C nav marker','#D5C9ED','#473477')]:
 pairs.append(dict(direction='shared' if len(name.split())==1 else name[0],role=name,foreground=fg,background=bg,ratio=round(contrast(fg,bg),2),target=3 if name=='C nav marker' else 4.5))
assert all(p['ratio']>=p['target'] for p in pairs),[p for p in pairs if p['ratio']<p['target']]
(ROOT/'evidence/contrast-results.json').write_text(json.dumps(dict(method='WCAG sRGB relative luminance; explicit rendered role pairs, normal text 4.5, necessary boundaries/focus 3.0',min_text=min(p['ratio'] for p in pairs if p['target']==4.5),pairs=pairs),indent=2)+'\n')
# Compare every pre-existing file outside the exact documentation allowlist to base bytes.
allowed={f'docs/{p}' for p in ['CURRENT_STATUS.md','SOURCE_OF_TRUTH.md','IMPLEMENTATION_ROADMAP.md','PROJECT.md','BRAND_STRATEGY.md','BRAND_DECISION_REGISTER.md','BRAND_EXPLORATION_BRIEF.md']}
tracked=subprocess.check_output(['git','ls-tree','-rz','--name-only',BASE],cwd=REPO).decode().split('\0')
unchanged=0;v1=[]
for rel in filter(None,tracked):
 if rel in allowed:continue
 p=REPO/rel;before=subprocess.check_output(['git','show',f'{BASE}:{rel}'],cwd=REPO)
 assert p.is_file() and p.read_bytes()==before, f'Out-of-scope change: {rel}'
 unchanged+=1
 if rel.startswith('docs/ui-screenshots/doctor-demo/'):
  v1.append(dict(path=rel,sha256=hashlib.sha256(before).hexdigest()))
unknown=subprocess.check_output(['git','ls-files','--others','--exclude-standard','-z'],cwd=REPO).decode().split('\0')
assert all(p.startswith('docs/visual-directions/') for p in unknown if p),unknown
scope=dict(base=BASE,unchanged_existing_files_outside_allowlist=unchanged,protected_v1_count=len(v1),protected_v1=v1,permitted_existing_doc_changes=sorted(allowed),production_frontend_unchanged=True,backend_runtime_schema_migrations_openapi_dependencies_ci_unchanged=True)
(ROOT/'evidence/scope-results.json').write_text(json.dumps(scope,indent=2)+'\n')
print(f'PASS: 3 directions, 6 logos, 42 full screen PNGs + 3 overviews; {count} local HTML references; {len(pairs)} contrast pairs; {unchanged} unchanged existing files; {len(v1)} protected V1 files.')
