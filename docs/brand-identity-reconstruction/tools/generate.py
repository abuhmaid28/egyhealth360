"""Measured-board vector reconstruction. All geometry editable; no raster in SVGs."""
from pathlib import Path
import ctypes as C
import hashlib
import json
import sys
import types
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from xml.sax.saxutils import escape
sys.dont_write_bytecode=True
from trace import source_contours

ROOT=Path('docs/brand-identity-reconstruction')
ASSETS=ROOT/'assets'
SOURCE=ROOT/'source/approved-board.png'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()=='0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417'

# Coordinates stay in the original board's 1536×1024 coordinate system.
SHAPES={
 'underside':'M348 273C395 254 437 223 444 185C455 234 421 283 376 316C337 345 303 351 287 381L282 366C281 326 313 288 348 273Z',
 'left':'M302 177C273 151 241 122 210 130C173 139 148 174 154 216C160 270 216 321 282 356C248 316 216 268 225 234C233 199 258 195 287 202C314 210 334 203 349 213C332 199 315 190 302 177Z',
 'right':'M302 177C330 182 353 153 376 139C406 120 434 145 442 174C453 210 412 247 348 273C365 248 365 228 349 213C332 198 318 191 302 177Z',
 'gold':'M443 184C450 215 435 247 411 267C386 289 359 301 335 312C307 325 287 343 284 369C274 349 278 325 292 308C306 292 324 283 348 273C397 253 435 225 443 184Z',
 'rimLeft':'M173 151C208 112 241 131 275 158L302 177C271 155 238 125 208 134C194 137 182 143 173 151Z',
 'rimRight':'M302 177C331 182 355 152 379 139C408 121 435 147 442 174C435 143 408 118 378 136C355 149 331 178 302 173Z'
}

SHAPES.update(source_contours(SOURCE))

def defs(prefix='m'):
 return f'''<defs>
 <linearGradient id="{prefix}-left" gradientUnits="userSpaceOnUse" x1="168" y1="269" x2="307" y2="150"><stop stop-color="#00c9cb"/><stop offset=".45" stop-color="#00a6ad"/><stop offset="1" stop-color="#005466"/></linearGradient>
 <linearGradient id="{prefix}-right" gradientUnits="userSpaceOnUse" x1="339" y1="149" x2="407" y2="267"><stop stop-color="#72eee4"/><stop offset=".38" stop-color="#3dded7"/><stop offset="1" stop-color="#00babc"/></linearGradient>
 <linearGradient id="{prefix}-under" gradientUnits="userSpaceOnUse" x1="368" y1="302" x2="291" y2="376"><stop stop-color="#003544"/><stop offset=".7" stop-color="#00586a"/><stop offset="1" stop-color="#003e50"/></linearGradient>
 <radialGradient id="{prefix}-gold" gradientUnits="userSpaceOnUse" cx="335" cy="290" r="95" gradientTransform="matrix(1 0 0 .62 0 110)"><stop stop-color="#ffe976"/><stop offset=".48" stop-color="#ffce35"/><stop offset="1" stop-color="#ffad00"/></radialGradient>
 <radialGradient id="{prefix}-head" gradientUnits="userSpaceOnUse" cx="325" cy="82" r="60"><stop stop-color="#fff1a4"/><stop offset=".33" stop-color="#ffdb56"/><stop offset=".8" stop-color="#ffba12"/><stop offset="1" stop-color="#f9ad00"/></radialGradient>
 <radialGradient id="{prefix}-leftLight" gradientUnits="userSpaceOnUse" cx="180" cy="230" r="75"><stop stop-color="#38fff0" stop-opacity=".34"/><stop offset="1" stop-color="#38fff0" stop-opacity="0"/></radialGradient>
 <radialGradient id="{prefix}-darkFold" gradientUnits="userSpaceOnUse" cx="300" cy="205" r="70"><stop stop-color="#003042" stop-opacity=".4"/><stop offset="1" stop-color="#003042" stop-opacity="0"/></radialGradient>
 <linearGradient id="wordGold" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#ffac00"/><stop offset="1" stop-color="#ffdf68"/></linearGradient>
 <linearGradient id="wordGoldLight" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#c58c16"/><stop offset="1" stop-color="#e8b74f"/></linearGradient>
 <linearGradient id="{prefix}-bg" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#022b3b"/><stop offset=".55" stop-color="#034653"/><stop offset="1" stop-color="#10999a"/></linearGradient>
 </defs>'''

