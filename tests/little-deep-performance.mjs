// Run with: node --test tests/little-deep-performance.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.HTMLElement ??= class {};
const {Actor}=await import('../docs/design/art-workflow/vendor/livelings/workspace/livelings.js');
const {default:character,tailPerformanceDuration}=await import('../docs/design/art-workflow/whale-little-deep-v3/character.js');

function advance(a,seconds) {
  for(let left=seconds;left>1e-8;left-=1/120)a.advance(Math.min(left,1/120));
}
function actor(state='idle',calm=false) {
  const a=new Actor(character,{state,palette:'deep',seed:42,fidget:false});
  a.calm=calm;advance(a,1);return a;
}

test('hiding includes preparation, the original curled-up whale, and a complete return',()=>{
  const a=actor();a.play('peek-tail');advance(a,.25);
  assert.equal(a.shapeKey,'rest','The whale looks first instead of disappearing immediately');
  assert(a.fxValue('eyesOpacity')>.95);
  advance(a,.45);assert(a.scale.value<.97,'The body contracts before hiding');
  advance(a,1.5);assert.equal(a.shapeKey,'tail');assert(a.fxValue('hidden')>.98);
  assert(a.fxValue('eyesOpacity')<.01);
  advance(a,1.35);assert.equal(a.shapeKey,'rest');
  assert(a.fxValue('eyesOpacity')<.01,'Eyes wait until the original body has arrived');
  advance(a,.70);assert(a.fxValue('eyesOpacity')>.95);
  assert(a.fxValue('hidden')<.02,'The original belly returns with the original head');
  assert(a.scale.value<.88,'It stays curled up until it decides to emerge fully');
  assert(Math.abs(a.faceX.value-character.face.x)<.02 && Math.abs(a.faceY.value-character.face.y)<.02,
    'The eyes retain their original place on the whale');
  assert.equal(a.target.length,a.rest.length);
  advance(a,tailPerformanceDuration.hide+1);
  assert.equal(a.state,'idle');assert.equal(a.shapeKey,'rest');
  assert(a.fxValue('hidden')<.01);assert(a.fxValue('eyesOpacity')>.99);
});

test('touching a thinking tail pauses, peeks once, and resumes thinking',()=>{
  const a=actor('thinking');a.tap();advance(a,.75);
  assert.equal(a.onceId,'peek-out');assert.equal(a.shapeKey,'rest');
  const elapsed=a.onceT;a.tap();assert.equal(a.onceT,elapsed,'Repeated taps must not restart the peek');
  advance(a,.6);assert(a.fxValue('tailMotion')<.01,'The tail settles while it watches');
  advance(a,tailPerformanceDuration.peek);
  assert.equal(a.state,'thinking');assert.equal(a.shapeKey,'tail');
  assert(a.fxValue('hidden')>.99);assert(a.fxValue('eyesOpacity')<.01);
  assert(a.fxValue('tailMotion')>.99,'The broad thinking motion resumes');
});

test('touching the hidden playful whale emerges into its previous visible state',()=>{
  const a=actor('waiting');a.play('peek-tail');advance(a,2);a.tap();
  advance(a,1);assert.equal(a.shapeKey,'rest');assert(a.scale.value<.9);
  advance(a,tailPerformanceDuration.peek);
  assert.equal(a.state,'waiting');assert.equal(a.shapeKey,'rest');
  assert(a.fxValue('hidden')<.01);assert(a.fxValue('eyesOpacity')>.99);
});

test('changing state interrupts every hiding phase without delayed re-hiding',()=>{
  for(const time of [.2,.65,1.5,3.1,4,5]) {
    const a=actor();a.play('peek-tail');advance(a,time);a.play('working');advance(a,8);
    assert.equal(a.state,'working',`Interrupted at ${time}s`);
    assert.equal(a.shapeKey,'rest');assert(a.fxValue('hidden')<.01);
    assert(a.fxValue('eyesOpacity')>.99);assert.equal(a.cues.tailBeat,null);
  }
  const a=actor('thinking');a.tap();advance(a,1);a.play('sleep');advance(a,6);
  assert.equal(a.state,'sleep');assert.equal(a.shapeKey,'rest');
  assert(a.fxValue('hidden')<.01);assert.equal(a.expression,'closed');
});

test('reduced motion retains the preparation and peek, then returns cleanly',()=>{
  const a=actor('idle',true);a.play('peek-tail');advance(a,.25);
  assert.equal(a.shapeKey,'rest');advance(a,3.75);assert.equal(a.shapeKey,'rest');assert(a.scale.value<.9);
  advance(a,4);assert.equal(a.state,'idle');assert(a.fxValue('hidden')<.01);
});
