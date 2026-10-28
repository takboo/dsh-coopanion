// Run with: node --test tests/little-deep-tail.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

// Import the browser engine in Node, recording its real smoothing path rather
// than depending on a native canvas package just for a geometry regression.
globalThis.HTMLElement ??= class {};
class RecordedPath {
  points = [];
  moveTo(x,y) { this.points.push({x,y}); }
  bezierCurveTo(ax,ay,bx,by,x,y) {
    const from=this.points.at(-1);
    for(let n=1;n<=20;n++) {
      const t=n/20,u=1-t;
      this.points.push({x:u*u*u*from.x+3*u*u*t*ax+3*u*t*t*bx+t*t*t*x,
        y:u*u*u*from.y+3*u*u*t*ay+3*u*t*t*by+t*t*t*y});
    }
  }
  closePath() {}
}
globalThis.Path2D=RecordedPath;
const {smoothPath}=await import('../docs/design/art-workflow/vendor/livelings/workspace/livelings.js');
const {whaleBody,bendTail}=await import('../docs/design/art-workflow/whale-little-deep-v3/character.js');
const {harnessTail,attachedHarnessTail,detachTailPoint,TAIL_FLUKE_Y}=await import('../docs/design/art-workflow/whale-little-deep-v3/harness-tail.js');

function tailRange(body) {
  const tail=attachedHarnessTail();
  const start=body.findIndex(p=>Math.hypot(p.x-tail[0].x,p.y-tail[0].y)<1e-9);
  assert(start>=0,'The body must retain the shared tail attachment point');
  return {start,end:start+tail.length-1};
}
function distanceToPath(p,path) {
  let nearest=Infinity;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
    nearest=Math.min(nearest,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
  }
  return nearest;
}

test('attached and standalone flukes keep the same rendered contour after alignment',()=>{
  const body=whaleBody(),range=tailRange(body);
  // Compare the real tail section of the whole-body smoothing path. The
  // round head may extend above the short stem in the same coordinate frame.
  const full=smoothPath(body.map(detachTailPoint)).points.slice(1+range.start*20,1+range.end*20);
  const pure=smoothPath(harnessTail().map(p=>({x:p.x-.04,y:p.y-.95}))).points;
  const deviation=Math.max(...pure.filter(p=>p.y<TAIL_FLUKE_Y-.05).map(p=>distanceToPath(p,full)),
    ...full.filter(p=>p.y<TAIL_FLUKE_Y-.05).map(p=>distanceToPath(p,pure)));
  assert(deviation<.01,`Aligned fluke deviation ${deviation.toFixed(5)} exceeds .01 body units`);
});

test('a whole-whale tail wave rotates its flukes without stretching them',()=>{
  const points=whaleBody(),before=structuredClone(points);
  bendTail(points,0,{calm:true,cues:{},fxValue:name=>name==='tail'?.45:0});
  const range=tailRange(before);
  const indices=before.flatMap((p,i)=>i>=range.start&&i<=range.end&&detachTailPoint(p).y<TAIL_FLUKE_Y-.05?[i]:[]);
  let error=0;
  for(const i of indices)for(const j of indices) {
    error=Math.max(error,Math.abs(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)
      -Math.hypot(before[i].x-before[j].x,before[i].y-before[j].y)));
  }
  assert(error<1e-9,`Tail wave changes fluke distances by ${error.toFixed(5)}`);
});