def mark(prefix='m',mono=None):
 color=lambda k:mono or f'url(#{prefix}-{k})'
 return f'''<g id="master-symbol">
 <path id="fold-underside" d="{SHAPES['underside']}" fill="{color('under')}"/>
 <path id="left-care-sheet" d="{SHAPES['left']}" fill="{color('left')}"/>
 {'' if mono else f'<path d="{SHAPES["left"]}" fill="url(#{prefix}-leftLight)"/><path d="{SHAPES["left"]}" fill="url(#{prefix}-darkFold)"/>'}
 <path id="right-care-sheet" d="{SHAPES['right']}" fill="{color('right')}"/>
 <path id="gold-accent-ribbon" d="{SHAPES['gold']}" fill="{color('gold')}"/>
 {f'<path d="{SHAPES["gold"]}" fill="none" stroke="white" stroke-width="1.6"/>' if mono else f'<path id="left-rim" d="{SHAPES["rimLeft"]}" fill="#f4faf9"/><path id="right-rim" d="{SHAPES["rimRight"]}" fill="#effcf9"/>'}
 <ellipse id="human-head" cx="312.2" cy="110.6" rx="34.4" ry="35.2" fill="{color('head')}"/>
 </g>'''

def svg(content,viewbox,title):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" role="img" aria-labelledby="title"><title id="title">{escape(title)}</title>{content}</svg>\n'.replace(' \n','\n')

# Shape Arabic with the installed HarfBuzz system library, then outline its glyphs.
hb=C.CDLL('libharfbuzz.so.0')
def bind(name,result,args):
 f=getattr(hb,name);f.restype=result;f.argtypes=args;return f
ptr=C.c_void_p;u=C.c_uint
blob=bind('hb_blob_create_from_file_or_fail',ptr,[C.c_char_p])
face=bind('hb_face_create',ptr,[ptr,u]);font_create=bind('hb_font_create',ptr,[ptr])
ot=bind('hb_ot_font_set_funcs',None,[ptr]);buffer=bind('hb_buffer_create',ptr,[])
add=bind('hb_buffer_add_utf8',None,[ptr,C.c_char_p,C.c_int,u,C.c_int])
guess=bind('hb_buffer_guess_segment_properties',None,[ptr]);shape=bind('hb_shape',None,[ptr,ptr,ptr,u])
class Info(C.Structure): _fields_=[('codepoint',u),('mask',u),('cluster',u),('v1',u),('v2',u)]
class Pos(C.Structure): _fields_=[('xa',C.c_int),('ya',C.c_int),('xo',C.c_int),('yo',C.c_int),('v',u)]
infos=bind('hb_buffer_get_glyph_infos',C.POINTER(Info),[ptr,C.POINTER(u)])
positions=bind('hb_buffer_get_glyph_positions',C.POINTER(Pos),[ptr,C.POINTER(u)])
# Decode bundled WOFF2 through the installed system Brotli library; no installer.
bd=C.CDLL('libbrotlidec.so.1')
bd.BrotliDecoderDecompress.argtypes=[C.c_size_t,ptr,C.POINTER(C.c_size_t),ptr]
bd.BrotliDecoderDecompress.restype=C.c_int
def brotli_decode(data):
 output=C.create_string_buffer(16*1024*1024);size=C.c_size_t(len(output));src=C.create_string_buffer(data)
 assert bd.BrotliDecoderDecompress(len(data),src,C.byref(size),output)==1
 return output.raw[:size.value]
shim=types.ModuleType('brotli');shim.decompress=brotli_decode;sys.modules.setdefault('brotli',shim)
latin=instantiateVariableFont(TTFont(ASSETS/'inter.woff2'),{'wght':800},inplace=False)
latin_regular=instantiateVariableFont(TTFont(ASSETS/'inter.woff2'),{'wght':450},inplace=False)
arabic=TTFont(ASSETS/'plex-arabic-semibold.ttf')
af=font_create(face(blob(str(ASSETS/'plex-arabic-semibold.ttf').encode()),0));ot(af)

def outlines(text,lang='en',regular=False):
 f=arabic if lang=='ar' else (latin_regular if regular else latin);gs=f.getGlyphSet();order=f.getGlyphOrder();parts=[];x=0
 if lang=='ar':
  b=buffer();raw=text.encode();add(b,raw,len(raw),0,len(raw));guess(b);shape(af,b,None,0);n=u();ii=infos(b,C.byref(n));pp=positions(b,C.byref(n));items=[(order[ii[i].codepoint],pp[i].xa,pp[i].xo,pp[i].yo) for i in range(n.value)]
 else:
  cmap=f.getBestCmap();items=[(cmap[ord(ch)],f['hmtx'].metrics[cmap[ord(ch)]][0],0,0) for ch in text]
 for g,advance,xo,yo in items:
  pen=SVGPathPen(gs);gs[g].draw(pen)
  if pen.getCommands():parts.append(f'<path transform="translate({x+xo} {yo})" d="{pen.getCommands()}"/>')
  x+=advance
 return ''.join(parts),x,f['head'].unitsPerEm

