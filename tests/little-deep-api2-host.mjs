// Actual published DSH installation + native character + authenticated provider run.
// The token is read from the process environment and never written to profiles or evidence.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url),{CharacterStore}=require('../dist/character-store.cjs');
const runtime=resolve(process.env.DSH_TEST_RUNTIME),archive=resolve(process.env.DSH_TEST_PACKAGE),zip=resolve(process.env.DSH_CHARACTER_ZIP);
const output=resolve(process.env.DSH_TEST_ARTIFACTS);await mkdir(output,{recursive:true});
const token=process.env.OPENCODE_API_KEY;assert(token,'Provide the temporary provider token through the environment');
const root=await mkdtemp(join(tmpdir(),'little-deep-real-host-')),home=join(root,'home'),profileName='little-deep-test',profile=join(home,'profiles',profileName),petDir=join(root,'pet');
const sanitize=text=>String(text).split(token).join('[REDACTED]');
const env={...process.env,PATH:resolve('node_modules/.bin')+':'+process.env.PATH,DSH_HOME:home,DSH_TELEMETRY_DISABLED:'1',XDG_CONFIG_HOME:root,XDG_CACHE_HOME:join(root,'cache'),XDG_DATA_HOME:join(root,'data'),XDG_STATE_HOME:join(root,'state'),DSH_PET_TEST_DATA_DIR:petDir,COOPANION_TEST_MODULES:join(runtime,'node_modules'),COOPANION_PROBE_CWD:join(root,'work'),NPM_CONFIG_LOGLEVEL:'error',npm_config_cache:join(process.env.HOME,'dsh-testing/npm-cache')};
delete env.DSH_PET_TEST_NO_SANDBOX;
const cli=join(runtime,'node_modules/@deepseek-ai/dsh/lib/bin.js');let host,browser,hostLog='',page;const messages=[],trace=[];
const report={privateGuestRoot:root,scope:'Actual published Host + real provider + native API 2 character',provider:'opencode-go',model:'deepseek-v4.1-flash',hostVersion:JSON.parse(await readFile(join(runtime,'node_modules/@deepseek-ai/dsh/package.json'))).version,pluginSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),characterSha256:createHash('sha256').update(await readFile(zip)).digest('hex'),trace,cases:{}};
async function run(args){const child=spawn(process.execPath,[cli,...args],{cwd:root,env,stdio:['ignore','pipe','pipe']});let text='';child.stdout.on('data',d=>text+=d);child.stderr.on('data',d=>text+=d);const [code]=await once(child,'exit');if(code!==0)throw new Error('DSH command failed: '+sanitize(text).slice(-2000));}
async function waitMessage(type,timeout=90000){const end=Date.now()+timeout;while(Date.now()<end){const failure=messages.find(m=>m.type==='probe-error');if(failure)throw new Error(JSON.stringify(failure));const ended=messages.find(m=>m.type==='probe-ended');if(ended&&type!=='probe-ended')throw new Error('Model turn ended before '+type+': '+JSON.stringify(ended.stats));const i=messages.findIndex(m=>m.type===type);if(i>=0)return messages.splice(i,1)[0];if(host?.exitCode!==null&&host?.exitCode!==undefined)throw new Error('Host exited before '+type);await new Promise(r=>setTimeout(r,50));}throw new Error('Timed out waiting for '+type);}
try{
  await mkdir(join(root,'work'),{recursive:true});await writeFile(join(root,'work/probe.txt'),'Little Deep isolated probe\n');
  await run(['--profile',profileName,'--from-default-profile','web','--dump-config']);
  await run(['plugin','--profile',profileName,'add',archive]);report.cases.publishedProfileInstall=true;
  const installed=join(profile,'node_modules/@takboo/dsh-coopanion');
  assert.equal(JSON.parse(await readFile(join(installed,'package.json'))).version,JSON.parse(await readFile('package.json')).version);
  const observer=join(root,'observer');await mkdir(observer);await writeFile(join(observer,'package.json'),JSON.stringify({name:'little-deep-real-observer',private:true,type:'module'}));
  const fixture=join(observer,'host.mjs');await writeFile(fixture,await readFile('tests/fixtures/little-deep-live-host.mjs'));
  const electron=require('electron');
  await writeFile(join(profile,'cordis.patch.yml'),`- insert:\n    - id: little-deep-real-observer\n      name: ${JSON.stringify(fixture)}\n- id: llm-pi-ai\n  config:\n    providers:\n      opencode-go:\n        apiKeyEnv: OPENCODE_API_KEY\n- id: ui-settings-models\n  config:\n    credentialOnboarding: false\n- id: dsh-coopanion\n  config:\n    autoStart: true\n    electronPath: ${JSON.stringify(electron)}\n    size: 180\n    roam: false\n    companionship: off\n    notifications: false\n`);
  const store=new CharacterStore(join(petDir,'figures-v2'),resolve('web/upstream/whale'));await store.import(await readFile(zip));await store.select('little-deep-experimental','deep');
  const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');env.DSH_PET_TEST_DEBUG_PORT=String(listener.address().port);await new Promise(r=>listener.close(r));
  host=spawn(process.execPath,[cli,'--profile',profileName,'--no-open','--port','0'],{cwd:root,env,detached:true,stdio:['ignore','pipe','pipe','ipc']});
  const collect=d=>{hostLog=(hostLog+sanitize(d.toString())).slice(-24000);};host.stdout.on('data',collect);host.stderr.on('data',collect);host.on('message',m=>messages.push(m));
  await waitMessage('probe-ready',120000);
  let last;
  for(let i=0;i<100;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+env.DSH_PET_TEST_DEBUG_PORT);break;}catch(error){last=error;await new Promise(r=>setTimeout(r,150));}}
  assert(browser,'Native debug endpoint was not ready');page=browser.contexts()[0].pages()[0];page.setDefaultTimeout(15000);
  await page.waitForSelector('#pet[data-character="little-deep-experimental"][data-mode]');const frame=()=>page.locator('#body-layer iframe').contentFrame(),canvas=()=>frame().locator('canvas[data-state-protocol="1"]');
  host.send({type:'probe-prepare'});const prepared=await waitMessage('probe-prepared');
  // Keep chat on the idle conversation. The newly started agent must still drive the character.
  await page.evaluate(id=>window.dshPetBridge.action({type:'select',sessionId:id}),prepared.previousId);
  await canvas().waitFor();
  const sandbox=await frame().locator('body').evaluate(()=>({node:typeof process,bridge:typeof window.dshPetBridge}));assert.deepEqual(sandbox,{node:'undefined',bridge:'undefined'});report.cases.normalSandbox=true;
  host.send({type:'probe-run'});await waitMessage('probe-started');
  const settledWork=()=>frame().locator('canvas[data-shape="tail"][data-symbol=""][data-phase="focus"],canvas[data-shape="rest"][data-symbol=""][data-phase="execute"],canvas[data-shape="rest"][data-symbol=""][data-phase="review"]');
  await settledWork().waitFor({timeout:45000});report.cases.realWorkSegment=true;
  assert.equal(await page.locator('#pet').getAttribute('data-presentation-session'),prepared.sessionId);
  assert.equal(await page.locator('#conversation-list [aria-selected="true"]').getAttribute('data-session-id'),prepared.previousId);
  report.cases.newWorkDoesNotRequireChangingChat=true;
  assert.equal(await canvas().getAttribute('data-work-entries'),'1');
  await page.screenshot({path:join(output,'real-work.png')});
  for(let i=0;i<2;i++){
    const question=await waitMessage('probe-question',180000);await frame().locator('canvas[data-symbol="question"][data-symbol-progress="1"]').waitFor();
    trace.push({kind:'question',requestId:question.requestId,phase:await canvas().getAttribute('data-phase'),pending:await canvas().getAttribute('data-pending'),workEntries:await canvas().getAttribute('data-work-entries')});
    assert.equal(trace.at(-1).workEntries,'1');assert(question.requestId);if(i===1)assert.notEqual(question.requestId,trace[0].requestId);
    await page.screenshot({path:join(output,`real-question-${i+1}.png`)});host.send({type:'probe-answer',id:question.id});
    if(i===0){
      await settledWork().waitFor();await page.screenshot({path:join(output,'real-resume-after-question.png')});report.cases.questionExitResumesWork=true;
      const approval=await waitMessage('probe-approval',180000);await frame().locator('canvas[data-symbol="approval"][data-symbol-progress="1"]').waitFor();await page.screenshot({path:join(output,'real-approval.png')});trace.push({kind:'approval',pending:await canvas().getAttribute('data-pending')});host.send({type:'probe-reject',id:approval.id});
      await settledWork().waitFor();await page.screenshot({path:join(output,'real-resume-after-approval.png')});report.cases.approvalExitResumesWork=true;
    }
  }
  const ended=await waitMessage('probe-ended',180000);await frame().locator('canvas[data-phase="idle"][data-shape="rest"][data-pending="0"][data-symbol=""]').waitFor();
  report.stats=ended.stats;
  // Let the pose springs settle for the final evidence frame; this is not an event classification threshold.
  await page.waitForTimeout(1500);
  await page.screenshot({path:join(output,'real-turn-ended.png')});
  assert(ended.stats.streamFrames>0);assert(ended.stats.toolCalls>=12);assert.equal(ended.stats.questions,2);assert.equal(ended.stats.approvalAsked,1);assert.equal(ended.stats.approvalDecided,1);assert.equal(ended.stats.turnEnd,'completed');assert(ended.stats.providers.includes('opencode-go/deepseek-v4.1-flash'));
  assert.equal(await canvas().getAttribute('data-work-entries'),'1');report.cases.sameWorkIdentityThroughRequests=true;
  report.stats=ended.stats;report.trace=trace;report.cases.realQuestionAnswerAndNewIdentity=true;report.cases.realApprovalRejectedAndContinued=true;report.cases.realTurnEndReturnsToRest=true;
  report.privateGuestRoot=root;report.electron=await page.evaluate(()=>navigator.userAgent);report.status='pass';
}catch(error){report.status='fail';report.error=sanitize(error.message);if(page)await page.screenshot({path:join(output,'failure.png')}).catch(()=>{});throw error;}
finally{
  await writeFile(join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(output,'host.log'),sanitize(hostLog));
  if(host?.connected)host.send({type:'shutdown-host'});if(host){await Promise.race([once(host,'exit'),new Promise(r=>setTimeout(r,5000))]);if(host.exitCode===null){try{process.kill(-host.pid,'SIGTERM');}catch{host.kill('SIGTERM');}}}
  await browser?.close().catch(()=>{});delete env.OPENCODE_API_KEY; // Preserve the private test profile and unique session log in the guest.
}
console.log(JSON.stringify(report));
