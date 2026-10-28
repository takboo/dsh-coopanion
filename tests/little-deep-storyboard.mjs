import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement ??= class {};
const {createPerformance,samplePose,TIMING}=await import('../docs/design/art-workflow/whale-little-deep-v3/storyboard-performance.js');

function frame(study) {
  const a=study.actor;
  return [a.rootX.value,a.lean.value,a.fxValue('tail'),a.fxValue('fin'),a.look.x,a.look.y,a.eyes.h,a.eyes.topLid];
}

test('one actor carries the compact question entrance into waiting without pose resets',()=>{
  const study=createPerformance(),identity=study.actor,phases=[];
  let previous=frame(study);
  for(let i=0;i<Math.ceil((TIMING.end+2)*120);i++) {
    study.advance(1/120);
    assert.equal(study.actor,identity,'Automatic shot changes retain the same actor');
    const current=frame(study);
    current.forEach((value,index)=>{
      assert(Number.isFinite(value));
      assert(Math.abs(value-previous[index])<.035,'A frame cannot jump to a new pose');
    });
    previous=current;
    if(phases.at(-1)!==study.pose.phase)phases.push(study.pose.phase);
    if(study.time>TIMING.end)assert.equal(study.pose.symbol,1,'Waiting retains the completed question');
  }
  assert.deepEqual(phases,['settle','ask','relax','wait']);
  assert(Math.abs(study.actor.lean.value-.13)<.005,'Waiting relaxes from the asking angle');
});

test('target trajectories are continuous across shot boundaries, including visible symbol motion',()=>{
  const values=pose=>[pose.rootX,pose.lean,pose.tail,pose.fin,...pose.look,
    pose.eyes.w,pose.eyes.h,pose.eyes.topLid,pose.symbol,pose.tremor*Math.min(1,pose.symbol*3)];
  for(const boundary of [TIMING.ask,TIMING.relax,TIMING.end]) {
    const before=values(samplePose(boundary-1e-6)),after=values(samplePose(boundary+1e-6));
    before.forEach((value,index)=>assert(Math.abs(value-after[index])<.0001,`Target discontinuity at ${boundary}s`));
  }
});

test('seeking reconstructs the same physical pose and changing palette retains playback state',()=>{
  const live=createPerformance(),scrubbed=createPerformance(),target=.70;
  for(let i=0;i<83;i++)live.advance(1/120);
  live.advance(target-83/120);scrubbed.seek(target);
  frame(live).forEach((value,index)=>assert(Math.abs(value-frame(scrubbed)[index])<1e-6));
  const identity=live.actor,before=frame(live),time=live.time;
  live.setPalette('night');
  assert.equal(live.actor,identity);assert.equal(live.time,time);assert.deepEqual(frame(live),before);
  assert.equal(live.actor.palette.id,'night');
});

test('the question starts during the reaction, forms within the entrance, and remains in calm waiting',()=>{
  const study=createPerformance();assert.equal(study.duration,1.5);assert.equal(study.pose.symbol,0);
  study.advance(.2);
  assert(study.pose.symbol>0,'The question starts while the initial reaction is still unfolding');
  assert(study.pose.eyes.topLid>0,'The eye change overlaps the symbol entrance');
  study.advance(.5);assert(study.pose.symbol<.84,'The hook is drawn before the dot');
  study.advance(.35);assert(Math.abs(study.pose.symbol-1)<1e-9,'The symbol is complete before the waiting pose');
  study.advance(3);assert.equal(study.pose.phase,'wait');assert.equal(study.pose.symbol,1);
  const calm=createPerformance({calm:true});let peak=0;
  for(let i=0;i<TIMING.end*120;i++) {
    calm.advance(1/120);peak=Math.max(peak,Math.abs(calm.actor.lean.value));assert.equal(calm.pose.tremor,0);
  }
  assert(peak<.075,'Calm mode limits body rotation');assert.equal(calm.pose.symbol,1);
});
