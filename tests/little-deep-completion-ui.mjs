// Isolated browser verification of the actual storyboard controls and rendered canvases.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve(process.env.DSH_TEST_ARTIFACTS),url=process.env.DSH_COMPLETION_URL??'http://127.0.0.1:4187/whale-little-deep-v3/completion-study.html';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true});
const report={status:'running',scope:'Independent completion storyboard with accepted spray and rainbow; no real Host or provider',cases:[]};
try{
  const page=await browser.newPage({viewport:{width:1280,height:1200}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#goal-canvas[data-rendered="true"]').waitFor();
  const seek=async t=>page.locator('#progress').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},Math.round(t*1000));
  const data=async lane=>page.locator('#'+lane+'-canvas').evaluate(e=>({...e.dataset}));
  const fit=async()=>{
    const boxes=await page.locator('.pair-stage canvas,canvas[data-keyframe]').evaluateAll(es=>es.map(c=>{
      const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,bg=Array.from(d.slice(0,3));let left=c.width,right=0,top=c.height,bottom=0;
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(Math.max(...bg.map((v,k)=>Math.abs(d[i+k]-v)))>26){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
      return {id:c.id,size:c.dataset.size,w:c.width,h:c.height,left,right,top,bottom};
    }));for(const b of boxes)assert(b.left>2&&b.top>2&&b.right<b.w-3&&b.bottom<b.h-3,JSON.stringify(b));return boxes;
  };
  await seek(5.1);assert.equal((await data('goal')).spouts,'0');await seek(5.48);
  assert.equal((await data('reply')).spouts,'0');assert.equal((await data('goal')).spouts,'1');assert(Number((await data('goal')).rainbow)>.5);
  await seek(5.72);assert(Number((await data('goal')).rainbow)>.9);assert.equal((await data('reply')).rainbow,'0');
  assert.equal(await page.locator('canvas[data-keyframe]').count(),6);await fit();await page.screenshot({path:join(out,'normal-paired.png'),fullPage:true});
  report.cases.push('Ordinary replies close quietly; the confirmed goal uses the accepted spray and rainbow in the same-source storyboard');
  for(const size of ['300','150']){
    await page.locator('#size').selectOption(size);for(let i=0;i<=30;i++){await seek(5+i/10);await fit();}
    assert.equal((await data('goal')).size,size);await seek(5.72);await page.screenshot({path:join(out,size==='150'?'actual-paired.png':'normal-crest.png'),fullPage:true});
  }report.cases.push('Both lanes preserve matched 300 and actual 150 pixel sizing, with no clipping across the whole celebration');
  for(const at of [5.1,6,7.5])for(const route of ['new-work','question','approval','question-work','approval-work']){
    await page.locator('#route').selectOption(route);await page.locator('#interrupt-at').selectOption(String(at));await seek(at+.8);
    assert.equal((await data('goal')).spouts,at===5.1?'0':'1');assert.equal((await data('goal')).pending,route==='new-work'?'0':'1');
    assert(Number((await data('goal')).rainbow)<.05);await seek(at+3.7);
    assert.equal((await data('goal')).mode,route.includes('work')?'work':'life');assert.equal((await data('goal')).pending,'0');assert.equal((await data('goal')).spouts,at===5.1?'0':'1');
  }report.cases.push('All five interruption routes work before spray, during celebration and during afterglow; exits adopt the latest intent without replay');
  await page.locator('#route').selectOption('question-work');await page.locator('#interrupt-at').selectOption('6');await seek(6.18);await page.screenshot({path:join(out,'question-takeover.png'),fullPage:true});await seek(9.7);await page.screenshot({path:join(out,'work-resumed.png'),fullPage:true});
  await page.locator('#route').selectOption('none');await seek(16);await page.locator('#question').click();
  await page.waitForTimeout(1700);assert.equal((await data('goal')).pending,'1');assert.equal((await data('goal')).spouts,'1');
  await page.locator('#new-work').click();await page.locator('#stage').selectOption('tools');await page.locator('#settle').click();
  await page.waitForTimeout(800);assert.equal((await data('goal')).pending,'0');assert.equal((await data('goal')).mode,'work');assert.equal((await data('goal')).spouts,'1');
  await page.locator('#play').click();await page.locator('#repeat').click();await page.waitForTimeout(400);assert.equal((await data('goal')).spouts,'1');report.cases.push('Manual takeover remains usable after the score ends and consumes duplicate goal facts once');
  await page.locator('#route').selectOption('none');await seek(5.72);await page.locator('#palette').selectOption('night');const before=await data('goal');
  await page.locator('#play').click();await page.waitForTimeout(120);await page.locator('#play').click();assert(Number((await data('goal')).actorTime)>Number(before.actorTime));await fit();await page.screenshot({path:join(out,'night.png'),fullPage:true});report.cases.push('Night palette and pause retain the current actor and light');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);await page.locator('#route').selectOption('none');await seek(5.48);
  assert.equal((await data('goal')).spouts,'1');assert.equal((await data('goal')).rainbow,'0');await page.screenshot({path:join(out,'reduced-motion.png'),fullPage:true});report.cases.push('Reduced motion keeps one subdued outcome without rainbow');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#route').selectOption('none');await page.locator('#palette').selectOption('deep');
  for(const width of [860,480]){await page.setViewportSize({width,height:1200});await page.locator('#size').selectOption('150');await seek(5.72);await fit();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal((await data('goal')).size,'150');}
  await page.screenshot({path:join(out,'narrow.png'),fullPage:true});await page.locator('#blind').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('blind')));report.cases.push('Narrow and stacked layouts preserve the actual size and allow caption-free review');
  report.status='pass';report.browser=await browser.version();report.errors=errors;assert.deepEqual(errors,[]);
}catch(e){report.status='fail';report.error=e.message;for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
