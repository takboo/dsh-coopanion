import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.HTMLElement??=class {};
const {createReferenceCelebration,referenceWaterColors}=await import('../docs/design/art-workflow/whale-little-deep-v3/reference-celebration.js');
const {default:character}=await import('../docs/design/art-workflow/whale-little-deep-v3/character.js');
const pose=a=>[a.height,a.vy,a.lean.value,a.squash.value,a.scale.value,a.time,...a.base.flatMap(p=>[p.x,p.y])];
test('the original whale anatomy, physics and eyes remain the same throughout one celebration',()=>{
  const p=createReferenceCelebration(),a=p.actor;assert.equal(a.def.rest,character.rest);assert.equal(a.def.physics,character.physics);assert.equal(a.def.eyes,character.eyes);
  for(const t of [.15,.4,.8,1.25,2,2.85]){p.advance(t-p.time);assert.equal(p.actor,a);assert.equal(a.shapeKey,'rest');}
  assert.equal(p.view.jets,1);assert.equal(p.view.launches,1);assert.equal(p.view.landings,1);assert.equal(p.actor.particles.length,0);
  p.advance(40);assert.equal(p.time,p.duration);assert.equal(p.view.jets,1);assert.equal(p.view.landings,1);
});
test('standalone spouting makes two pressure pulses and freely moving drops rather than a held layout',()=>{
  const p=createReferenceCelebration({kind:'spout'});p.advance(.34);assert.equal(p.view.jets,0);p.advance(.16);
  const drops=p.actor.particles.filter(x=>x.studyKind==='jet'),drop=drops[0],vy=drop.vy,x=drop.x,y=drop.y,pressure=p.view.pressure;
  assert.equal(p.view.jets,1);assert.equal(drops.length,11);assert(vy<0);p.advance(.42);
  assert(drop.vy>0);assert(drop.x!==x&&drop.y!==y);assert(p.view.pressure<pressure);assert(p.actor.particles.includes(drop));
  p.advance(4);assert.equal(p.view.jets,2);assert.equal(p.view.launches,0);assert.equal(p.view.landings,0);assert.equal(p.actor.particles.length,0);assert.equal(p.view.rainbow,0);
});
test('launch, turning, rainbow and landing spray form one ordered action',()=>{
  const p=createReferenceCelebration();p.advance(.15);const before=p.actor.height;p.advance(.4);
  assert(p.actor.height<before-.1);assert(p.actor.lean.value<-.15);assert(p.view.rainbow>.5);
  p.advance(.56);assert(p.actor.lean.value>0);p.advance(.2);
  assert.deepEqual(p.view.events.map(x=>x.type),['launch','jet','landing']);assert.equal(p.actor.particles.filter(x=>x.studyKind==='splash').length,12);
  p.advance(2);assert.equal(p.view.rainbow,0);assert.equal(p.view.drops,0);
});
test('visibility freezes water, pressure and body without replaying bursts on resume',()=>{
  const p=createReferenceCelebration({kind:'spout'});p.advance(.5);const before=pose(p.actor),particles=structuredClone(p.actor.particles),v=p.view;
  p.setVisible(false);p.advance(60);assert.deepEqual(pose(p.actor),before);assert.deepEqual(p.actor.particles,particles);assert.equal(p.view.pressure,v.pressure);
  p.setVisible(true);p.advance(.2);assert.equal(p.view.jets,1);assert.equal(p.actor.particles[0].studyId,particles[0].studyId);
});
test('seeking reproduces the canonical action; palette changes preserve the current performance',()=>{
  for(const kind of ['spout','celebrate']){const p=createReferenceCelebration({kind});for(const t of [.1,.48,.95,1.45,2.3]){
    const reference=createReferenceCelebration({kind});reference.advance(t);p.seek(t);assert.deepEqual(p.view,reference.view);assert.deepEqual(pose(p.actor),pose(reference.actor));assert.deepEqual(p.actor.particles,reference.actor.particles);
  }const before=pose(p.actor),view=p.view;p.setPalette('night');assert.deepEqual(pose(p.actor),before);assert.deepEqual(p.view,view);p.seek(0);assert.equal(p.view.jets,0);assert.equal(p.actor.particles.length,0);}
  assert.throws(()=>createReferenceCelebration({kind:'unknown'}));assert.throws(()=>createReferenceCelebration().advance(NaN));
});
test('reduced motion lowers the jump and particle count while keeping one complete outcome',()=>{
  const a=createReferenceCelebration(),b=createReferenceCelebration({calm:true}),ay=a.actor.height,by=b.actor.height;a.advance(.5);b.advance(.5);
  assert(Math.abs(b.actor.height-by)<Math.abs(a.actor.height-ay)*.7);assert.equal(b.view.rainbow,0);assert.equal(b.view.drops,3);
  b.advance(4);assert.equal(b.view.jets,1);assert.equal(b.view.landings,1);assert.equal(b.actor.particles.length,0);
});
test('rainbow light is born with released spray, persists through the water and follows the paused animation clock',()=>{
  const p=createReferenceCelebration();p.advance(.20);assert.equal(p.view.rainbow,0);assert.equal(p.view.rainbowOrigin,null);
  p.advance(.35);assert(p.view.rainbow>.5);const origin=p.view.rainbowOrigin;
  p.advance(1.2);assert(p.view.rainbow>.95);assert(p.view.drops>0);const light=p.view.rainbow;
  p.setVisible(false);p.advance(80);assert.equal(p.view.rainbow,light);assert.deepEqual(p.view.rainbowOrigin,origin);
  p.setVisible(true);p.advance(.4);assert(p.view.rainbow<light);assert.equal(p.view.drops,0);assert.deepEqual(p.view.rainbowOrigin,origin);
  p.advance(.4);assert(p.view.rainbow<.05);p.advance(1);assert.equal(p.view.rainbow,0);
});
test('water stays a restrained blue-white, including already-emitted drops after a palette change',()=>{
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const chroma=h=>Math.max(...rgb(h))-Math.min(...rgb(h));
  const p=createReferenceCelebration({kind:'spout'});p.advance(.5);
  for(const palette of ['deep','night']){
    const before=p.actor.particles.map(x=>[x.studyId,x.x,x.y,x.vx,x.vy,x.age]);p.setPalette(palette);
    const colors=referenceWaterColors(p.actor),[r,g,b]=rgb(colors.drop);assert(b>g&&g>r);assert(chroma(colors.drop)<chroma(p.actor.palette.body));assert(Math.min(...rgb(colors.core))>240);
    assert(p.actor.particles.filter(x=>x.kind==='drop').every(x=>x.color===colors.drop));assert.deepEqual(p.actor.particles.map(x=>[x.studyId,x.x,x.y,x.vx,x.vy,x.age]),before);
  }
});
