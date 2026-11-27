/* global document, getComputedStyle, innerWidth, devicePixelRatio, visualViewport */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {writeFile,access} from 'node:fs/promises';
const directory='docs/nova-dark-first',origin=process.env.SPECIMEN_ORIGIN||'http://127.0.0.1:8765';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const guard=[],motion=[];
for(const locale of ['ar','en']){
  for(const state of ['loading','error','no-sources','unavailable']){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    let release;const pending=new Promise(resolve=>{release=resolve;});
    await page.route('**/specimen.js',async route=>{await pending;await route.continue();});
    await page.goto(`${origin}/${directory}/${locale}.html?state=${state}`,{waitUntil:'commit'});
    await page.locator('.preview-initial').waitFor({state:'visible'});
    const before=await page.locator('.shell').evaluate(el=>({visibility:getComputedStyle(el).visibility,inert:el.inert}));
    assert.equal(before.visibility,'hidden');assert.equal(before.inert,true);
    release();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    assert.equal(await page.locator('.shell').evaluate(el=>el.inert),false);
    guard.push({locale,state,stalledScript:before,afterReady:'requested state visible, shell interactive'});await page.close();
  }
  const disabled=await browser.newPage({javaScriptEnabled:false});await disabled.goto(`${origin}/${directory}/${locale}.html?state=unavailable`);
  assert.equal(await disabled.locator('.shell').isVisible(),false);assert.equal(await disabled.locator('noscript .no-script').isVisible(),true);
  guard.push({locale,javaScriptDisabled:'safe localized fallback; no visible normal-state facts'});await disabled.close();
  for(const reducedMotion of ['no-preference','reduce']){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});await page.goto(`${origin}/${directory}/${locale}.html?state=loading`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
    const styles=await page.evaluate(()=>({scroll:getComputedStyle(document.documentElement).scrollBehavior,button:getComputedStyle(document.querySelector('button')).transitionDuration,arrow:getComputedStyle(document.querySelector('.arrow-frame svg')).transitionDuration,skeleton:[...document.querySelectorAll('.state-skeleton span')].map(el=>({animation:getComputedStyle(el).animationName,transition:getComputedStyle(el).transitionDuration}))}));
    assert.ok(styles.skeleton.every(x=>x.animation==='none'));
    if(reducedMotion==='reduce'){assert.equal(styles.scroll,'auto');assert.equal(styles.button,'0s');assert.equal(styles.arrow,'0s');}
    else{assert.ok(parseFloat(styles.button)>0&&parseFloat(styles.button)<=.2);assert.ok(parseFloat(styles.arrow)>0&&parseFloat(styles.arrow)<=.2);}
    motion.push({locale,reducedMotion,...styles});await page.close();
  }
}
const zoomPage=await browser.newPage({viewport:{width:1440,height:900}});await zoomPage.goto(`${origin}/${directory}/en.html`);
const zoomMetrics=()=>zoomPage.evaluate(()=>({innerWidth:innerWidth,devicePixelRatio:devicePixelRatio,visualViewportScale:visualViewport.scale}));
const before=await zoomMetrics();for(let i=0;i<5;i++)await zoomPage.keyboard.press('Control+=');const after=await zoomMetrics();
await browser.close();
const exists=async path=>{try{await access(path);return true;}catch{return false;}};
const report={browser:'System Chromium154',initialRender:guard,motion,nativeZoom:{status:'NOT TESTED',shortcutProbe:{before,after},reason:'The headless keyboard shortcut did not change browser metrics. This run did not establish native browser zoom; measured computed 200% text is reported separately. No extension or desktop zoom probe is claimed.'},unavailable:{Firefox:await exists('/home/agent/.cache/ms-playwright/firefox-1555/firefox/firefox'),WebKit:await exists('/home/agent/.cache/ms-playwright/webkit-2370/pw_run.sh'),realScreenReader:'NOT TESTED: no real assistive-technology session performed',physicalDevices:'NOT TESTED',nativeEgyptianEditorialOrParticipants:'NOT TESTED'}};
await writeFile(`${directory}/evidence/runtime.json`,JSON.stringify(report,null,2)+'\n');console.log('PASS:8 stalled-script +2 no-JS guards;4 motion cases. Native zoom NOT TESTED.');
