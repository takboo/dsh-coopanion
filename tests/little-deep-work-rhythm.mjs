import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
globalThis.HTMLElement??=class {};
const {createSessionReplay}=await import('../docs/design/art-workflow/whale-little-deep-v3/session-replay.js');
const {createWorkLoop}=await import('../docs/design/art-workflow/whale-little-deep-v3/work-loop.js');
const data=JSON.parse(readFileSync(new URL('../docs/design/art-workflow/whale-little-deep-v3/fixtures/session-d1e0a596.structure.json',import.meta.url),'utf8'));
const fact=mood=>({sessionId:'rhythm',mood,tools:mood==='working'?1:0,active:true,pending:[]});

test('accelerated source playback keeps the full whale through short work events instead of repeatedly diving',()=>{
  for(const speed of [8,16,32]) {
    const replay=createSessionReplay(data,{speed}),identity=replay.actor;let dives=0,last='',hidden=0,changes=0;
    while(!replay.view.finished){replay.advance(1/120);const motion=replay.view.motion;
      if(motion!==last){if(motion==='thinking')dives++;if(last)changes++;last=motion;}
      if(replay.actor.fxValue('hidden')>.5)hidden+=1/120;
      assert.equal(replay.actor,identity);
    }
    assert(dives<=2,`x${speed}: repeated short facts must not become repeated dives`);
    assert(hidden/replay.duration<.1,'At least 90% of this compressed work stays visibly whole');
    assert(changes<40,'Brief work bursts need readable phrases rather than the previous 85 switches');
    assert.equal(replay.view.processed,655);
  }
});

test('considering, doing and replying retain the same anatomy but have distinct attention and movement',()=>{
  const states={};
  for(const mood of ['thinking','working','talking']) {
    const loop=createWorkLoop({sessionId:'rhythm'});loop.sync(fact(mood));loop.advance(2);
    const a=loop.actor,samples=[];
    for(let i=0;i<120;i++){loop.advance(1/120);samples.push(a.fxValue('fin'));}
    assert(a.fxValue('hidden')<.01);assert(a.fxValue('eyesOpacity')>.99);assert.equal(a.shapeKey,'rest');
    states[mood]={lean:a.lean.value,finRange:Math.max(...samples)-Math.min(...samples),state:a.state};
  }
  assert.equal(states.thinking.state,'considering');assert.equal(states.working.state,'doing');assert.equal(states.talking.state,'replying');
  assert(states.working.lean<states.thinking.lean-.12,'Work leans down into the task');
  assert(states.talking.lean>states.working.lean+.10,'Reply lifts back toward the user');
  assert(states.working.finRange>states.talking.finRange*4,'Doing paddles; replying holds an open fin');
});

test('rapid tool round trips stay on the surface and always retain the latest facts',()=>{
  const loop=createWorkLoop({sessionId:'rhythm'}),identity=loop.actor;let dives=0;
  loop.actor.on(e=>{if(e.type==='play'&&e.id==='thinking')dives++;});
  for(let i=0;i<100;i++) {
    const mood=i%2?'thinking':'working';loop.sync(fact(mood));loop.advance(.03);
    assert.equal(loop.view.facts.mood,mood);assert.equal(loop.actor,identity);
  }
  assert.equal(dives,0);assert(loop.actor.fxValue('hidden')<.01);
  loop.sync(fact('talking'));loop.advance(.7);assert.equal(loop.view.motion,'replying');
  assert(loop.actor.fxValue('eyesOpacity')>.99);
  loop.sync({...fact('thinking'),tools:1});loop.advance(6);
  assert.equal(loop.view.motion,'doing','Silence with an outstanding tool is still tool work');assert(loop.actor.fxValue('hidden')<.01);
});

test('elapsed time alone cannot invent long thinking, and a request still immediately takes ownership',()=>{
  const loop=createWorkLoop({sessionId:'rhythm'});loop.sync({...fact('thinking'),atMs:100});loop.advance(30);
  assert.equal(loop.view.motion,'considering');assert.equal(loop.view.clocks.eventTimeMs,100);
  const seconds=loop.view.time;loop.advanceEventTime(60000);assert.equal(loop.view.time,seconds);assert.equal(loop.view.motion,'considering');
  const before=loop.actor.base.map(p=>({...p}));
  const question={id:'readable-question',sessionId:'rhythm',kind:'question',state:'open'};
  loop.sync({...fact('thinking'),pending:[question]});assert.equal(loop.view.motion,'request-study');assert.deepEqual(loop.actor.base,before);
  loop.advance(1.6);assert.equal(loop.view.symbol.progress,1);
  loop.sync(fact('thinking'));loop.advance(1);assert.equal(loop.view.motion,'considering');assert(loop.actor.fxValue('hidden')<.01);
  loop.advance(10);assert.equal(loop.view.motion,'considering','A settled request or silence cannot infer a dive');
});

test('event age and animation rhythm use independent clocks, including while hidden',()=>{
  const loop=createWorkLoop({sessionId:'rhythm'});loop.sync({...fact('working'),atMs:1000});loop.advance(.2);
  const physical=loop.actor.base.map(p=>({...p}));loop.advanceEventTime(101000);
  assert.equal(loop.view.clocks.eventPhaseAgeMs,100000);assert(Math.abs(loop.view.clocks.animationSeconds-.2)<1e-9);
  assert.deepEqual(loop.actor.base,physical);
  loop.setVisible(false);loop.sync({...fact('thinking'),atMs:102000});loop.advanceEventTime(105000);loop.advance(30);
  assert(Math.abs(loop.view.clocks.animationSeconds-.2)<1e-9);assert.equal(loop.view.clocks.eventPhaseAgeMs,3000);
  loop.setVisible(true);loop.advance(.5);assert.equal(loop.view.clocks.eventTimeMs,105000);
  assert.equal(loop.view.motion,'doing','Source age must not fast-forward the visual bridge');
  loop.advance(1.1);assert.equal(loop.view.motion,'considering');assert.throws(()=>loop.advanceEventTime(104000));
});

test('future events cannot change the performance of the same observed prefix',()=>{
  const cutoff=24,altered=structuredClone(data);
  for(const f of altered.facts)if(f.atMs>cutoff*8*1000){f.mood='working';f.tools=1;f.pending=[];delete f.completion;}
  altered.publicTextWindows=altered.publicTextWindows.filter(w=>w.fromMs<=cutoff*8*1000);
  const original=createSessionReplay(data),differentFuture=createSessionReplay(altered);
  original.advance(cutoff);differentFuture.advance(cutoff);
  assert.deepEqual(original.actor.base,differentFuture.actor.base);assert.deepEqual(original.actor.baseV,differentFuture.actor.baseV);
  assert.equal(original.actor.lean.value,differentFuture.actor.lean.value);assert.equal(original.view.motion,differentFuture.view.motion);
  assert.deepEqual(original.view.symbols,differentFuture.view.symbols);
});
