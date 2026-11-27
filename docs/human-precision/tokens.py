"""Provisional DTCG-format layers and an alias-resolved static CSS projection."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent

def token(kind,value,description=''):
    t={'$type':kind,'$value':value}
    if description:
        t['$description']=description
    return t

def color(value):
    return token('color',{'colorSpace':'srgb','components':[int(value[i:i+2],16)/255 for i in (1,3,5)],'alpha':1,'hex':value})

def dimension(value):
    return token('dimension',{'value':value,'unit':'px'})

foundation={
    'color':{k:color(v) for k,v in {'ink':'#102A38','teal':'#155E63','deep':'#153F47','canvas':'#F5F7F7','white':'#FFFFFF','muted':'#4E626B','line':'#D5DFE1','control':'#71858D','subtle':'#EAF0F1','warningInk':'#765000','warningWash':'#FFF4D8','successInk':'#235D45','successWash':'#E9F4ED','errorInk':'#AF2F38','errorWash':'#FFF0F1','navy':'#102A38','precisionAction':'#145C78','precisionAnchor':'#193E52'}.items()},
    'space':{str(n):dimension(n) for n in [0,4,8,12,16,24,32,40,48,64,80]},
    'radius':{str(n):dimension(n) for n in [0,4,6,8,12,16]},
    'type':{
        'arabic':token('fontFamily',['PlexArabic','Arial','sans-serif'],'Existing E / merged Patient pairing; proposal only'),
        'latin':token('fontFamily',['Manrope','Arial','sans-serif']),
        'size':{k:dimension(v) for k,v in {'caption':12,'small':14,'body':16,'label':14,'section':20,'heading':32,'display':56}.items()},
        'lineArabic':token('number',1.85),'lineLatin':token('number',1.65),'weightRegular':token('fontWeight',400),'weightStrong':token('fontWeight',700)},
    'border':{'thin':dimension(1),'strong':dimension(2),'focus':dimension(3)},
    'motion':{'feedback':token('duration',{'value':140,'unit':'ms'}),'reduced':token('duration',{'value':0,'unit':'ms'})},
    'elevation':{'flat':token('shadow',{'color':'{foundation.color.ink}','offsetX':{'value':0,'unit':'px'},'offsetY':{'value':0,'unit':'px'},'blur':{'value':0,'unit':'px'},'spread':{'value':0,'unit':'px'}})},
    'viewport':{'narrow':dimension(320),'mobile':dimension(390),'clinicalReview':dimension(720),'tablet':dimension(768),'desktop':dimension(1440)},
    'grid':{'columns':token('number',12),'maxWidth':dimension(1328),'gutter':dimension(32)}
}
semantic={'challenger':{'action':token('color','{foundation.color.precisionAction}'),'anchor':token('color','{foundation.color.precisionAnchor}')},'color':{k:token('color','{foundation.color.'+v+'}') for k,v in {'canvas':'canvas','surface':'white','text':'ink','muted':'muted','divider':'line','controlBorder':'control','action':'teal','anchor':'deep','focus':'navy','subtle':'subtle','warningText':'warningInk','warningSurface':'warningWash','successText':'successInk','successSurface':'successWash','errorText':'errorInk','errorSurface':'errorWash','privateAudience':'ink','releasedAudience':'teal'}.items()},
    'density':{'patient':token('dimension','{foundation.space.24}'),'clinician':token('dimension','{foundation.space.12}'),'operations':token('dimension','{foundation.space.16}')},
    'target':{'minimum':token('dimension','{foundation.space.48}')},
    'motion':{'feedback':token('duration','{foundation.motion.feedback}')},
    'type':{'bodyArabic':token('fontFamily','{foundation.type.arabic}'),'bodyLatin':token('fontFamily','{foundation.type.latin}')}
}
component={
    'button':{'radius':token('dimension','{foundation.radius.6}'),'height':token('dimension','{semantic.target.minimum}'),'background':token('color','{semantic.color.action}')},
    'appointment':{'radius':token('dimension','{foundation.radius.16}'),'background':token('color','{semantic.color.anchor}')},
    'sourceRow':{'padding':token('dimension','{semantic.density.clinician}'),'divider':token('color','{semantic.color.divider}')},
    'focus':{'width':token('dimension','{foundation.border.focus}'),'color':token('color','{semantic.color.focus}')}
}
data={'$description':'EgyHealth 360 Human Precision proposal v0.1. Unselected; no production or component-API adoption. DTCG 2025.10-shaped types, aliases and sRGB colors. Not third-party schema-certified.', 'foundation':foundation,'semantic':semantic,'component':component}
flat={}
def flatten(group,path=''):
    for k,v in group.items():
        if k.startswith('$'):continue
        key=f'{path}.{k}' if path else k
        if '$value' in v:flat[key]=v
        else:flatten(v,key)
flatten(data)
def resolve(key,trail=()):
    if key in trail:raise ValueError('Token alias cycle '+key)
    value=flat[key]['$value']
    if isinstance(value,str) and value.startswith('{') and value.endswith('}'):
        return resolve(value[1:-1],trail+(key,))
    return value

def css_value(key):
    v=resolve(key)
    t=flat[key]['$type']
    if t=='color':return v['hex']
    if t in ['dimension','duration']:return str(v['value'])+v['unit']
    if t in ['number','fontWeight']:return str(v)
    if t=='fontFamily':return ','.join(v)
    return None

if __name__=='__main__':
    (HERE/'tokens.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    lines=['/* Generated from provisional tokens.json by tokens.py. No production import. */',':root{']
    for key in flat:
        value=css_value(key)
        if value is not None:lines.append('  --'+key.replace('.','-')+':'+value+';')
    lines.append('}')
    (HERE/'tokens.css').write_text('\n'.join(lines)+'\n')
    print(f'{len(flat)} provisional tokens; all aliases resolved')
