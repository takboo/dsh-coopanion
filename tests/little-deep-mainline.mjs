import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement??=class {};
const {createWorkPerformance,buildWorkTimeline}=await import('../docs/design/art-workflow/whale-little-deep-v3/work-performance.js');
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.height,a.vy,
  a.scale.value,a.fxValue('hidden'),a.fxValue('eyesOpacity'),a.eyes.h,a.look.x,a.look.y,
  ...a.base.flatMap(p=>[p.x,p.y]),...a.baseV.flatMap(p=>[p.x,p.y])];

test('the complete work film retains one actor through thinking, work, both accepted requests and ordinary settling',()=>{
  const film=createWorkPerformance(),actor=film.actor,shots=[],plays=[];actor.on(e=>{if(e.type==='play')plays.push(e.id);});
  let previous=frame(actor);
  for(let i=0;i<film.duration*120;i++) {
    film.advance(1/120);assert.equal(film.actor,actor,'Automatic cuts must retain the actor');
    const current=frame(actor);
    current.slice(0,12).forEach(value=>assert(Number.isFinite(value)));
    // Current body coordinates, unlike targets, must not snap at state boundaries.
    actor.base.forEach((p,index)=>{
      assert(Math.abs(p.x-previous[12+index*2])<.16);
      assert(Math.abs(p.y-previous[13+index*2])<.16);
    });
    previous=current;
    if(shots.at(-1)!==film.view.shot.id)shots.push(film.view.shot.id);
    assert.equal(actor.onceId,null,'The ordinary film never enters a celebration one-shot');
    assert(!actor.particles.some(p=>p.kind==='drop'||p.kind==='heart'));
  }
  assert.deepEqual(shots,['idle','receive','think','work','approval','resume-work','rethink','question','resume-think','reply','settle','rest']);
  assert(!plays.includes('done'));assert.equal(film.view.replyCategory,'reply');
  assert.equal(film.actor.state,'idle');assert.equal(film.view.pendingIds.length,0);
  film.advance(.1);assert.equal(film.time,film.duration);assert.equal(film.view.finished,true);
});

test('approval and question exit into their own continuation without stale markers or delayed entrances',()=>{
  const film=createWorkPerformance();
  film.seek(7.7);assert.equal(film.view.symbol.kind,'approval');assert.equal(film.view.symbol.progress,1);
  film.advance(.8);assert.equal(film.view.shot.id,'resume-work');assert.equal(film.actor.state,'working');
  assert.equal(film.view.pendingIds.length,0);assert(film.view.symbols.length>0,'Exit overlaps the continuation');
  film.advance(.4);assert.equal(film.view.symbols.length,0);
  film.seek(13.7);assert.equal(film.view.symbol.kind,'question');assert.equal(film.view.symbol.progress,1);
  film.advance(.8);assert.equal(film.view.shot.id,'resume-think');assert.equal(film.actor.state,'thinking');
  film.advance(.4);assert.equal(film.view.symbols.length,0);
  film.advance(6);assert.equal(film.actor.state,'idle');assert.equal(film.view.symbols.length,0);
});

test('seeking and reference sampling reproduce playback regardless of animation-frame chunk sizes',()=>{
  const played=createWorkPerformance(),identity=played.actor;
  const targets=[.4,1.05,2.9,5.2,6.7,8.6,10.8,12.7,15.9,18.7,19.5,20];
  for(const target of targets) {
    let count=0;
    while(played.time<target-1e-9)played.advance(Math.min(target-played.time,[.013,.031,.007,.05][count++%4]));
    const sampled=createWorkPerformance();sampled.seek(target);
    assert.equal(played.actor,identity);assert.equal(played.view.shot.id,sampled.view.shot.id);
    frame(played.actor).forEach((value,i)=>assert(Math.abs(value-frame(sampled.actor)[i])<1e-8,`Pose mismatch at ${target}s`));
    assert.deepEqual(played.view.symbols,sampled.view.symbols);
  }
});

test('the route without intervention omits both requests and does not force a waiting performance',()=>{
  const film=createWorkPerformance({route:'plain'});assert.equal(film.duration,15);
  assert(!film.timeline.some(s=>s.kind));
  for(let i=0;i<15*60;i++){film.advance(1/60);assert.equal(film.view.symbols.length,0);assert.equal(film.view.pendingIds.length,0);}
  film.advance(.01);assert.equal(film.view.finished,true);assert.equal(film.actor.state,'idle');
});

test('the ongoing-goal ending settles the reply then continues thinking without a success animation',()=>{
  for(const route of ['plain','guided']) {
    const film=createWorkPerformance({route,ending:'continue'}),plays=[];film.actor.on(e=>{if(e.type==='play')plays.push(e.id);});
    const settling=film.timeline.find(s=>s.id==='settle');film.advance(settling.start+.5);
    assert.equal(film.actor.state,'settling');assert.equal(film.view.replyCategory,'goal-progress');
    film.advance(film.duration);assert.equal(film.actor.state,'thinking');assert.equal(film.actor.shapeKey,'tail');
    assert.equal(film.view.shot.id,'continue');assert.equal(film.view.symbols.length,0);assert(!plays.includes('done'));
  }
});

test('hidden playback freezes its timeline and resumes the current request without background catch-up',()=>{
  const film=createWorkPerformance();film.seek(6.7);film.setVisible(false);
  const before=frame(film.actor),time=film.time;film.advance(60);
  assert.equal(film.time,time);assert.deepEqual(frame(film.actor),before);
  film.setVisible(true);assert.equal(film.view.shot.id,'approval');assert.equal(film.view.symbol.progress,1);
  film.advance(2.2);assert.equal(film.view.shot.id,'resume-work');assert.equal(film.view.symbols.length,0);
});

test('palette changes preserve the current film and reduced motion keeps both request markers readable',()=>{
  const film=createWorkPerformance({calm:true});const actor=film.actor;let peak=0,approval=false,question=false;
  for(let i=0;i<film.duration*120;i++) {
    film.advance(1/120);peak=Math.max(peak,Math.abs(actor.lean.value));
    if(film.view.pendingIds.length) {
      assert.equal(film.view.symbol.progress,1);assert.equal(film.view.symbol.tremor,0);
      if(film.view.symbol.kind==='approval')approval=true;else question=true;
    }
    if(i===1000){const before=frame(actor),time=film.time;film.setPalette('night');assert.deepEqual(frame(actor),before);assert.equal(film.time,time);}
  }
  assert(approval&&question);assert(peak<.08);assert.equal(film.actor,actor);
});

test('film routes and seek inputs reject invalid values and all named reference times stay in their own shots',()=>{
  assert.throws(()=>buildWorkTimeline({route:'unknown'}));assert.throws(()=>buildWorkTimeline({ending:'completed'}));
  const film=createWorkPerformance();assert.throws(()=>film.seek(NaN));assert.throws(()=>film.advance(-1));
  for(const shot of film.timeline.filter(s=>s.referenceTime!==null)) {
    film.seek(shot.referenceTime);assert.equal(film.view.shot.id,shot.id);
  }
  film.seek(100);assert.equal(film.time,film.duration);assert.equal(film.view.finished,true);
});
