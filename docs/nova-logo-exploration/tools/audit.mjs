/* global document, getComputedStyle */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const dir='docs/nova-logo-exploration',base='5355ae5b12bb86ed2c05f70fcadd77eadcd7bde3',pin='9e5fca14c7f931a49e94dd88915f8c9fa24a45da';
const digest=b=>createHash('sha256').update(b).digest('hex');
const git=args=>execFileSync('git',args,{maxBuffer:32*1024*1024});
const report=JSON.parse(await readFile(`${dir}/evidence/browser-results.json`,'utf8'));
assert.equal(report.cases.length,80);for(const key of ['failures','errors','external','failed'])assert.deepEqual(report[key],[]);
for(const c of report.cases){assert.ok(c.textRatios.every(x=>Math.abs(x-c.scale)<.001));assert.ok(c.targets.every(t=>t.width>=44&&t.height>=44));if(c.brand)assert.equal(c.brand,'EgyHealth 360');}
assert.equal(report.smallSizes.length,36);for(const c of report.smallSizes){assert.equal(c.display.width,c.size);assert.equal(c.display.height,c.size);assert.ok(c.bounds.x>=0&&c.bounds.y>=0&&c.bounds.x+c.bounds.width<=64&&c.bounds.y+c.bounds.height<=64);}
for(const c of report.keyboard){assert.equal(c.main,'main');assert.equal(c.skip.outline,'3px');assert.ok(c.links.every(l=>l.outline==='3px'&&l.style==='solid'));}
const svgFiles=[];for(const id of ['a','b','c'])for(const name of await readdir(`${dir}/assets/${id}`)){const path=`${dir}/assets/${id}/${name}`;const s=await readFile(path,'utf8');assert.ok(!/<(?:script|image|foreignObject)|(?:href|src)=|url\(/i.test(s),path);assert.match(s,/<title/);svgFiles.push(path);}
assert.equal(svgFiles.length,30);
const fonts=[];for(const f of ['manrope.ttf','manrope-OFL.txt','plex-arabic-regular.ttf','plex-arabic-semibold.ttf','plex-arabic-OFL.txt']){const b=await readFile(`${dir}/assets/${f}`);assert.ok(b.equals(git(['show',`${pin}:docs/patient-finalist-validation/assets/${f}`])));fonts.push({file:f,sha256:digest(b)});}
const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const contrast=[];
for(const name of ['index','a-proof','b-proof','c-proof']){const p=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await p.goto(`http://127.0.0.1:8765/${dir}/${name}.html`);for(const frame of p.frames()){await frame.evaluate(()=>document.fonts.ready);const pairs=await frame.evaluate(()=>{const rgb=s=>s.match(/[\d.]+/g)?.map(Number);return [...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&!el.closest('svg')&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(el=>{let p=el,bg;while(p){const c=rgb(getComputedStyle(p).backgroundColor);if(c&&(c.length===3||c[3]===1)){bg=c;break;}p=p.parentElement;}return {text:el.textContent.trim().slice(0,40),fg:rgb(getComputedStyle(el).color),bg};}).filter(p=>p.bg);});for(const pair of pairs)contrast.push({name,...pair,ratio:Number(ratio(pair.fg,pair.bg).toFixed(2))});}await p.close();}await browser.close();assert.ok(contrast.every(p=>p.ratio>=4.5));
const symbolPairs=[['dark',[220,250,148],[33,26,48]],['light',[48,36,60],[247,244,251]],['mono',[23,23,23],[255,255,255]],['reverse',[255,255,255],[23,18,33]],['focus',[229,255,156],[41,34,53]]].map(([variant,fg,bg])=>({variant,ratio:Number(ratio(fg,bg).toFixed(2))}));assert.ok(symbolPairs.every(p=>p.ratio>=3));
await writeFile(`${dir}/evidence/audit.json`,JSON.stringify({result:'PASS',cases:80,nativeSizeConfigurations:36,safeSVGs:30,fontParity:fonts,textContrastSamples:contrast.length,textMinimum:Math.min(...contrast.map(p=>p.ratio)),symbolPairs,contrast,limitations:'Sampled contrast/AX/reflow is not WCAG certification, measured recognition, exhaustive similarity search or trademark clearance.'},null,2)+'\n');
const exceptions=['docs/CURRENT_STATUS.md','docs/SOURCE_OF_TRUTH.md','docs/IMPLEMENTATION_ROADMAP.md'];const paths=git(['ls-tree','-r','--name-only',base]).toString().trim().split('\n');let count=0;
for(const p of paths.filter(p=>!exceptions.includes(p))){assert.ok((await readFile(p)).equals(git(['show',`${base}:${p}`])),p);count++;}
const changed=git(['diff','--name-only',base]).toString().trim().split('\n').filter(Boolean);assert.ok(changed.every(p=>exceptions.includes(p)||p.startsWith(dir+'/')));
await writeFile(`${dir}/evidence/preservation.json`,JSON.stringify({base,pinnedPatient:pin,checkpoint:'ca0ff90ed834d328e68ec0ed0bcfba0ac317bfd8',baselineFiles:paths.length,byteIdenticalFiles:count,exceptions,scope:'All other pre-existing files, including production/auth/clinical/contracts/schema/migrations/CI/dependencies/historical candidates, byte-identical.'},null,2)+'\n');
const files=[];async function visit(p){for(const e of (await readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=p+'/'+e.name;if(e.isDirectory())await visit(f);else if(e.name!=='artifact-hashes.json')files.push({path:f.slice(dir.length+1),sha256:digest(await readFile(f))});}}await visit(dir);await writeFile(`${dir}/evidence/artifact-hashes.json`,JSON.stringify({algorithm:'SHA256',excludes:'this manifest',files},null,2)+'\n');
console.log(JSON.stringify({result:'PASS',cases:80,safeSVGs:30,smallSizes:36,textMinimum:Math.min(...contrast.map(p=>p.ratio)),preserved:count,artifacts:files.length}));
