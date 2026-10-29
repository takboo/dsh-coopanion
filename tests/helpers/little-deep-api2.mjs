import assert from 'node:assert/strict';
import {join} from 'node:path';
import {importCharacter} from './characters.mjs';
import {recordBodyOrders} from './body-orders.mjs';
import {petClick} from './native-pointer.mjs';
export async function exerciseLittleDeep({page,send,zip,artifacts,native=false}) {
  const cases={},errors=[];page.on('pageerror',e=>errors.push(e.message));
  const frame=()=>page.locator('#body-layer iframe').contentFrame();
  const canvas=()=>frame().locator('canvas[data-state-protocol]');
  const runtime={phase:'running',visible:true,suspended:false,generation:1,visibilityRevision:1};
  let seq=0,stage='focus',active=true,sessionId='api2-focus-full',pending=[];
  const snapshot=()=>{const activity={id:JSON.stringify([sessionId,1]),stage,tools:stage==='tools'?1:0,seq:seq++,atMs:1000+seq};const s={id:sessionId,label:'隔离角色测试',mood:active?(stage==='tools'?'working':stage==='report'?'talking':'thinking'):'idle',active,revision:seq,activity};return {...s,sessionId,sessions:[s],results:[]};};
  const state=()=>send({type:'notification-state',snapshot:{protocol:1,runtime:{...runtime},interactions:pending}});
  const facts=()=>send({type:'snapshot',snapshot:snapshot()});
  const request=(kind,id)=>({id:JSON.stringify([sessionId,kind,id]),sessionId,nativeId:id,kind,state:'open',turn:1,seq:seq++,createdAt:1000,preview:'受控请求',dueAt:null,automaticReminders:0});
  async function manager(){
    if(native)await petClick(page,{button:'right'});else await page.locator('#pet').click({button:'right',force:true});
    await page.locator('#open-characters').click();
  }
  async function use(id){await page.locator('#character-select').selectOption(id);await page.waitForFunction(()=>!document.getElementById('character-use').disabled);await page.locator('#character-use').click();await page.waitForSelector(`#pet[data-character="${id}"][data-mode]`);await page.locator('#characters-close').click();}
  await page.waitForSelector('#pet[data-mode]');await manager();await importCharacter(page,zip);
  await page.waitForFunction(()=>document.getElementById('character-select').value==='little-deep-experimental'&&!document.getElementById('character-use').disabled);
  await use('little-deep-experimental');await state();await facts();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.characterUi),'1');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()),'#f4f7ff');
  await canvas().waitFor();await frame().locator('canvas[data-state-protocol="1"][data-shape="tail"]').waitFor();
  cases.importAndWork=true;
  const orders=await recordBodyOrders(page);
  for(let i=0;i<24;i++){stage=i%2?'focus':'tools';await facts();}
  await frame().locator('canvas[data-shape="rest"][data-phase="review"]').waitFor();assert.equal(await canvas().getAttribute('data-work-entries'),'1');cases.denseToolsKeepOneWorkSegment=true;
  pending=[request('question','question-native-full')];await state();
  await frame().locator('canvas[data-symbol="question"][data-symbol-progress="1"]').waitFor();
  pending.push(request('approval','approval-native-full'));await state();assert.equal(await canvas().getAttribute('data-symbol'),'question');
  pending=[pending[1]];await state();await frame().locator('canvas[data-symbol="approval"]').waitFor();
  assert.equal(await canvas().getAttribute('data-pending'),'1');cases.fullIdentityAndMixedRequests=true;
  stage='report';await facts();pending=[];await state();
  await frame().locator('canvas[data-phase="report"][data-symbol=""]').waitFor();assert.equal(await canvas().getAttribute('data-shape'),'rest');cases.latestReportAfterSettlement=true;
  stage='tools';await facts();await frame().locator('canvas[data-shape="rest"][data-phase="execute"]').waitFor();
  pending=[request('approval','approval-reject-full')];await state();await frame().locator('canvas[data-symbol="approval"][data-symbol-progress="1"]').waitFor();
  await page.screenshot({path:join(artifacts,native?'native-approval.png':'browser-approval.png')});
  runtime.visible=false;await state();const frozen=await canvas().getAttribute('data-actor-time');await page.waitForTimeout(250);
  assert.equal(await canvas().getAttribute('data-actor-time'),frozen);runtime.visible=true;runtime.visibilityRevision++;await state();
  assert.equal(await canvas().getAttribute('data-pending'),'1');cases.hiddenRestorationKeepsRequest=true;
  pending=[];await state();await frame().locator('canvas[data-shape="rest"][data-symbol=""][data-phase="execute"]').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});pending=[request('question','calm-request')];await state();
  await frame().locator('canvas[data-symbol="question"][data-symbol-progress="1"]').waitFor();pending=[];await state();
  await page.emulateMedia({reducedMotion:'no-preference'});cases.reducedMotionKeepsMeaning=true;
  for(const size of [90,150,240]){
    await send({type:'configure',options:{size,roam:false,companionship:'off',notifications:false}});
    await frame().locator(`canvas[data-size="${size}"]`).waitFor();
    const box=await page.locator('#pet').boundingBox();assert(box.width>0&&box.height>0);assert(box.width<=size*2.13&&box.height<=size*2.13);
  }
  cases.nativeSizeAndBounds=true;
  const before=await page.locator('#pet').boundingBox();
  await page.mouse.move(before.x+before.width*.5,before.y+before.height*.5);await page.mouse.down();
  await page.mouse.move(before.x+before.width*.5-90,before.y+before.height*.5-20,{steps:12});
  await page.waitForSelector('#pet[data-mode="drag"]');
  pending=[request('question','while-drag-full')];await state();await page.mouse.up();
  await page.waitForSelector('#pet[data-mode="idle"]');await frame().locator('canvas[data-pending="1"]').waitFor();
  pending=[];await state();await frame().locator('canvas[data-shape="rest"][data-symbol=""][data-phase="execute"]').waitFor();cases.dragWithRequestAndLanding=true;
  if(native)await petClick(page,{},true);else await page.locator('#pet').dblclick({force:true});await page.locator('#chat').waitFor({state:'visible'});
  assert.equal(await page.locator('#chat').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(244, 247, 255)');
  assert.equal(await page.locator('#chat').evaluate(n=>getComputedStyle(n).borderTopLeftRadius),'18px');
  await page.screenshot({path:join(artifacts,native?'native-character-ui.png':'browser-character-ui.png')});await page.locator('#chat-close').click();cases.declarativeCharacterUi=true;
  active=false;await facts();await frame().locator('canvas[data-phase="idle"]').waitFor();
  sessionId='api2-other-full';await facts();await state();assert.equal(await canvas().getAttribute('data-pending'),'0');cases.focusSwitchClearsOldRequest=true;
  const observed=await orders.evaluate(()=>window.bodyOrders.filter(o=>o.t==='set'&&o.state.companionState).map(o=>o.state.companionState));
  assert(observed.length>0);assert(!JSON.stringify(observed).includes('受控请求'));assert(!observed.some(v=>'text' in v||'preview' in v||'credentials' in v));cases.metadataOnly=true;
  await manager();await importCharacter(page,'paper-star.zip');await page.waitForFunction(()=>document.getElementById('character-select').value==='paper-star'&&!document.getElementById('character-use').disabled);await use('paper-star');
  const legacyOrders=await recordBodyOrders(page);active=true;stage='tools';await facts();
  await frame().locator('[data-face="determined"]').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.characterUi),undefined);
  assert.equal(await legacyOrders.evaluate(()=>window.bodyOrders.some(o=>o.t==='set'&&'companionState' in o.state)),false);cases.existingApi2PackUnchanged=true;
  assert.deepEqual(errors,[]);return {cases,errors,native,packageIntegration:'actual API 2 import and sandbox',facts:'controlled renderer snapshots; real-model Host is a separate test'};
}
