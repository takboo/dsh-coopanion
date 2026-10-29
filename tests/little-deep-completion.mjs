import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
globalThis.HTMLElement??=class {};
const {createSessionReplay}=await import('../docs/design/art-workflow/whale-little-deep-v3/session-replay.js');
const {createWorkLoop,GOAL_TIMING}=await import('../docs/design/art-workflow/whale-little-deep-v3/work-loop.js');
const data=JSON.parse(readFileSync(new URL('../docs/design/art-workflow/whale-little-deep-v3/fixtures/session-d1e0a596.structure.json',import.meta.url),'utf8'));
const done={sessionId:'goal-test',mood:'happy',active:false,tools:0,pending:[],completion:{category:'completed',goal:{id:'goal/full',revision:2,round:0}}};

test('the actual mid-turn goal event does not celebrate; shared completed at the end starts one continuous finish',()=>{
  const replay=createSessionReplay(data,{completionBranch:true}),actor=replay.actor,plays=[];actor.on(e=>{if(e.type==='play')plays.push(e.id);});
  replay.advance(replay.landmarks.find(l=>l.seq===338).time+1);assert(!plays.includes('done'));
  replay.advance(replay.landmarks.find(l=>l.seq===654).time-replay.time);
  assert.equal(replay.view.finishPhase,'prepare');assert.equal(replay.actor,actor);
  replay.advance(.8);assert.equal(replay.view.finishPhase,'celebrate');assert(actor.particles.some(p=>p.kind==='drop'));
  replay.advance(replay.duration);assert.equal(replay.actor,actor);assert.equal(actor.state,'idle');
  assert.equal(plays.filter(id=>id==='done').length,1);assert.equal(replay.view.completion.category,'completed');
});

test('only a confirmed complete goal identity can celebrate, and repeated snapshots never replay it',()=>{
  for(const category of ['reply','goal-progress']) {
    const loop=createWorkLoop({sessionId:'goal-test',completionBranch:true});loop.sync({...done,completion:{...done.completion,category}});loop.advance(5);
    assert.equal(loop.actor.onceId,null);assert(!loop.actor.particles.some(p=>p.kind==='drop'));
  }
  const loop=createWorkLoop({sessionId:'goal-test',completionBranch:true}),plays=[];loop.actor.on(e=>{if(e.type==='play')plays.push(e.id);});
  loop.sync(done);loop.advance(.5);loop.sync(structuredClone(done));loop.advance(5);loop.sync(done);loop.advance(1);
  assert.equal(plays.filter(id=>id==='done').length,1);assert.equal(loop.actor.state,'idle');
  loop.sync({...done,completion:{...done.completion,goal:{...done.completion.goal,revision:3}}});loop.advance(.5);
  assert.equal(plays.filter(id=>id==='done').length,2,'A newly confirmed goal version has its own finish');
});

test('new work or a request cancels unplayed finish cues, and the old goal cannot return later',()=>{
  for(const pending of [[],[{id:'new-question',sessionId:'goal-test',kind:'question',state:'open'}]]) {
    const loop=createWorkLoop({sessionId:'goal-test',completionBranch:true});loop.sync(done);loop.advance(.4);
    loop.sync({sessionId:'goal-test',mood:'working',active:true,tools:1,pending});loop.advance(2);
    assert(!loop.actor.particles.some(p=>p.kind==='drop'));assert.equal(loop.actor.state,pending.length?'request-study':'doing');
    loop.sync({...done,pending:[]});loop.advance(4);assert.equal(loop.actor.state,'idle');
  }
});

test('hidden finish freezes its exact one-shot progress and calm keeps the finish without jumping',()=>{
  const loop=createWorkLoop({sessionId:'goal-test',completionBranch:true,calm:true});loop.sync(done);loop.advance(GOAL_TIMING.prepare+.15);
  const elapsed=loop.actor.onceT,time=loop.view.time;loop.setVisible(false);loop.advance(60);assert.equal(loop.actor.onceT,elapsed);assert.equal(loop.view.time,time);
  loop.setVisible(true);assert.equal(loop.actor.onceId,'done');assert.equal(loop.actor.onceT,elapsed);
  loop.advance(.5);assert.equal(loop.actor.particles.filter(p=>p.kind==='drop').length,2);
  loop.advance(5);assert.equal(loop.actor.state,'idle');assert.equal(loop.actor.airborne,false);
});
