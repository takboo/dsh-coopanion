import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.HTMLElement??=class {};
const {createSegmentPerformance}=await import('../docs/design/art-workflow/whale-little-deep-v3/segment-performance.js');
const {createWorkLifePerformance}=await import('../docs/design/art-workflow/whale-little-deep-v3/work-life-performance.js');
const pending=(kind='question',id=kind,sessionId='segments')=>({id,sessionId,kind,state:'open'});
const create=options=>createSegmentPerformance({sessionId:'segments',...options});
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.scale.value,a.height,a.vy,
  a.fxValue('hidden'),a.fxValue('eyesOpacity'),a.eyes.h,...a.base.flatMap(p=>[p.x,p.y]),...a.baseV.flatMap(p=>[p.x,p.y])];

test('a concentrated work segment dives once and keeps its anatomy through dense tool/focus switches',()=>{
  const segment=create(),actor=segment.actor;segment.advanceAnimation(2);let shape=actor.shapeKey,changes=0;
  for(let i=0;i<80;i++) {
    segment.advanceEventTime(i*100);segment.sync({stage:i%2?'focus':'tools',atMs:i*100,pending:[]});segment.advanceAnimation(.08);
    if(actor.shapeKey!==shape){shape=actor.shapeKey;changes++;}
    assert.equal(segment.actor,actor);assert(actor.fxValue('hidden')>.98);assert.equal(actor.onceId,null);
  }
  assert.equal(changes,0);assert.equal(segment.view.work.entries,1);assert.equal(actor.shapeKey,'tail');
  assert(segment.view.work.clock>8);assert(!actor.particles.some(p=>p.kind==='drop'||p.kind==='heart'));
});

test('work and life differ in silhouette and life reaches open, playful and resting postures',()=>{
  const work=create(),life=create({mode:'life'});work.advanceAnimation(3.5);life.advanceAnimation(3.5);
  assert.equal(work.actor.shapeKey,'tail');assert.equal(life.actor.shapeKey,'rest');
  assert(work.actor.fxValue('hidden')>.98);assert(life.actor.fxValue('hidden')<.01);
  assert(work.actor.fxValue('eyesOpacity')<.01);assert(life.actor.fxValue('eyesOpacity')>.99);
  life.advanceAnimation(6);assert(life.actor.lean.value<-.20);assert(life.actor.fxValue('belly')>.75);
  life.advanceAnimation(4);assert(life.actor.particles.some(p=>p.kind==='bubble'));assert.equal(life.actor.onceId,null);
  life.advanceAnimation(4.5);assert.equal(life.view.phase,'rest');assert(life.actor.eyes.h<.8);
  assert(!life.actor.particles.some(p=>p.kind==='drop'||p.kind==='heart'));
});

test('both accepted request types pause the current work continuation and resume it without a new opening',()=>{
  for(const kind of ['question','approval']) {
    const segment=create(),actor=segment.actor;segment.advanceAnimation(3);const before=frame(actor),clock=segment.view.work.clock,tail=segment.view.work.tailPhase;
    segment.sync({pending:[pending(kind)]});assert.deepEqual(frame(actor),before);
    segment.advanceAnimation(1.7);assert.equal(segment.view.work.clock,clock);assert.equal(segment.view.work.tailPhase,tail);
    assert.equal(segment.view.symbol.kind,kind);assert.equal(segment.view.symbol.progress,1);assert(actor.fxValue('hidden')<.01);
    const progress=segment.view.symbol.progress;segment.sync({pending:[{...pending(kind),state:'continued'}],stage:'tools'});
    assert.equal(segment.view.symbol.progress,progress);const waiting=frame(actor);
    segment.sync({pending:[]});assert.deepEqual(frame(actor),waiting);assert.equal(segment.view.work.entries,1);
    segment.advanceAnimation(1);assert.equal(segment.actor,actor);assert.equal(segment.view.work.entries,1);
    assert(Math.abs(segment.view.work.clock-clock-1)<1e-8);assert(actor.fxValue('hidden')>.95);assert.equal(actor.shapeKey,'tail');
    assert(actor.fxValue('eyesOpacity')<.01,'Returning to a tail must not leave a ghost face on it');
    assert.equal(segment.view.symbols.length,0);
  }
});

test('a request that settles during entrance can be interrupted again without a pose reset or a stale exit',()=>{
  const segment=create();segment.advanceAnimation(3);segment.sync({pending:[pending()]});segment.advanceAnimation(.3);
  const current=frame(segment.actor),progress=segment.view.symbol.progress;segment.sync({pending:[]});assert.deepEqual(frame(segment.actor),current);
  assert.equal(segment.view.symbol.progress,progress);segment.advanceAnimation(.1);
  const halfway=frame(segment.actor);segment.sync({pending:[pending('approval','new-full-id')]});assert.deepEqual(frame(segment.actor),halfway);
  segment.advanceAnimation(2);assert.equal(segment.view.requestId,'new-full-id');assert.equal(segment.view.symbol.kind,'approval');
  assert.equal(segment.view.work.entries,1);
});

