// Isolated browser verification of the actual storyboard controls and rendered canvases.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const out=resolve(process.env.DSH_TEST_ARTIFACTS),url=process.env.DSH_COMPLETION_URL??'http://127.0.0.1:4187/whale-little-deep-v3/completion-study.html';
await mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??chromium.executablePath(),headless:true});
const report={status:'running',scope:'Independent storyboard browser; no real Host or provider',cases:[]};
try{
  const page=await browser.newPage({viewport:{width:1280,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#goal-canvas[data-rendered="true"]').waitFor();
  const seek=async t=>page.locator('#progress').evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},Math.round(t*1000));
  const data=async lane=>page.locator('#'+lane+'-canvas').evaluate(e=>({...e.dataset}));
  await seek(6.05);assert.equal((await data('reply')).spouts,'0');assert.equal((await data('goal')).spouts,'1');
  const waterFootprint=async locator=>locator.evaluate(c=>{
    const {data}=c.getContext('2d').getImageData(0,0,c.width,c.height);let n=0,x0=c.width,y0=c.height,x1=0,y1=0;
    for(let y=0;y<c.height*.55;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
      if(g>140&&g>b*.60&&g-r>45&&b-r>50){n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
    return {pixels:n,ratio:n/(c.width*c.height),height:(y1-y0)/c.height,width:(x1-x0)/c.width,top:y0/c.height};
  });
  const footprint=await waterFootprint(page.locator('#goal-canvas')),small=await waterFootprint(page.locator('#goal-board canvas').nth(1));
  assert(footprint.ratio>.0025&&footprint.height>.20&&footprint.width>.15&&footprint.top>.02,JSON.stringify(footprint));
  assert(small.ratio>.0025&&small.height>.20&&small.top>.02,JSON.stringify(small));
  assert.equal((await waterFootprint(page.locator('#reply-canvas'))).pixels,0);report.waterFootprint={large:footprint,compact:small};report.cases.push('visible water column and spread at large and compact sizes, without top clipping');
  assert.equal(await page.locator('canvas[data-keyframe]').count(),6);await page.screenshot({path:join(out,'reply-vs-complete.png'),fullPage:true});report.cases.push('actual paired canvas and same-source storyboard frames');
  for(const route of ['new-work','question','approval','question-work','approval-work']){
    await page.locator('#route').selectOption(route);await page.locator('#interrupt-at').selectOption('5.2');await seek(7.5);
    assert.equal((await data('goal')).spouts,'0');assert.equal((await data('goal')).pending,route==='new-work'?'0':'1');
    await seek(9.5);assert.equal((await data('goal')).mode,route.includes('work')?'work':'life');assert.equal((await data('goal')).spouts,'0');
    report.cases.push(route+' cancels unplayed celebration and exits to latest intent');
  }
  await page.locator('#route').selectOption('question-work');await page.locator('#interrupt-at').selectOption('6');await seek(8);
  await page.screenshot({path:join(out,'request-owns-current-pose.png'),fullPage:true});
  await page.locator('#route').selectOption('none');await seek(16);await page.locator('#question').click();
  await page.waitForTimeout(1700);assert.equal((await data('goal')).pending,'1');assert.equal((await data('goal')).spouts,'1');
  await page.locator('#new-work').click();await page.locator('#stage').selectOption('tools');await page.locator('#settle').click();
  await page.waitForTimeout(800);assert.equal((await data('goal')).pending,'0');assert.equal((await data('goal')).mode,'work');assert.equal((await data('goal')).spouts,'1');
  await page.locator('#play').click();await page.locator('#repeat').click();await page.waitForTimeout(400);assert.equal((await data('goal')).spouts,'1');report.cases.push('manual controls work after score end; duplicate goal never replays');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#route').selectOption('none');await seek(6.05);await page.locator('#palette').selectOption('night');assert.equal((await data('goal')).spouts,'1');
  await page.screenshot({path:join(out,'calm-night.png'),fullPage:true});report.cases.push('calm and palette retain visible outcome');
  await page.setViewportSize({width:480,height:900});await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(out,'narrow.png'),fullPage:true});
  await page.locator('#blind').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('blind')));report.cases.push('narrow layout and hidden captions');assert.deepEqual(errors,[]);
  report.status='pass';report.browser=await browser.version();report.errors=errors;
}catch(e){report.status='fail';report.error=e.message;for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
