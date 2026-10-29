import assert from 'node:assert/strict';
import test from 'node:test';
import {parseGrowingLog,projectLiveEvents} from '../scripts/watch-little-deep-session.mjs';
const header={type:'session',id:'live-test',version:4,createdAt:1000,cwd:'/tmp'};
const event=(seq,type,data)=>({seq,type,time:1100+seq*100,data});
const initial=[event(0,'turn/start',{turn:1}),event(1,'request/header',{header:{tools:[]}}),
  event(2,'tool/call',{turn:1,step:1,name:'ask_user_question',callId:'exact-question',arguments:JSON.stringify({questions:[{question:'PRIVATE_QUESTION'}]})})];

test('legacy blocking questions keep exact native identity until their own tool span settles',()=>{
  const first=projectLiveEvents(header,initial);assert.equal(first.facts.at(-1).pending.length,1);
  const request=first.facts.at(-1).pending[0];assert.equal(request.observation,'blocking-tool-span');assert(request.id.includes('exact-question'));
  const unrelated=event(3,'tool/result',{turn:1,step:1,message:{toolCallId:'unrelated',isError:false,content:[{type:'text',text:'PRIVATE_RESULT'}]}});
  assert.equal(projectLiveEvents(header,[...initial,unrelated]).facts.at(-1).pending.length,1);
  const matching=event(4,'tool/result',{turn:1,step:1,message:{toolCallId:'exact-question',isError:false,content:[]}});
  const settled=projectLiveEvents(header,[...initial,unrelated,matching]);assert.equal(settled.facts.at(-1).pending.length,0);
  assert(!JSON.stringify(settled).includes('PRIVATE_'));
});

test('approval observations settle only their exact id and remain independent from a question',()=>{
  const asked=event(3,'approval/asked',{turn:1,step:1,id:'approval-full-native-id',toolName:'bash',reason:'PRIVATE_REASON'});
  const wrong=event(4,'approval/decided',{id:'approval-full-native',decision:{kind:'allow-once'}});
  const pending=projectLiveEvents(header,[...initial,asked,wrong]).facts.at(-1).pending;
  assert.equal(pending.length,2);
  const decided=event(5,'approval/decided',{id:'approval-full-native-id',decision:{kind:'allow-once'}});
  const result=projectLiveEvents(header,[...initial,asked,wrong,decided]);assert.equal(result.facts.at(-1).pending.length,1);
  assert.equal(result.facts.at(-1).pending[0].kind,'question');assert(!JSON.stringify(result).includes('PRIVATE_'));
});

test('a partial append is not an event, and malformed private input is never echoed',()=>{
  const prefix=[header,...initial].map(JSON.stringify).join('\n')+'\n';
  assert.equal(parseGrowingLog(prefix+'{"seq":3,"PRIVATE_',header.id).events.length,3);
  assert.throws(()=>parseGrowingLog(prefix+'PRIVATE_INVALID_JSON\n',header.id),error=>!error.message.includes('PRIVATE_'));
  assert.throws(()=>parseGrowingLog(prefix,'another-session'));
  const broken=[header,initial[0],{...initial[1],seq:3}].map(JSON.stringify).join('\n')+'\n';assert.throws(()=>parseGrowingLog(broken,header.id));
});
