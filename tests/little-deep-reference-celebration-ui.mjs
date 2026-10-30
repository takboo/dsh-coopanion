// Browser validation of a standalone local animation study, never a real Host session.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve(process.env.DSH_TEST_ARTIFACTS),url=process.env.DSH_CELEBRATION_URL??'http://127.0.0.1:4187/whale-little-deep-v3/reference-celebration-study.html';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true});
const report={status:'running',scope:'Independent reference-based Little Deep spout and celebration',cases:[]};
try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('canvas[data-rendered=true]').last().waitFor();
  const data=()=>page.locator('canvas').evaluateAll(es=>es.map(e=>({...e.dataset})));
  const seek=async t=>page.locator('#progress').evaluate((e,t)=>{e.value=String(Math.round(t*1000));e.dispatchEvent(new Event('input',{bubbles:true}));},t);
  const fit=async()=>{
    const b=await page.locator('canvas').evaluateAll(es=>es.map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,bg=Array.from(d.slice(0,3));let left=c.width,right=0,top=c.height,bottom=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(Math.max(...bg.map((v,k)=>Math.abs(d[i+k]-v)))>24){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
      return{size:c.dataset.size,w:c.width,h:c.height,left,right,top,bottom};}));
    for(const x of b)assert(x.left>2&&x.top>2&&x.right<x.w-3&&x.bottom<x.h-3,JSON.stringify(x));return b;
  };
  assert.deepEqual((await data()).map(x=>x.size),['300','150']);assert((await data()).every(x=>x.kind==='celebrate'&&x.time==='0'));report.cases.push('Normal 300 and configured actual 150 share one actor and exact 2:1 scale');
  for(const [t,name] of [[.12,'gather'],[.48,'peak'],[.95,'turn'],[1.45,'landing'],[2.4,'afterglow']]){
    await seek(t);const [a,b]=await data();assert.equal(a.time,b.time);assert.equal(a.actorTime,b.actorTime);assert.equal(Number(a.radius)/Number(b.radius),2);await page.locator('#motion-pair').screenshot({path:join(out,name+'.png')});
  }assert((await data()).every(x=>x.jets==='1'&&x.landings==='1'));report.cases.push('One launch jet, rainbow, turning and landing spray at shared keyframes');
  await seek(.20);assert((await data()).every(x=>x.rainbow==='0'));await seek(.65);assert((await data()).every(x=>Number(x.rainbow)>.8));
  await seek(1.80);assert((await data()).every(x=>Number(x.rainbow)>.95));await page.locator('#motion-pair').screenshot({path:join(out,'rainbow-light.png')});
  await seek(2.20);assert((await data()).every(x=>Number(x.rainbow)<.7&&Number(x.rainbow)>.05));await page.locator('#motion-pair').screenshot({path:join(out,'rainbow-fade.png')});
  await seek(2.65);assert((await data()).every(x=>Number(x.rainbow)<.05));report.cases.push('Spray triggers the light; the larger rainbow remains through falling water and fades afterward');
  for(const kind of ['celebrate','spout']){await page.locator('#action').selectOption(kind);const end=kind==='celebrate'?2.85:2.4;for(let i=0;i<=Math.ceil(end*10);i++){await seek(Math.min(end,i/10));await fit();}}
  report.cases.push('Whale, elastic streams, rainbow and ballistic drops stay within both frames across both clips');
  await page.locator('#action').selectOption('spout');await seek(.55);assert((await data()).every(x=>x.jets==='1'&&x.landings==='0'));await page.locator('#motion-pair').screenshot({path:join(out,'spout-first.png')});
  await seek(1.3);assert((await data()).every(x=>x.jets==='2'&&x.landings==='0'));await page.locator('#motion-pair').screenshot({path:join(out,'spout-second.png')});report.cases.push('Standalone spout uses two pulses without celebration or landing effects');
  const before=await data();await page.locator('#palette').selectOption('night');assert.deepEqual(await data(),before);await page.locator('#motion-pair').screenshot({path:join(out,'night.png')});
  await page.locator('#size').fill('180');await page.locator('#size').press('Tab');assert.equal((await data())[1].size,'180');assert.equal((await data())[1].actorTime,before[1].actorTime);await page.locator('#size').fill('150');await page.locator('#size').press('Tab');report.cases.push('Palette and actual-size changes preserve timeline, body and pressure');
  await page.locator('#action').selectOption('celebrate');await page.locator('#play').click();await page.waitForTimeout(600);await page.locator('#play').click();const paused=await data();assert(Number(paused[0].time)>.3);await page.waitForTimeout(180);assert.deepEqual(await data(),paused);
  await seek(2.7);await page.locator('#play').click();await page.waitForTimeout(450);const ended=await data();assert(ended.every(x=>x.time==='2.85'&&x.drops==='0'));await page.waitForTimeout(200);assert.deepEqual(await data(),ended);
  await page.locator('#blind').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('blind')));await page.locator('#blind').click();report.cases.push('Playback pauses, ends once without looping, and captions can be hidden');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('canvas[data-calm="true"]').last().waitFor();await seek(.48);assert((await data()).every(x=>Number(x.drops)<=3));await page.locator('#motion-pair').screenshot({path:join(out,'reduced-motion.png')});report.cases.push('Reduced motion keeps one outcome with lower jump and fewer drops');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('canvas[data-calm="false"]').last().waitFor();await page.locator('#size').fill('240');await page.locator('#size').press('Tab');
  for(const width of [920,860,480]){await page.setViewportSize({width,height:900});for(const kind of ['celebrate','spout']){await page.locator('#action').selectOption(kind);for(const t of [.3,.48,.7,1.3,1.5,1.8]){await seek(t);await fit();assert.equal((await data())[1].size,'240');}}}
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(out,'narrow-240.png'),fullPage:true});report.cases.push('Side-by-side and narrow layouts preserve actual 240 pixel sizing without clipping or overflow');
  assert.deepEqual(errors,[]);report.errors=errors;report.browser=await browser.version();report.status='pass';
}catch(e){report.status='fail';report.error=e.message;for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
