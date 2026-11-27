"""Source-guided gold/rim contours from verified primary hero; no old crop used."""
import numpy as np
from PIL import Image
from scipy.ndimage import label, gaussian_filter
from contourpy import contour_generator

def rdp(p,t):
 if len(p)<3:return p
 a,b=p[0],p[-1];v=b-a;n=np.linalg.norm(v)
 d=np.abs(v[0]*(p[:,1]-a[1])-v[1]*(p[:,0]-a[0]))/n if n else np.linalg.norm(p-a,axis=1)
 i=np.argmax(d)
 return np.vstack([rdp(p[:i+1],t)[:-1],rdp(p[i:],t)]) if d[i]>t else p[[0,-1]]

def curve(points,tolerance):
 p=points[:-1];k=np.argmax(np.linalg.norm(p-p[0],axis=1));p=np.vstack([rdp(p[:k+1],tolerance)[:-1],rdp(np.vstack([p[k:],p[:1]]),tolerance)[:-1]])
 p+=np.array([145,70]);out=f'M{p[0,0]:.2f} {p[0,1]:.2f}'
 for i,a in enumerate(p):
  b=p[(i+1)%len(p)];prev=p[(i-1)%len(p)];nxt=p[(i+2)%len(p)];c1=a+(b-prev)/8;c2=b-(nxt-a)/8
  out+=f'C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {b[0]:.2f} {b[1]:.2f}'
 return out+'Z'

def source_contours(path):
 im=np.array(Image.open(path).convert('RGB'))[70:390,145:455].astype(float);r,g,b=im.transpose(2,0,1)
 gold=(r>130)&(g>90)&(b<r*.8);white=(r>210)&(g>210)&(b>210)
 result={}
 for name,mask in [('gold',gold),('rim',white)]:
  labels,n=label(mask);parts=sorted([(int((labels==i).sum()),labels==i) for i in range(1,n+1)],key=lambda x:x[0],reverse=True)
  selected=parts[:1] if name=='gold' else [p for p in parts if p[0]>20]
  if name=='rim':selected=sorted(selected,key=lambda p:np.where(p[1])[1].min())
  for i,(_,part) in enumerate(selected):
   contours=contour_generator(z=gaussian_filter(part.astype(float),1.1 if name=='gold' else .65)).lines(.5 if name=='gold' else .35);contour=max(contours,key=len)
   result['gold' if name=='gold' else ['rimLeft','rimRight'][i]]=curve(contour,1.2 if name=='gold' else .7)
 return result
