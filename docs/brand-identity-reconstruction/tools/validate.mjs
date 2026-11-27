/* global document, getComputedStyle, innerWidth */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const dir='docs/brand-identity-reconstruction',origin='http://127.0.0.1:8765';
assert.equal(createHash('sha256').update(await readFile(`${dir}/source/approved-board.png`)).digest('hex'),'0b99fbfb55ba1fcb1276b344fde138b0c48316937bcbad8ea950847bba9ee417');
const vectors=[];for(const name of (await readdir(`${dir}/assets`)).filter(n=>n.endsWith('.svg'))){const s=await readFile(`${dir}/assets/${name}`,'utf8');assert.ok(!/<(?:image|script|foreignObject)|(?:href|src)=|url\((?!#)/i.test(s),name);assert.match(s,/<title/);vectors.push(name);}
assert.equal(vectors.length,13);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const cases=[],errors=[],external=[],failed=[];
for(const name of ['index','fidelity'])for(const width of [1220,768,390,320])for(const scale of [1,2]){
 const p=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await p.route('**/*',r=>{const u=r.request().url();if(!u.startsWith(origin+'/')&&!u.startsWith('data:')){external.push(u);return r.abort();}return r.continue();});await p.goto(`${origin}/${dir}/${name}.html`);
 const result=await p.evaluate(scale=>{const direct=[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&!el.closest('svg')&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));if(scale===2)for(const {el,size} of direct)el.style.fontSize=size*2+'px';return {documentWidth:document.documentElement.scrollWidth,ratios:direct.map(({el,size})=>parseFloat(getComputedStyle(el).fontSize)/size),overflow:[...document.querySelectorAll('body *')].filter(el=>el.getClientRects().length&&!el.closest('svg')).filter(el=>el.getBoundingClientRect().left<-.75||el.getBoundingClientRect().right>innerWidth+.75).map(el=>el.tagName+'.'+el.className),brokenImages:[...document.images].filter(el=>!el.complete||!el.naturalWidth).map(el=>el.src),targets:[...document.querySelectorAll('a')].map(el=>({name:el.textContent.trim(),width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height})),mainCount:document.querySelectorAll('main').length,h1Count:document.querySelectorAll('h1').length};},scale);
 if(width===390&&scale===1){result.focus=[];for(const a of await p.locator('a').all()){await a.focus();result.focus.push(await a.evaluate(el=>({name:el.textContent,style:getComputedStyle(el).outlineStyle,width:getComputedStyle(el).outlineWidth})));}}
 cases.push({name,width,scale,...result});await p.close();
}
const dimensions=[];for(const [name,w,h] of [['app-icon-512',512,512],['favicon-32',32,32],['favicon-24',24,24],['favicon-16',16,16]]){const data=await readFile(`${dir}/evidence/${name}.png`);const actual=[data.readUInt32BE(16),data.readUInt32BE(20)];assert.deepEqual(actual,[w,h]);dimensions.push({name,width:w,height:h});}
await browser.close();const failures=cases.filter(c=>c.documentWidth!==c.width);
for(const c of cases){assert.ok(c.ratios.every(x=>Math.abs(x-c.scale)<.001));if(c.focus)assert.ok(c.focus.every(f=>f.style==='solid'&&f.width==='3px'));assert.equal(c.mainCount,1);assert.equal(c.h1Count,1);if(c.overflow.length||c.brokenImages.length)failures.push(c);assert.ok(c.targets.every(t=>t.name&&t.height>=44));}
await writeFile(`${dir}/evidence/validation.json`,JSON.stringify({browser:browser.version(),cases,vectors,dimensions,errors,external,failed,failures,method:'16 actual responsive proof-page cases with measured100%/200% direct text. Native PNG headers checked for512/32/24/16 dimensions. SVGs are self-contained path/gradient graphics. Automated checks are not visual fidelity or screen-reader certification.'},null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,svgCount:vectors.length,dimensions,failures,errors,external,failed},null,2));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