test('mixed and background request identities do not resume work before its own pending set clears',()=>{
  const segment=create();segment.advanceAnimation(3);const q=pending(),approval=pending('approval');
  segment.sync({pending:[q,approval,pending('question','background','other-session')]});segment.advanceAnimation(1.8);
  const clock=segment.view.work.clock;segment.sync({pending:[approval]});segment.advanceAnimation(.3);
  assert.equal(segment.view.symbol.kind,'approval');assert.equal(segment.view.work.clock,clock);
  segment.sync({pending:[pending('question','background','other-session')]});segment.advanceAnimation(1);
  assert.equal(segment.view.pendingIds.length,0);assert(segment.view.work.clock>clock);assert.equal(segment.view.symbols.length,0);
});

test('the latest report or new work identity wins while the request owns the body',()=>{
  const segment=create();segment.advanceAnimation(3);segment.sync({pending:[pending()]});segment.advanceAnimation(1.6);
  segment.sync({stage:'report',pending:[pending()]});segment.sync({pending:[]});segment.advanceAnimation(1);
  assert.equal(segment.view.work.stage,'report');assert.equal(segment.actor.shapeKey,'rest');assert(segment.actor.fxValue('hidden')<.01);
  segment.sync({stage:'tools',workId:'new-work',pending:[pending('approval')]});assert.equal(segment.view.work.clock,0);
  segment.advanceAnimation(2);assert.equal(segment.view.work.clock,0);segment.sync({pending:[]});segment.advanceAnimation(2);
  assert.equal(segment.view.work.id,'new-work');assert.equal(segment.view.work.entries,2);assert.equal(segment.actor.shapeKey,'tail');
});

test('work cancels an unplayed life bubble and returning to life starts a fresh intention',()=>{
  const segment=create({mode:'life'}),actor=segment.actor;segment.advanceAnimation(12.6);
  assert.equal(actor.particles.length,0);segment.sync({mode:'work',stage:'tools'});segment.advanceAnimation(5);
  assert.equal(segment.actor,actor);assert.equal(segment.view.mode,'work');assert.equal(actor.shapeKey,'tail');assert.equal(actor.particles.length,0);
  segment.sync({mode:'life'});assert.equal(segment.view.life.clock,0);segment.advanceAnimation(1);
  assert.equal(segment.actor,actor);assert.equal(segment.view.life.entries,2);assert.equal(segment.view.phase,'stretch');assert.equal(actor.particles.length,0);
});

test('source time, hidden restoration, palette and reduced motion preserve request identity and work context',()=>{
  const segment=create();segment.advanceAnimation(3);segment.sync({pending:[pending()]});segment.advanceAnimation(.4);
  segment.setVisible(false);const physical=frame(segment.actor),context=segment.view.work.clock,time=segment.view.clocks.animationSeconds;
  segment.advanceEventTime(60000);segment.advanceAnimation(60);assert.deepEqual(frame(segment.actor),physical);
  assert.equal(segment.view.clocks.animationSeconds,time);assert.equal(segment.view.work.clock,context);
  segment.setVisible(true);assert.equal(segment.view.symbol.progress,1);const before=frame(segment.actor);
  segment.setPalette('night');assert.deepEqual(frame(segment.actor),before);segment.setCalm(true);assert.equal(segment.view.symbol.tremor,0);
  segment.sync({pending:[]});segment.advanceAnimation(1);assert.equal(segment.actor.shapeKey,'tail');assert.equal(segment.view.work.entries,1);
  assert.equal(segment.view.clocks.eventTimeMs,60000);assert.throws(()=>segment.advanceEventTime(50000));
});

test('the paired screenplay keeps both actors and reconstructs its requests and continuation at every review point',()=>{
  const film=createWorkLifePerformance(),work=film.work.actor,life=film.life.actor;
  for(const target of [.4,1.2,3.5,6.3,7.8,8.6,9.4,13.8,14.6,15.4,18.8,22,24]) {
    let i=0;while(film.time<target-1e-9)film.advance(Math.min(target-film.time,[.013,.031,.007,.05][i++%4]));
    const reference=createWorkLifePerformance();reference.seek(target);
    assert.equal(film.work.actor,work);assert.equal(film.life.actor,life);
    for(const lane of ['work','life'])frame(film[lane].actor).forEach((x,j)=>assert(Math.abs(x-frame(reference[lane].actor)[j])<1e-8));
    assert.deepEqual(film.work.view.symbols,reference.work.view.symbols);
    assert.equal(film.work.view.work.entries,1);
  }
  film.advance(3);assert.equal(film.work.actor,work);assert.equal(film.life.actor,life);
  assert.equal(film.work.view.pendingIds.length,0);assert.equal(film.work.actor.shapeKey,'tail');
});

test('manual pending identities survive unrelated screenplay decisions, and the plain route never inserts a request',()=>{
  const film=createWorkLifePerformance();film.seek(6.3);const original=film.work.view.requestId,manual=film.inject('approval');film.advance(2.5);
  assert.deepEqual(film.work.view.pendingIds,[manual]);assert.equal(film.work.view.symbol.kind,'approval');
  assert.throws(()=>film.settle(original));film.settle(manual);film.advance(1);assert.equal(film.work.view.pendingIds.length,0);
  assert.equal(film.work.actor.shapeKey,'tail');
  const plain=createWorkLifePerformance({route:'plain'});plain.advance(24);assert.equal(plain.work.view.pendingIds.length,0);assert.equal(plain.work.view.symbols.length,0);
  assert(plain.landmarks.every(l=>!/[提问审批问号感叹号]/.test(l.title)),'A plain route must not label absent request shots');
  assert.equal(plain.work.view.work.entries,1);assert.throws(()=>createWorkLifePerformance({route:'unknown'}));
});
