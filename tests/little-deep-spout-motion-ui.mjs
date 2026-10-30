// Independent browser study. No real Host, provider or role installation.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve(process.env.DSH_TEST_ARTIFACTS),url=process.env.DSH_SPOUT_URL??'http://127.0.0.1:4187/whale-little-deep-v3/spout-motion-study.html';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true});
const report={status:'running',scope:'Standalone paired spout clip; no real Host or provider',cases:[]};
try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('canvas[data-rendered=true]').last().waitFor();
  const data=()=>page.locator('canvas').evaluateAll(es=>es.map(e=>({...e.dataset})));
  const seek=async t=>page.locator('#progress').evaluate((e,t)=>{e.value=String(Math.round(t*1000));e.dispatchEvent(new Event('input',{bubbles:true}));},t);
  const fit=async()=>{
    const bounds=await page.locator('canvas').evaluateAll(es=>es.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,bg=Array.from(d.slice(0,3));let left=c.width,right=0,top=c.height,bottom=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(Math.max(...bg.map((v,k)=>Math.abs(d[i+k]-v)))>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
      return {size:c.dataset.size,w:c.width,h:c.height,left,right,top,bottom};}));
    for(const b of bounds)assert(b.left>2&&b.top>2&&b.right<b.w-3&&b.bottom<b.h-3,JSON.stringify(b));return bounds;
  };
  assert.deepEqual((await data()).map(x=>x.size),['300','150']);assert((await data()).every(x=>x.time==='0'));report.cases.push('300 and configured 150 use one timeline with exact 2:1 scale');
  for(const [time,name] of [[.3,'gather'],[1.3,'hold'],[2.25,'fall'],[3.5,'settle']]){
    await seek(time);const [a,b]=await data();assert.equal(a.time,b.time);assert.equal(a.actorTime,b.actorTime);assert.equal(Number(a.radius)/Number(b.radius),2);
    await page.locator('#motion-pair').screenshot({path:join(out,name+'.png')});
  }
  report.cases.push('Canonical keyframes and both views share actor time, phase and scale');
  for(const time of [.3,.6,1,1.3,1.65,1.85,2,2.25,2.5,2.6,2.7,2.85,3.2,4.1]){await seek(time);await fit();}
  report.cases.push('Whale and water remain within both frames across rise, hold and falling');
  await seek(1.3);const before=await data();await page.locator('#palette').selectOption('night');assert.deepEqual(await data(),before);await page.locator('#motion-pair').screenshot({path:join(out,'night.png')});
  await page.locator('#size').fill('180');await page.locator('#size').press('Tab');assert.equal((await data())[1].size,'180');assert.equal((await data())[1].actorTime,before[1].actorTime);await page.locator('#size').fill('150');await page.locator('#size').press('Tab');
  report.cases.push('Palette and actual-size changes preserve the current motion');
  await page.locator('#blind').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('blind')));await page.locator('#blind').click();
  await page.locator('#palette').selectOption('deep');await seek(0);await page.locator('#play').click();await page.waitForTimeout(750);await page.locator('#play').click();const paused=await data();assert(Number(paused[0].time)>.4);await page.waitForTimeout(200);assert.deepEqual(await data(),paused);
  await seek(4);await page.locator('#play').click();await page.waitForTimeout(400);const ended=await data();assert(ended.every(x=>x.time==='4.1'&&x.drops==='0'));await page.waitForTimeout(200);assert.deepEqual(await data(),ended);report.cases.push('Playback pauses, ends once and never loops; captions can be hidden');
  await page.emulateMedia({reducedMotion:'reduce'});await seek(1.3);assert((await data()).every(x=>x.drops==='6'));await page.locator('#motion-pair').screenshot({path:join(out,'reduced-motion.png')});report.cases.push('Reduced motion keeps the same readable outcome and timing');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:480,height:900});await page.locator('#size').fill('240');await page.locator('#size').press('Tab');
  for(const time of [1.3,2.25,2.6,2.7]){await seek(time);await fit();assert.equal((await data())[1].size,'240');}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(out,'narrow-240.png'),fullPage:true});report.cases.push('Narrow layout retains actual pixel size and clears water trajectories');
  assert.deepEqual(errors,[]);report.errors=errors;report.browser=await browser.version();report.status='pass';
}catch(e){report.status='fail';report.error=e.message;for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
