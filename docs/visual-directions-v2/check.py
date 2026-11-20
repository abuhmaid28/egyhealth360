"""Review-artifact validation, contrast role checks, and byte-level scope proof."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse
import hashlib
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent
BASE='0a0e9c2038ecad420e95c2c67ae367129e195839'
PREVIOUS='2dfc69aec4263c5e9fd56bd84a18328cf1bc2353'

def git(*args): return subprocess.check_output(['git',*args],cwd=REPO)

class Links(HTMLParser):
    def __init__(self): super().__init__();self.links=[]
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('src','href') and value:self.links.append(value)

def lum(color):
    values=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))

def contrast(a,b):
    x,y=sorted([lum(a),lum(b)])
    return (y+.05)/(x+.05)

def main():
    inventory=json.loads((ROOT/'evidence/inventory.json').read_text())
    assert len(inventory)==54
    assert {x['direction'] for x in inventory}=={'d','e','f'}
    assert len({(x['direction'],x['screen'],x['language']) for x in inventory})==54
    refs=0
    for path in ROOT.rglob('*.html'):
        parser=Links();parser.feed(path.read_text())
        for ref in parser.links:
            assert not urlparse(ref).scheme, f'External runtime reference: {path}:{ref}'
            target=(path.parent/unquote(ref.split('#')[0])).resolve()
            assert target.is_relative_to(REPO),f'Outside repository: {ref}'
            assert target.exists(),f'Missing {path.relative_to(ROOT)}:{ref}'
            refs+=1
    for item in inventory:
        path=ROOT/item['path'];text=path.read_text()
        assert path.with_suffix('.png').exists()
        assert f'lang="{item["language"]}"' in text
        assert ('dir="rtl"' in text) if item['language']=='ar' else ('dir="ltr"' in text)
        assert 'controls are appearance specimens' in text or 'الأزرار للعرض البصري' in text
        if item['width']==390:assert path.with_name(path.stem+'-viewport.png').exists()
        if item['screen'] in ('patient','patient-mobile','consultation','typography'):
            assert 'Amoxicillin' in text and '1.25 mL' in text
        if item['screen']=='consultation':
            assert 'EH-DEMO-204' in text
            assert ('Signing keeps it private' in text) if item['language']=='en' else ('التوقيع مش بيشاركها' in text)
            assert ('Closing does not save, sign or share' in text) if item['language']=='en' else ('الإغلاق مش بيحفظ أو يوقّع أو يشارك' in text)
    css=(ROOT/'screens.css').read_text()
    pairs=[]
    for direction,block in re.findall(r'\.([def])\{([^}]*--latin:[^}]*)\}',css):
        variables=dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})(?=;|$)',block))
        variables={k:('#'+''.join(c*2 for c in v[1:])) if len(v)==4 else v for k,v in variables.items()}
        for fg,bg in [('ink','bg'),('ink','surface'),('muted','bg'),('muted','surface'),('accent','bg'),('accent','soft'),('on-accent','accent'),('good','good-bg'),('warn','warn-bg'),('error','surface')]:
            ratio=contrast(variables[fg],variables[bg]);pairs.append(dict(direction=direction,role=fg+'/'+bg,foreground=variables[fg],background=variables[bg],ratio=round(ratio,2),target=4.5));assert ratio>=4.5,(direction,fg,bg,ratio)
        for fg,bg in [('line-strong','surface'),('line-strong','bg'),('focus','surface')]:
            ratio=contrast(variables[fg],variables[bg]);pairs.append(dict(direction=direction,role=fg+'/'+bg,foreground=variables[fg],background=variables[bg],ratio=round(ratio,2),target=3));assert ratio>=3,(direction,fg,bg,ratio)
    for direction,role,a,b in [('e','appointment muted','#d7e9e1','#205c4e'),('e','appointment button','#205c4e','#ffffff'),('e','appointment avatar','#ffffff','#427768'),('f','appointment ink','#142831','#e9f3f6'),('f','appointment muted','#455f6c','#e9f3f6'),('f','appointment action','#ffffff','#164f63'),('f','appointment status','#20533e','#d2e7dd')]:
        ratio=contrast(a,b);pairs.append(dict(direction=direction,role=role,foreground=a,background=b,ratio=round(ratio,2),target=4.5));assert ratio>=4.5,(direction,role,ratio)
    (ROOT/'evidence/contrast-results.json').write_text(json.dumps(pairs,indent=2)+'\n')
    browser=json.loads((ROOT/'evidence/browser-results.json').read_text())
    assert len(browser['screens'])==54
    assert not browser['failures'] and not browser['externalRequests'] and not browser['fontErrors']
    assert browser['textContrast'] and all(x['ratio']>=4.5 for x in browser['textContrast']), [x for x in browser['textContrast'] if x['ratio']<4.5]
    for group in ['screens','reflow320','textResize200']:
        for item in browser[group]:assert not item['overflow'] and item['scrollWidth']<=item['width'],(group,item)
    assert all(x['outline']=='solid' for x in browser['keyboard'])
    allowed={'docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md','docs/PROJECT.md','docs/IMPLEMENTATION_ROADMAP.md',*[f'docs/{name}.md' for name in ['BRAND_RESEARCH','BRAND_REFERENCE_MAP','BRAND_RESEARCH_VALIDATION','BRAND_STRATEGY','BRAND_EXPLORATION_BRIEF','BRAND_DECISION_REGISTER']]}
    preserved=[]
    for path in git('ls-tree','-r','--name-only',BASE).decode().splitlines():
        if path in allowed:continue
        original=git('show',BASE+':'+path);current=(REPO/path).read_bytes()
        assert original==current,f'Out-of-scope baseline change: {path}'
        preserved.append(dict(path=path,sha256=hashlib.sha256(current).hexdigest()))
    previous=[]
    for path in git('ls-tree','-r','--name-only',PREVIOUS,'docs/visual-directions').decode().splitlines():
        if path.endswith('/README.md'):continue
        original=git('show',PREVIOUS+':'+path);current=(REPO/path).read_bytes()
        assert original==current,f'Changed historical visual evidence: {path}'
        previous.append(dict(path=path,sha256=hashlib.sha256(current).hexdigest()))
    report=dict(base=BASE,previous_visual_head=PREVIOUS,allowed_existing_doc_updates=sorted(allowed),baseline_preserved=preserved,previous_visual_preserved=previous,production_frontend_backend_database_api_security_dependencies_ci_hosting='Byte-identical to main baseline',protected_v1=[x for x in preserved if x['path'].startswith('docs/ui-screenshots/doctor-demo/')])
    (ROOT/'evidence/preservation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(f'PASS: 54 bilingual specimens; {refs} local HTML references; {len(pairs)} contrast roles; browser/reflow/text-resize/focus checks; {len(preserved)} baseline files + {len(previous)} historical visual files byte-identical.')

if __name__=='__main__':main()
