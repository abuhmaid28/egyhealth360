"""Dependency-free artifact, alias, reference and evidence integrity checks."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import hashlib
import json
import re
import subprocess

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
inventory=json.loads((HERE/'evidence/inventory.json').read_text())
report=json.loads((HERE/'evidence/browser-results.json').read_text())
assert len(inventory['screens'])==26
assert inventory['base']==report['base']
assert report['summary']['reflowFailures']==0
assert report['summary']['contrastFailures']==0
assert not report['errors'] and not report['external'] and not report['mutations']
assert len(report['interactions'])==2
assert report['preservation']['runtimeChanged'] is False

class HTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs=[]
        self.ids=set()
        self.labels=set()
        self.fields=[]
        self.h1=0
        self.html=None
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='html':self.html=attrs
        if tag=='h1':self.h1+=1
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, 'Duplicate id '+attrs['id']
            self.ids.add(attrs['id'])
        if tag=='img':assert attrs.get('alt'), 'Image without alternative text'
        if tag in ['input','textarea','select']:self.fields.append(attrs)
        if tag=='label' and 'for' in attrs:self.labels.add(attrs['for'])
        for a in ['href','src']:
            if a in attrs:self.refs.append(attrs[a])
        if tag=='script':assert attrs.get('src')=='review.js', 'Unexpected script'

parsers={}
for item in inventory['screens']:
    p=HERE/item['path']
    parser=HTML()
    parser.feed(p.read_text())
    assert parser.h1==1, str(p)+' needs one primary heading'
    assert parser.html['lang']==item['language']
    assert parser.html['dir']==('rtl' if item['language']=='ar' else 'ltr')
    for f in parser.fields:assert f.get('id') in parser.labels, 'Missing field label '+str(f)
    parsers[p.resolve()]=parser

links=0
for path,parser in parsers.items():
    for ref in parser.refs:
        u=urlsplit(ref)
        assert not u.scheme and not u.netloc, 'Unexpected external HTML dependency '+ref
        target=(path.parent/unquote(u.path)).resolve() if u.path else path
        assert target.is_relative_to(ROOT)
        assert target.exists(),str(path)+' missing '+ref
        if u.fragment and target in parsers:
            assert u.fragment in parsers[target].ids, 'Missing anchor '+ref
        links+=1
for css in HERE.glob('*.css'):
    for ref in re.findall(r'url\([\'"]?([^\'"\)]+)',css.read_text()):
        assert (css.parent/ref).resolve().is_file(), 'Missing font '+ref

# DTCG aliases are vendor-neutral and references must be known and acyclic.
tokens=json.loads((HERE/'tokens.json').read_text())
flat={}
def flatten(group,prefix=''):
    for key,value in group.items():
        if key.startswith('$'):continue
        name=prefix+'.'+key if prefix else key
        if '$value' in value:flat[name]=value
        else:flatten(value,name)
flatten(tokens)
def references(value):
    if isinstance(value,str) and re.fullmatch(r'\{[^{}]+\}',value):yield value[1:-1]
    elif isinstance(value,dict):
        for v in value.values():yield from references(v)
    elif isinstance(value,list):
        for v in value:yield from references(v)
def visit(key,stack=()):
    assert key in flat, 'Unknown alias '+key
    assert key not in stack, 'Cyclic alias '+key
    token=flat[key]
    for r in references(token['$value']):
        visit(r,stack+(key,))
        if isinstance(token['$value'],str):assert token['$type']==flat[r]['$type'], 'Alias type mismatch '+key
for key in flat:visit(key)
allcss='\n'.join(p.read_text() for p in HERE.glob('*.css'))
defined=set(re.findall(r'(--[\w-]+)\s*:',allcss))
used=set(re.findall(r'var\((--[\w-]+)',allcss))
assert used<=defined, 'Unknown CSS vars '+str(used-defined)

# Ensure deterministic generators reproduce, rather than allowing source/output drift.
source_outputs=[HERE/item['path'] for item in inventory['screens']]+[HERE/'tokens.json',HERE/'tokens.css',HERE/'evidence/inventory.json',HERE/'evidence/synthetic-fixture.json']
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_outputs}
for script in ['tokens.py','generate.py']:
    subprocess.run(['python',str(HERE/script)],check=True,capture_output=True)
assert before=={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_outputs}, 'Generated artifact drift'

hashes={}
for item in report['screenshots']:
    p=HERE/item['path']
    assert p.is_file()
    hashes[item['path']]=hashlib.sha256(p.read_bytes()).hexdigest()
(HERE/'evidence/screenshot-sha256.json').write_text(json.dumps(hashes,indent=2)+'\n')
result={'screens':len(inventory['screens']),'localHtmlReferences':links,'tokens':len(flat),'knownAcyclicTypeCorrectAliases':True,'generatedOutputsReproducible':True,'screenshotHashes':len(hashes),'browserSummary':report['summary'],'preservation':report['preservation']}
(HERE/'evidence/artifact-checks.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