def text(text,x,y,size,fill,lang='en',width=None,regular=False):
 paths,advance,upm=outlines(text,lang,regular);sx=width/advance if width else size/upm
 return f'<g data-text="{escape(text)}" fill="{fill}" transform="translate({x} {y}) scale({sx} {-size/upm})">{paths}</g>'

(ASSETS/'symbol-primary.svg').write_text(svg(defs()+mark(),'145 70 310 320','EgyHealth 360 — reconstructed primary master symbol'))
for variant,bg,ink in [('dark','#043b49','#ffffff'),('light','#f7f9fa','#0b3d4a'),('mono','#ffffff','#0b3d4a')]:
 mono=ink if variant=='mono' else None
 content=defs()+f'<rect width="1010" height="350" rx="24" fill="{bg}"/>'
 content+=f'<g transform="translate(-125 -55)">{mark(mono=mono)}</g>'
 gold=ink if mono else ('url(#wordGoldLight)' if variant=='light' else 'url(#wordGold)')
 tagline='#c9edf0' if variant=='dark' else ink
 content+=text('EgyHealth',352,110,86,ink,width=420)+text('360',787,110,86,gold,width=165)
 content+=text('360',382,207,84,gold,width=152)+text('إيجي هيلث',560,210,91,ink,'ar',width=378)
 content+=text('رعاية متكاملة حولك',468,286,48,tagline,'ar',width=400)
 content+=text('Integrated care around you',436,331,35,tagline,width=470,regular=True)
 (ASSETS/f'lockup-{variant}.svg').write_text(svg(content,'0 0 1010 350',f'EgyHealth 360 — {variant} horizontal lockup; إيجي هيلث 360; رعاية متكاملة حولك; Integrated care around you'))
 icon=defs()+f'<rect width="330" height="340" rx="26" fill="{bg}"/><g transform="translate(-135 -60)">{mark(mono=mono)}</g>'
 (ASSETS/f'icon-{variant}.svg').write_text(svg(icon,'0 0 330 340',f'EgyHealth 360 — {variant} standalone icon'))

app=defs()+f'<rect width="512" height="512" rx="104" fill="url(#m-bg)"/><g transform="translate(38 32) scale(1.4)"><g transform="translate(-145 -70)">{mark()}</g></g>'
(ASSETS/'app-icon-512.svg').write_text(svg(app,'0 0 512 512','EgyHealth 360 — 512px app-icon proof'))
for size in [32,24,16]:
 (ASSETS/f'favicon-{size}.svg').write_text(svg(app,'0 0 512 512',f'EgyHealth 360 — {size}px favicon; unchanged master geometry'))

for locale in ['ar','en']:
 ar=locale=='ar'
 header=defs()+f'<rect width="1200" height="140" rx="27" fill="url(#m-bg)"/>'
 header+='<path d="M285 25V115M753 25V115" stroke="#92cdd0" stroke-width="1"/>'
 header+=f'<g transform="translate(332 15) scale(.34)"><g transform="translate(-145 -70)">{mark()}</g></g>'
 header+=text('EgyHealth',468,62,39,'white',width=155)+text('360',638,62,39,'#ffc127',width=64)
 header+=text('360',470,108,30,'#ffc127',width=60)+text('إيجي هيلث',540,108,34,'white','ar',width=166)
 header+=text('NOVA',806,90,50,'white',width=144)
 header+='<g fill="none" stroke="white" stroke-width="4" stroke-linecap="round"><path d="M1120 48H1165M1120 70H1165M1120 92H1165"/><circle cx="210" cy="52" r="12"/><path d="M186 98V89a24 24 0 0 1 48 0v9M72 87h43l-6-12V58a15 15 0 0 0-30 0v17ZM89 96h10"/></g><circle cx="107" cy="45" r="8" fill="#ffc127"/>'
 (ASSETS/f'nova-header-{locale}.svg').write_text(svg(header,'0 0 1200 140',f'{"Arabic RTL" if ar else "English LTR"} NOVA header reconstruction from approved board'))

print('Reconstructed master, three lockups/icons, 512 app icon, three native favicon proofs and two board-based NOVA headers.')
