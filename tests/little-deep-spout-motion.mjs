import assert from 'node:assert/strict';
import test from 'node:test';
globalThis.HTMLElement??=class {};
const {createSpoutMotion,sampleSpoutMotion,SPOUT_SCORE}=await import('../docs/design/art-workflow/whale-little-deep-v3/spout-motion.js');
const {SPOUT_OPEN_DROPS}=await import('../docs/design/art-workflow/whale-little-deep-v3/spout-shape-frames.js');
const springs=a=>[a.lean.value,a.hover.value,a.scale.value,a.squash.value,a.fxValue('fin'),a.time];
test('one spout develops into the accepted six-drop layout and ends without repeating',()=>{
  const p=createSpoutMotion(),actor=p.actor;p.advance(.49);assert.equal(p.view.drops.length,0);
  p.advance(SPOUT_SCORE.open-p.time);assert.equal(p.view.drops.length,6);
  for(const [i,d] of p.view.drops.entries()){const approved=SPOUT_OPEN_DROPS[i];assert.equal(d.id,approved.id);assert(Math.abs(d.x-approved.x)<1e-6);assert(Math.abs(d.y-approved.y)<1e-6);assert.equal(d.r,approved.r);assert.equal(d.turn,approved.turn);}
  p.advance(10);assert.equal(p.actor,actor);assert.equal(p.time,p.duration);assert.equal(p.view.phase,'rest');assert.equal(p.view.drops.length,0);assert.equal(p.view.jet,0);
  p.advance(10);assert.equal(p.time,p.duration);assert.equal(p.view.drops.length,0);
});
test('the open layout lingers gently before the same drops fall and fade',()=>{
  const a=sampleSpoutMotion(SPOUT_SCORE.open),b=sampleSpoutMotion(SPOUT_SCORE.holdEnd-1e-6),c=sampleSpoutMotion(2.3),d=sampleSpoutMotion(2.88);
  assert.equal(a.phase,'hold');assert.equal(b.phase,'hold');
  for(let i=0;i<6;i++){assert(Math.hypot(a.drops[i].x-b.drops[i].x,a.drops[i].y-b.drops[i].y)<.04);assert(c.drops[i].y>b.drops[i].y+.2);assert(Math.abs(c.drops[i].x)>Math.abs(b.drops[i].x));assert(d.drops[i].opacity<.02);assert.equal(c.drops[i].id,a.drops[i].id);}
  assert.deepEqual(sampleSpoutMotion(2.91).drops,[]);
});
test('hiding freezes body, water, and local time without a second launch on resume',()=>{
  const p=createSpoutMotion();p.advance(1.4);const view=p.view,body=springs(p.actor);p.setVisible(false);p.advance(90);
  assert.deepEqual(springs(p.actor),body);assert.equal(p.time,1.4);assert.deepEqual(p.view.drops,view.drops);
  p.setVisible(true);p.advance(.4);assert.equal(p.view.phase,'fall');assert.deepEqual(p.view.drops.map(d=>d.id),view.drops.map(d=>d.id));
});
test('emitted drops retain their origin as the body relaxes; palette preserves the current state',()=>{
  const p=createSpoutMotion();p.advance(1.2);const origin=p.view.origin;p.advance(1);assert.deepEqual(p.view.origin,origin);
  const actor=p.actor,view=p.view,body=springs(actor);p.setPalette('night');assert.equal(p.actor,actor);assert.deepEqual(p.view,view);assert.deepEqual(springs(actor),body);
});
test('keyframe seeking reproduces the same canonical performance and clears old water',()=>{
  const p=createSpoutMotion();for(const t of [.3,1.3,2.25,3.5]){const reference=createSpoutMotion();reference.advance(t);p.seek(t);assert.deepEqual(p.view,reference.view);assert.deepEqual(springs(p.actor),springs(reference.actor));}
  p.seek(0);assert.equal(p.view.drops.length,0);assert.equal(p.view.origin,null);assert.throws(()=>p.advance(Infinity));assert.throws(()=>p.seek(NaN));
});
test('reduced motion retains the accepted outcome and timing with lower body and falling travel',()=>{
  const a=sampleSpoutMotion(1.3),b=sampleSpoutMotion(1.3,{calm:true});assert.equal(a.drops.length,b.drops.length);assert(Math.abs(b.body.lean)<Math.abs(a.body.lean));
  const c=sampleSpoutMotion(2.6),d=sampleSpoutMotion(2.6,{calm:true});assert(d.drops.every((p,i)=>p.y<c.drops[i].y));assert.equal(sampleSpoutMotion(4.1,{calm:true}).drops.length,0);
});
