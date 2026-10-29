import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

globalThis.HTMLElement??=class {};
const {createSessionReplay,validateStructure}=await import('../docs/design/art-workflow/whale-little-deep-v3/session-replay.js');
const {createWorkLoop,MOTION_HOLD}=await import('../docs/design/art-workflow/whale-little-deep-v3/work-loop.js');
const data=JSON.parse(readFileSync(new URL('../docs/design/art-workflow/whale-little-deep-v3/fixtures/session-d1e0a596.structure.json',import.meta.url),'utf8'));
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.height,a.vy,
  a.fxValue('hidden'),a.fxValue('eyesOpacity'),...a.base.flatMap(p=>[p.x,p.y]),...a.baseV.flatMap(p=>[p.x,p.y])];
const fact=(mood,pending=[])=>({sessionId:'test-session',mood,pending,active:true,tools:mood==='working'?1:0});
const request={id:'exact-question',sessionId:'test-session',kind:'question',state:'open'};

test('the checked session fixture retains every source event and no conversational payload',()=>{
  assert.equal(validateStructure(data),data);assert.equal(data.facts.length,655);
  assert.equal(data.counts['step/start'],59);assert.equal(data.counts['tool/call'],109);
  assert.equal(data.source.sha256,'2c5fca709720f9d788f7dbe2459fb39ebd2f7ab83b53184d4f8b2fba35bc33f8');
  assert.equal(data.projection.moodChanges,228);
  assert(data.facts.every(f=>f.pending.every(p=>p.kind==='approval')),'The source does not invent a question branch');
  assert(!/"(?:text|content|arguments|preview|reasoning|objective)"\s*:/.test(JSON.stringify(data)));
  assert.equal(data.facts.at(-1).completion.category,'completed');
});

test('source replay repeats work with one continuous actor while facts and motion remain independently observable',()=>{
  const replay=createSessionReplay(data),actor=replay.actor;let changes=0,previousMotion='',previous=actor.base.map(p=>({...p}));
  for(let i=0;i<Math.ceil(replay.duration*120);i++) {
    replay.advance(1/120);assert.equal(replay.actor,actor);const v=replay.view;
    if(v.motion!==previousMotion){changes++;previousMotion=v.motion;}
    actor.base.forEach((p,j)=>{assert(Math.abs(p.x-previous[j].x)<.16);assert(Math.abs(p.y-previous[j].y)<.16);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));});
    previous=actor.base.map(p=>({...p}));assert.equal(actor.onceId,null);
  }
  assert.equal(replay.view.processed,655);assert.equal(replay.view.fact.errors,5);assert.equal(replay.view.fact.step,59);
  assert(changes>10&&changes<data.projection.moodChanges,'Short changes coalesce without deleting the work loop');
  assert.equal(replay.view.terminalPending,true);assert.equal(replay.view.completion.category,'completed');
});

test('the latest queued motion wins, and a request preempts a held posture without resetting physical state',()=>{
  const loop=createWorkLoop({sessionId:'test-session'});loop.sync(fact('working'));loop.advance(.02);
  loop.sync(fact('thinking'));assert.equal(loop.view.facts.mood,'thinking');assert.equal(loop.view.motion,'doing');
  loop.sync(fact('working'));loop.advance(MOTION_HOLD+1);assert.equal(loop.view.motion,'doing');
  loop.sync(fact('thinking'));loop.advance(.02);const before=frame(loop.actor);
  loop.sync(fact('waiting',[request]));assert.equal(loop.view.motion,'request-study');assert.deepEqual(frame(loop.actor),before);
  loop.advance(.7);const mark=loop.view.symbol.progress;loop.sync(fact('waiting',[request]));assert.equal(loop.view.symbol.progress,mark);
  loop.sync(fact('talking'));assert.equal(loop.view.motion,'replying');loop.advance(1);assert.equal(loop.view.motion,'replying');
});

test('historical approval settles only at its source event and an optional question remains explicitly simulated',()=>{
  const replay=createSessionReplay(data),asked=replay.landmarks.find(l=>l.seq===373),decided=replay.landmarks.find(l=>l.seq===374);
  replay.seek(asked.time+.5);assert.equal(replay.view.symbol.kind,'approval');
  const realId=replay.view.pendingIds[0];assert.throws(()=>replay.settleSynthetic(realId));
  const simulated=replay.inject('question');assert.equal(replay.view.pendingIds.length,2);
  replay.advance(decided.time+.2-replay.time);
  assert.deepEqual(replay.view.pendingIds,[simulated]);assert.equal(replay.view.symbol.kind,'question');
  assert.equal(replay.view.fact.pending.length,0);replay.settleSynthetic(simulated);replay.advance(.4);
  assert.equal(replay.view.symbols.length,0);assert.equal(data.facts[373].pending.length,1);
});

test('process text and local tool errors do not end the turn or trigger a celebration',()=>{
  const replay=createSessionReplay(data),window=data.publicTextWindows.find(w=>w.seq===633);
  replay.seek((window.fromMs+window.toMs)/2000/8);
  assert.equal(replay.view.textPhase.seq,633);
  assert.equal(replay.view.fact.mood,'talking');assert.equal(replay.view.fact.active,true);assert.equal(replay.view.completion,null);
  replay.advance(replay.landmarks.find(l=>l.seq===640).time-replay.time);
  assert(replay.view.fact.seq>=640);assert.equal(replay.view.fact.active,true);assert.equal(replay.actor.onceId,null);
  replay.seek(replay.landmarks.find(l=>l.seq===246).time);
  assert.equal(replay.view.fact.errors,1);assert.notEqual(replay.view.fact.mood,'error');assert.equal(replay.view.terminalPending,false);
});

