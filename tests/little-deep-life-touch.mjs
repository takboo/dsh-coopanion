import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.HTMLElement??=class {};
const {createLifeTouchPerformance}=await import('../docs/design/art-workflow/whale-little-deep-v3/life-touch-performance.js');
const {createLifeTouchFilm,LIFE_TOUCH_FRAMES}=await import('../docs/design/art-workflow/whale-little-deep-v3/life-touch-film.js');
const create=options=>createLifeTouchPerformance({sessionId:'touch-tests',...options});
const pending=(kind,id=kind,sessionId='touch-tests')=>({id,kind,sessionId,state:'open'});
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.scale.value,a.height,a.vy,a.eyes.h,a.fxValue('hidden'),...a.base.flatMap(p=>[p.x,p.y]),...a.baseV.flatMap(p=>[p.x,p.y])];
function stroke(p){for(let i=0;i<9;i++){p.move({x:i%2?.25:-.6,y:-.2});p.advanceAnimation(.12);}}

test('a still hold remains a touch; moving strokes produce a sustained response and one release afterglow',()=>{
  const p=create(),actor=p.actor;p.advanceAnimation(12.5);const entries=p.view.life.entries;
  p.press();p.advanceAnimation(2);assert.equal(p.view.interaction.phase,'touch');assert.equal(p.view.interaction.wasPet,false);
  const lifeClock=p.view.life.clock;stroke(p);assert.equal(p.view.interaction.phase,'pet');assert(p.actor.eyes.h<.6);
  assert.equal(p.view.life.clock,lifeClock);assert.equal(p.actor.shapeKey,'rest');assert.equal(p.actor.particles.length,0);
  const before=frame(actor);p.release();assert.deepEqual(frame(actor),before);p.advanceAnimation(.5);assert.equal(p.view.interaction.phase,'afterglow');
  assert.equal(p.release(),false);p.advanceAnimation(1);assert.equal(p.view.interaction.phase,'free');assert.equal(p.view.life.entries,entries+1);
  assert(p.view.life.clock<.3);assert.equal(p.actor,actor);assert.equal(actor.particles.length,0);
});

test('motion must continue while held, and a cancelled pointer never creates a late release response',()=>{
  const p=create();p.press();stroke(p);p.advanceAnimation(.6);assert.equal(p.view.interaction.phase,'touch');
  const relaxed=p.actor.eyes.h;p.release();p.advanceAnimation(.2);assert(p.actor.eyes.h>=relaxed-.02,'Releasing after the strokes stop must not tighten the eyes again');
  p.cancel();const entries=p.view.life.entries;assert.equal(p.release(),false);p.advanceAnimation(2);
  assert.equal(p.view.interaction.phase,'free');assert.equal(p.view.life.entries,entries);assert.equal(p.view.interaction.pressed,false);
});

test('question and approval preempt a held life gesture; partial settlement waits and the latest work intention wins',()=>{
  for(const kind of ['question','approval']){
    const p=create(),actor=p.actor;p.press();stroke(p);const physical=frame(actor);
    const first=pending(kind),other=pending(kind,'second'),background=pending('question','background','elsewhere');
    p.sync({pending:[first,other,background]});assert.deepEqual(frame(actor),physical);assert.equal(p.view.interaction.pressed,false);
    assert.equal(p.release(),false);assert.equal(p.press(),false);p.advanceAnimation(1.7);assert.equal(p.view.symbol.kind,kind);
    p.sync({pending:[other],mode:'work',stage:'tools',workId:'new-work'});p.advanceAnimation(.4);assert.equal(p.view.work.clock,0);
    p.sync({pending:[]});p.advanceAnimation(2);assert.equal(p.actor,actor);assert.equal(p.actor.shapeKey,'tail');assert(p.actor.fxValue('eyesOpacity')<.01);
    assert.equal(p.view.interaction.phase,'free');assert.equal(p.view.work.id,'new-work');assert.equal(p.view.symbols.length,0);
    p.sync({mode:'life'});p.advanceAnimation(.6);assert.equal(p.view.interaction.phase,'free');assert.equal(p.view.life.clock,.6);
  }
});

test('a request returning to life starts a fresh plan and cannot revive its old held gesture',()=>{
  const p=create();p.advanceAnimation(12.5);p.press();stroke(p);const entries=p.view.life.entries;
  p.sync({pending:[pending('question')]});p.advanceAnimation(2);p.sync({pending:[]});p.advanceAnimation(.8);
  assert.equal(p.view.interaction.phase,'free');assert.equal(p.view.life.entries,entries+1);assert.equal(p.release(),false);
  assert.equal(p.actor.particles.length,0);assert.equal(p.view.symbols.length,0);assert.equal(p.actor.shapeKey,'rest');
});

test('source time cannot advance a gesture and hidden restoration cancels pressed ownership without catch-up',()=>{
  const p=create();p.press();p.advanceEventTime(60000);assert.equal(p.view.interaction.held,0);
  stroke(p);const physical=frame(p.actor);p.setPalette('night');p.setCalm(true);assert.deepEqual(frame(p.actor),physical);
  p.setVisible(false);const hidden=frame(p.actor),clock=p.view.clocks.animationSeconds;p.advanceAnimation(60);assert.deepEqual(frame(p.actor),hidden);
  assert.equal(p.view.clocks.animationSeconds,clock);p.setVisible(true);assert.equal(p.release(),false);
  p.advanceAnimation(1);assert.equal(p.view.interaction.phase,'free');assert.equal(p.actor.shapeKey,'rest');
  assert.equal(p.view.clocks.eventTimeMs,60000);assert.throws(()=>p.move({x:NaN,y:0}));
});

test('both screenplay request variants reconstruct every key pose and keep the same actor after the score ends',()=>{
  for(const kind of ['question','approval']) {
    const film=createLifeTouchFilm({kind}),actor=film.life.actor;
    for(const target of LIFE_TOUCH_FRAMES.map(f=>f.time).concat(16)){
      let i=0;while(film.time<target-1e-9)film.advance(Math.min(target-film.time,[.013,.031,.007,.05][i++%4]));
      const sample=createLifeTouchFilm({kind});sample.seek(target);assert.equal(film.life.actor,actor);
      frame(actor).forEach((n,i)=>assert(Math.abs(n-frame(sample.life.actor)[i])<1e-8));assert.deepEqual(film.view.life.symbols,sample.view.life.symbols);
    }
    film.advance(3);assert.equal(film.life.actor,actor);assert.equal(film.view.life.mode,'life');assert.equal(film.view.life.pendingIds.length,0);
  }
});

test('manual ownership cancels future screenplay inputs and only exact request settlement releases waiting',()=>{
  const film=createLifeTouchFilm();film.seek(3);film.manual();assert.equal(film.view.life.interaction.pressed,false);assert.equal(film.life.release(),false);film.advance(10);
  assert.equal(film.view.life.mode,'life');assert.equal(film.view.life.pendingIds.length,0);
  const id=film.inject('approval');film.advance(10);assert.equal(film.view.life.requestId,id);assert.equal(film.life.release(),false);
  assert.throws(()=>film.settle('unrelated'));film.setMode('work');film.settle(id);film.advance(2);assert.equal(film.life.actor.shapeKey,'tail');
  assert.throws(()=>createLifeTouchFilm({kind:'other'}));
});
