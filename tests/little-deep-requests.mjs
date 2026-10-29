import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement??=class {};
const {createRequestPerformance,EXIT_DURATION,headAnchor}=await import('../docs/design/art-workflow/whale-little-deep-v3/request-performance.js');
const request=(id='q1',sessionId='study-main',state='open')=>({id,sessionId,kind:'question',state});
const sync=(study,interactions,mood='working',sessionId='study-main')=>study.sync({sessionId,mood,interactions});
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.scale.value,a.height,
  a.fxValue('hidden'),a.fxValue('eyesOpacity'),a.eyes.h,...a.base.flatMap(p=>[p.x,p.y])];

test('live question uses one actor and duplicate or continued snapshots do not replay its entrance',()=>{
  const study=createRequestPerformance(),actor=study.actor,before=frame(actor);
  sync(study,[request()]);assert.deepEqual(frame(actor),before);
  study.advance(.7);const mark=study.view.symbol.progress;
  for(let i=0;i<10;i++)sync(study,[request('q1','study-main','continued')]);
  assert.equal(study.view.symbol.progress,mark);assert.equal(study.actor,actor);
  study.advance(2);assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.progress,1);
  assert.deepEqual(study.view.pendingIds,['q1']);
});

test('request identity, partial settlement and background sessions keep independent waiting facts',()=>{
  const study=createRequestPerformance();
  const first=request('["session/a","question","native/b"]'),second=request('["session","question","a/native/b"]');
  sync(study,[first,second,request('background','study-other')]);study.advance(2);
  sync(study,[{...first,state:'settled'},second]);
  assert.deepEqual(study.view.pendingIds,[second.id]);assert.equal(study.view.phase,'wait');
  assert.equal(study.view.symbol.opacity,1);assert.equal(study.view.symbol.progress,1);
  sync(study,[{...second,state:'settled'},request('background','study-other')]);
  assert.equal(study.view.pendingIds.length,0);assert.equal(study.view.phase,'exit');
  study.advance(EXIT_DURATION+.1);assert.equal(study.view.symbol,null);
});

test('settling in any entrance phase fades only the drawn stroke and immediately resumes current activity',()=>{
  for(const elapsed of [.05,.22,.7,1.2,2])for(const mood of ['working','thinking','idle']) {
    const study=createRequestPerformance();sync(study,[request()]);study.advance(elapsed);
    const before=frame(study.actor),progress=study.view.symbol.progress;
    sync(study,[request('q1','study-main','settled')],mood);
    assert.deepEqual(frame(study.actor),before,'Settlement changes targets, never current values or velocity');
    assert.equal(study.actor.loopId,mood,'Fact changes do not wait for the decorative exit');
    if(progress>0)assert.equal(study.view.symbol.progress,progress,'A partial hook is not suddenly completed');
    study.advance(.1);
    if(progress>0)assert(study.view.symbol.opacity<1);
    study.advance(5);assert.equal(study.view.symbol,null);assert.equal(study.actor.state,mood);
    assert.equal(study.view.phase,mood,'Old entrance cannot return after its request has settled');
    assert.equal(study.actor.shapeKey,mood==='thinking'?'tail':'rest');
  }
});

test('touch interrupts the body performance without hiding a request or replaying the initial turn',()=>{
  const study=createRequestPerformance();sync(study,[request()]);study.advance(.25);
  const mark=study.view.symbol.progress;study.tap();assert.equal(study.view.phase,'touch');
  assert.equal(study.view.symbol.progress,mark,'Touch does not jump an unfinished stroke to completion');
  study.lookAt({x:-1,y:-.7});study.advance(.3);
  assert(study.actor.look.x<-.07,'Pointer gaze has precedence over the scripted gaze');
  study.advance(.3);assert.equal(study.view.phase,'wait');assert.deepEqual(study.view.pendingIds,['q1']);
  study.advance(3);assert.equal(study.actor.state,'request-study');
  sync(study,[],'idle');study.tap();study.advance(.1);
  sync(study,[request('newest')]);assert.equal(study.view.phase,'settle');
  study.advance(3);assert.equal(study.view.requestId,'newest');
  assert.equal(study.view.phase,'wait');assert.equal(study.actor.onceId,null,'No old touch action resumes later');
});

test('a new request cancels an old exit from the exact current pose',()=>{
  const study=createRequestPerformance();sync(study,[request()]);study.advance(2);
  sync(study,[],'thinking');study.advance(.12);
  const before=frame(study.actor);sync(study,[request('q2')]);
  assert.deepEqual(frame(study.actor),before);assert.equal(study.view.phase,'settle');
  study.advance(5);assert.equal(study.view.phase,'wait');assert.equal(study.view.requestId,'q2');
  assert.equal(study.actor.shapeKey,'rest');assert(study.actor.fxValue('eyesOpacity')>.99);
});

test('drag retains ownership while facts change, then resumes the latest request or activity without a fling',()=>{
  for(const nextPending of [true,false]) {
    const study=createRequestPerformance();sync(study,[request()]);study.advance(.4);
    const actor=study.actor;study.beginDrag({x:-.9,y:0});study.drag({x:-1.3,y:-.2});study.advance(.1);
    sync(study,[], 'idle');assert.equal(study.view.phase,'drag');assert.equal(actor.isGrabbed,true);
    if(nextPending)sync(study,[request('newest')],'thinking');else sync(study,[],'thinking');
    study.advance(.5);const before=frame(actor);study.release();
    assert.deepEqual(frame(actor),before);assert.equal(actor.isGrabbed,false);assert.equal(actor.spinV,0);
    study.advance(5);
    assert.equal(study.view.phase,nextPending?'wait':'thinking');
    assert.equal(actor.state,nextPending?'request-study':'thinking');
    assert.equal(study.actor,actor);
  }
});

test('switching sessions and returning from a hidden page restore current facts without replay or catch-up',()=>{
  const study=createRequestPerformance();sync(study,[request(),request('other','study-other')]);study.advance(.4);
  study.beginDrag({x:-.9,y:0});sync(study,[request(),request('other','study-other')],'working','study-other');
  assert.equal(study.actor.isGrabbed,false);assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.progress,1);
  study.setVisible(false);const before=frame(study.actor),time=study.time;
  study.advance(60);assert.deepEqual(frame(study.actor),before);assert.equal(study.time,time);
  sync(study,[],'idle','study-other');study.setVisible(true);
  assert.equal(study.view.symbol,null);assert.equal(study.view.phase,'idle');
  study.setVisible(false);sync(study,[request('hidden','study-other')],'thinking','study-other');study.setVisible(true);
  assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.progress,1);
});

test('reduced motion retains the marker, suppresses tremor, and preserves request identity across palette changes',()=>{
  const study=createRequestPerformance({calm:true});sync(study,[request()]);
  assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.tremor,0);
  const before=frame(study.actor);study.setPalette('night');assert.deepEqual(frame(study.actor),before);
  assert.deepEqual(study.view.pendingIds,['q1']);study.advance(3);assert(Math.abs(study.actor.lean.value)<.075);
  study.setCalm(false);study.advance(.2);assert.equal(study.view.phase,'wait');
  const anchor=headAnchor(study.actor);assert(Number.isFinite(anchor.x)&&Number.isFinite(anchor.y));
});
