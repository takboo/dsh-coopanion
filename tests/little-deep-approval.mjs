import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement??=class {};
const {createRequestPerformance,sampleRequestPose,EXIT_DURATION,MARKER_CHANGE_DURATION}=
  await import('../docs/design/art-workflow/whale-little-deep-v3/request-performance.js');
const {samplePose}=await import('../docs/design/art-workflow/whale-little-deep-v3/storyboard-performance.js');
const request=(nativeId='native/full',kind='approval',sessionId='study-main')=>
  ({id:JSON.stringify([sessionId,kind,nativeId]),sessionId,kind,state:'open'});
const sync=(study,interactions,mood='working',sessionId='study-main')=>study.sync({sessionId,mood,interactions});
const frame=a=>[a.rootX.value,a.rootX.velocity,a.lean.value,a.lean.velocity,a.height,a.vy,
  ...a.base.flatMap(p=>[p.x,p.y]),...a.baseV.flatMap(p=>[p.x,p.y])];

test('approval preserves the confirmed body timing while its shorter stroke completes earlier and trembles less',()=>{
  for(const time of [0,.12,.3,.7,.8,1.5,3]) {
    const approval=sampleRequestPose(time,'approval'),question=samplePose(time);
    const body=({symbol,tremor,...pose})=>pose;
    assert.deepEqual(body(approval),body(question),'Only the marker choreography changes');
    assert(approval.tremor<question.tremor);
  }
  const study=createRequestPerformance();sync(study,[request()]);
  study.advance(.7);assert(study.view.symbol.progress>.84&&study.view.symbol.progress<1,'Main stroke precedes the dot');
  study.advance(.11);assert.equal(study.view.symbol.progress,1,'The simple marker finishes within the entrance');
  study.advance(2);assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.kind,'approval');
  assert.equal(study.actor.onceId,null);
  const sampled=createRequestPerformance(),played=createRequestPerformance();
  sync(sampled,[request()]);sync(played,[request()]);
  sampled.advance(1.5);played.advance(.7);played.advance(.8);
  assert.equal(sampled.view.phase,'wait','The 1.5-second reference lands exactly on waiting');
  frame(sampled.actor).forEach((value,i)=>assert(Math.abs(value-frame(played.actor)[i])<1e-6,
    'A reference frame reconstructs the same physical playback pose'));
});

test('an unrelated decision cannot clear an approval with a longer native id or a different kind/session',()=>{
  const study=createRequestPerformance(),pending=request(),question=request('native/full','question');
  const background=request('native/full','approval','study-other');
  sync(study,[pending,question,background]);study.advance(2);
  sync(study,[pending,question,background,{...request('native'),state:'settled'}]);
  assert.deepEqual(study.view.pendingIds,[pending.id,question.id]);
  assert.equal(study.view.requestId,pending.id);
  const time=study.time,pose=frame(study.actor);
  sync(study,[question,pending,background]);
  assert.equal(study.view.requestId,pending.id,'Snapshot order cannot steal the current approval');
  assert.equal(study.time,time);assert.deepEqual(frame(study.actor),pose);
});

test('allow and deny settle only their exact approval and never imply celebration, error, or tool execution',()=>{
  for(const decision of ['allow','deny'])for(const mood of ['working','thinking','idle']) {
    const study=createRequestPerformance(),first=request(),second=request('next');
    sync(study,[first,second]);study.advance(.4);
    sync(study,[{...first,state:'settled',decision},second],mood);
    assert.deepEqual(study.view.pendingIds,[second.id]);assert.equal(study.view.symbol.kind,'approval');
    assert.equal(study.view.phase,'wait','An already pending approval does not replay the entrance');
    sync(study,[{...first,state:'settled',decision},{...second,state:'settled',decision}],mood);
    assert.equal(study.actor.loopId,mood,'The supplied continuation, not the decision label, chooses the next action');
    study.advance(4);assert.equal(study.view.symbol,null);assert.equal(study.actor.state,mood);
    assert.equal(study.actor.onceId,null);assert.equal(study.actor.particles.some(p=>p.kind==='drop'),false);
  }
});

test('approval-to-question and question-to-approval markers crossfade without resetting the actor or replaying the body',()=>{
  for(const kind of ['approval','question']) {
    const study=createRequestPerformance(),first=request('a',kind),second=request('b',kind==='approval'?'question':'approval');
    sync(study,[first,second]);study.advance(2);
    const actor=study.actor,before=frame(actor);
    sync(study,[{...first,state:'settled'},second]);
    assert.equal(study.actor,actor);assert.deepEqual(frame(actor),before);
    assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.progress,1);
    assert.equal(study.view.symbols.length,2);assert.equal(study.view.symbols[0].opacity,1);
    assert.equal(study.view.symbols[1].opacity,0);
    study.advance(MARKER_CHANGE_DURATION/2);
    assert(study.view.symbols.every(s=>s.opacity>.3&&s.opacity<.7));
    const alpha=study.view.symbol.opacity;sync(study,[second]);assert.equal(study.view.symbol.opacity,alpha);
    study.advance(MARKER_CHANGE_DURATION);assert.equal(study.view.symbols.length,1);
    assert.equal(study.view.symbol.kind,second.kind);assert.equal(study.view.symbol.opacity,1);
  }
});

test('settlement during marker exchange fades every visible layer and a new approval cancels the old exit',()=>{
  const study=createRequestPerformance(),first=request(),second=request('q','question');
  sync(study,[first,second]);study.advance(2);sync(study,[second]);study.advance(.08);
  const before=study.view.symbols.map(s=>s.opacity);sync(study,[],'thinking');
  assert.deepEqual(study.view.symbols.map(s=>s.opacity),before,'Neither visible marker disappears at settlement');
  study.advance(.1);assert(study.view.symbols.every((s,i)=>s.opacity<before[i]));
  sync(study,[request('newest')]);assert.equal(study.view.symbols.length,1);
  study.advance(EXIT_DURATION+2);assert.equal(study.view.symbol.kind,'approval');assert.equal(study.view.phase,'wait');
});

test('an approval decision during a drag preserves hand ownership and releases into the newest facts',()=>{
  const study=createRequestPerformance(),approval=request();sync(study,[approval]);study.advance(.5);
  study.beginDrag({x:-.8,y:0});study.drag({x:-1.2,y:-.2});study.advance(.1);
  sync(study,[{...approval,state:'settled',decision:'deny'}],'idle');
  assert.equal(study.actor.isGrabbed,true);assert.equal(study.view.phase,'drag');
  sync(study,[request('follow-up','question')],'thinking');
  const before=frame(study.actor);study.release();assert.deepEqual(frame(study.actor),before);
  study.advance(3);assert.equal(study.view.phase,'wait');assert.equal(study.view.symbol.kind,'question');
  assert.equal(study.actor.spinV,0);assert.equal(study.actor.onceId,null);
});

test('hidden and reduced-motion approval restoration keeps a complete marker without stale entrances',()=>{
  const study=createRequestPerformance({calm:true});sync(study,[request()]);
  assert.equal(study.view.symbol.progress,1);assert.equal(study.view.symbol.tremor,0);
  study.setVisible(false);sync(study,[request('new')]);study.advance(60);study.setVisible(true);
  assert.equal(study.view.phase,'wait');assert.equal(study.view.symbols.length,1);
  sync(study,[],'idle');study.advance(EXIT_DURATION/2);assert.equal(study.view.symbol.lift,0);
  study.advance(EXIT_DURATION);assert.equal(study.view.symbol,null);
});
