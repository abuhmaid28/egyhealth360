from pathlib import Path
from PIL import Image
import numpy as np
import json
root=Path('docs/brand-identity-reconstruction')
source=np.array(Image.open(root/'source/approved-board.png').crop((145,70,455,390)).convert('RGBA')).astype(float)
vector=np.array(Image.open(root/'evidence/symbol-primary.png').convert('RGBA')).astype(float)
def masks(x):
 r,g,b=x[:,:,:3].transpose(2,0,1);v=x[:,:,3]>127
 return {'gold':v&(r>130)&(g>90)&(b<r*.8),'cyan':v&(g>100)&(g-r>45),'rim':v&(r>200)&(g>200)&(b>200)}
a,b=masks(source),masks(vector);regions={}
for k in a:
 joint=a[k]&b[k]
 regions[k]={'threshold_mask_IoU':round(float(joint.sum()/(a[k]|b[k]).sum()),4),'intersection_RGB_MAE':round(float(np.abs(source[:,:,:3][joint]-vector[:,:,:3][joint]).mean()),2)}
report={'method':'Native310x320 aligned primary crop. Threshold color-region agreement only, NOT a full silhouette, perceptual fidelity, beauty or acceptance score. Gold:R>130,G>90,B<.8R;cyan:G>100,G-R>45;rim:RGB>200. Background/deep fold excluded;alpha>127. Antialiasing, smoothing and color decisions affect classification.','regions':regions}
(root/'evidence/color-region-comparison.json').write_text(json.dumps(report,indent=2)+'\n');print(regions)
