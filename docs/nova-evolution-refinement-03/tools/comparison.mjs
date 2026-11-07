import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const directory='docs/nova-evolution-refinement-03';
const source='e760ed4332ffca876702b32f6ffd4b1787d20783';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const images={}; const fingerprints=[];
for(const width of [390,1440]){
  const name=`refined-ar-${width}-full.png`;
  const before=execFileSync('git',['show',`${source}:docs/nova-evolution-refinement/evidence/${name}`],{maxBuffer:10*1024*1024});
  const after=await readFile(`${directory}/evidence/${name}`);
  images[`before-${width}`]=before;images[`after-${width}`]=after;
  fingerprints.push({width,sourceCommit:source,sourcePath:`docs/nova-evolution-refinement/evidence/${name}`,beforeSha256:hash(before),afterSha256:hash(after)});
}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1560,height:1000},deviceScaleFactor:1});
await page.route('http://127.0.0.1:8765/__comparison__/*',route=>route.fulfill({contentType:'image/png',body:images[route.request().url().split('/').pop()]}));
await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;padding:40px;background:#191525;color:#faf8ff;font:18px/1.5 Arial,sans-serif}h1{font-size:32px;margin:0 0 8px}p{color:#d5c9e2;margin:0 0 24px}.columns{display:grid;grid-template-columns:720px 720px;gap:32px}.label{padding:14px 0;border-top:1px solid #8c749e;color:#dcfa94;font-size:22px}.desktop{width:720px;display:block;border:1px solid #675777}.phones{margin-top:32px}.phone{width:390px;display:block;margin:20px auto 0;border:1px solid #675777}.note{margin:18px 0;color:#d5c9e2;font-size:17px}footer{margin-top:32px;padding-top:20px;border-top:1px solid #675777;color:#d5c9e2;font-size:17px}
</style><h1>NOVA EVOLUTION / REFINEMENT 03</h1><p>One Arabic Patient My Care refinement · browser-rendered evidence · design proposal only</p>
<div class="columns"><section><div class="label">BEFORE / PR #91 · e760ed4</div><p>Full desktop at 50% display size · original 1440px</p><img class="desktop" src="http://127.0.0.1:8765/__comparison__/before-1440"></section><section><div class="label">AFTER / Refinement 03</div><p>Full desktop at 50% display size · original 1440px</p><img class="desktop" src="http://127.0.0.1:8765/__comparison__/after-1440"></section></div>
<div class="columns phones"><section><div class="label">BEFORE / full 390px phone</div><p class="note">Initials square · text-like navigation · single pale shared plane</p><img class="phone" src="http://127.0.0.1:8765/__comparison__/before-390"></section><section><div class="label">AFTER / full 390px phone</div><p class="note">Doctor marker · framed navigation · layered plum sources · larger secondary text</p><img class="phone" src="http://127.0.0.1:8765/__comparison__/after-390"></section></div>
<footer>Matched 390×844 / 1440×1050 viewports, Chromium 154, DPR 1. All captures are complete; no content cropping.<br>Same synthetic facts and independent source meanings. The longer phone layout prioritizes readable type and visible controls.<br>PR #91 source image bytes are read directly from its pinned Git commit; original evidence is unchanged.</footer></html>`);
await page.locator('img').evaluateAll(async images=>Promise.all(images.map(im=>im.decode())));
await page.screenshot({path:`${directory}/evidence/before-after.png`,fullPage:true});
await browser.close();
await writeFile(`${directory}/evidence/comparison-sources.json`,JSON.stringify({sourceCommit:source,method:'Complete original screenshot bytes composed by Chromium, no cropping; desktop 50%, phone 100%.',fingerprints},null,2)+'\n');
console.log('One full before/after board captured; source image fingerprints retained.');