test('seeking reconstructs the same body and markers as uninterrupted replay with variable frame sizes',()=>{
  const live=createSessionReplay(data);const identity=live.actor;
  for(const target of [3,18,33,34.5,43,68,74.8,live.duration]) {
    let i=0;while(live.time<target-1e-9)live.advance(Math.min(target-live.time,[.013,.031,.05,.007][i++%4]));
    const sought=createSessionReplay(data);sought.seek(target);
    assert.equal(live.actor,identity);assert.equal(live.view.fact.seq,sought.view.fact.seq);
    frame(live.actor).forEach((value,j)=>assert(Math.abs(value-frame(sought.actor)[j])<1e-8));
    assert.deepEqual(live.view.symbols,sought.view.symbols);
  }
});

test('hidden replay freezes source time and reduced motion retains source and simulated request identity',()=>{
  const replay=createSessionReplay(data,{calm:true});replay.seek(replay.landmarks.find(l=>l.seq===373).time+.1);
  const before=frame(replay.actor),time=replay.time;replay.setVisible(false);replay.advance(60);
  assert.equal(replay.time,time);assert.deepEqual(frame(replay.actor),before);replay.setVisible(true);
  assert.equal(replay.view.symbol.progress,1);assert.equal(replay.view.symbol.tremor,0);
  const id=replay.inject('question');replay.setPalette('night');assert(replay.view.pendingIds.includes(id));
  replay.seek(0);assert.equal(replay.view.syntheticIds.length,0,'Viewing reset cannot resurrect a manual branch');
});

test('all supported speeds consume the complete structure and malformed identity or ordering is rejected',()=>{
  for(const speed of [1,8,16,32]){const replay=createSessionReplay(data,{speed});replay.advance(replay.duration);assert.equal(replay.view.processed,655);assert.equal(replay.view.fact.seq,654);}
  const broken=structuredClone(data);broken.facts[10].seq=9;assert.throws(()=>validateStructure(broken));
  const foreign=structuredClone(data);foreign.facts[373].pending[0].sessionId='other';assert.throws(()=>validateStructure(foreign));
  const timing=structuredClone(data);timing.publicTextWindows[0].toMs=data.source.durationMs+1;assert.throws(()=>validateStructure(timing));
  assert.throws(()=>createSessionReplay(data,{speed:0}));
});

test('the extraction command drops text, reasoning and tool payloads while preserving source identity',()=>{
  const directory=mkdtempSync(join(tmpdir(),'little-deep-extraction-'));
  try {
    const header={type:'session',version:4,id:'test-private-session',createdAt:0,cwd:'/private/tmp'};
    const event=(seq,type,data)=>({seq,time:1000+seq*100,type,data});
    const records=[header,event(0,'turn/start',{turn:1}),event(1,'step/start',{turn:1,step:1}),
      event(2,'user/message',{source:{kind:'user'},content:[{type:'text',text:'PRIVATE_USER_TEXT'}]}),
      event(3,'assistant/message',{turn:1,step:1,message:{content:[{type:'reasoning',text:'PRIVATE_REASONING'},{type:'text',text:'PRIVATE_REPLY'},{type:'tool-call',name:'bash',id:'call-1',arguments:'PRIVATE_ARGUMENTS'}]}}),
      event(4,'tool/call',{turn:1,step:1,name:'bash',callId:'call-1',arguments:'PRIVATE_ARGUMENTS'}),
      event(5,'tool/result',{turn:1,step:1,message:{toolCallId:'call-1',isError:false,content:[{type:'text',text:'PRIVATE_RESULT'}]}}),
      event(6,'turn/end',{turn:1,reason:{kind:'completed'}})];
    const source=join(directory,'source.jsonl'),output=join(directory,'structure.json');writeFileSync(source,records.map(r=>JSON.stringify(r)).join('\n')+'\n');
    execFileSync(process.execPath,['--experimental-transform-types','scripts/prepare-little-deep-session.mjs','--source',source,'--output',output],{stdio:'pipe'});
    const text=readFileSync(output,'utf8');assert(!text.includes('PRIVATE_'));const structure=JSON.parse(text);
    assert.equal(structure.sessionId,header.id);assert.equal(structure.facts.length,7);assert.equal(structure.facts.at(-1).completion.category,'reply');
    assert.equal(readFileSync(source,'utf8'),records.map(r=>JSON.stringify(r)).join('\n')+'\n');
    writeFileSync(source,'PRIVATE_INVALID_JSON');
    assert.throws(()=>execFileSync(process.execPath,['--experimental-transform-types','scripts/prepare-little-deep-session.mjs','--source',source,'--output',join(directory,'bad.json')],{stdio:'pipe'}),
      error=>!String(error.stderr).includes('PRIVATE_INVALID_JSON'),'A parse error must not echo private input');
  } finally {rmSync(directory,{recursive:true,force:true});}
});
