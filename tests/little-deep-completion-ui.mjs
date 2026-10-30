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
  await seek(5.85);assert.equal((await data('reply')).spouts,'0');assert.equal((await data('goal')).spouts,'1');
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
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#route').selectOption('none');await seek(5.85);await page.locator('#palette').selectOption('night');assert.equal((await data('goal')).spouts,'1');
  await page.screenshot({path:join(out,'calm-night.png'),fullPage:true});report.cases.push('calm and palette retain visible outcome');
  await page.setViewportSize({width:480,height:900});await page.waitForTimeout(80);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:join(out,'narrow.png'),fullPage:true});
  await page.locator('#blind').click();assert(await page.locator('body').evaluate(e=>e.classList.contains('blind')));report.cases.push('narrow layout and hidden captions');assert.deepEqual(errors,[]);
  report.status='pass';report.browser=await browser.version();report.errors=errors;
}catch(e){report.status='fail';report.error=e.message;for(const p of browser.contexts().flatMap(c=>c.pages()))await p.screenshot({path:join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
finally{await writeFile(join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
console.log(JSON.stringify(report));
