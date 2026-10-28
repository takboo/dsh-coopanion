// SPDX-License-Identifier: MIT
// Flukes adapted from DeepSeek Harness FishLogo.tsx; stem locally shaped.
// Copyright (c) 2026 DeepSeek. Full notice: reference/harness/LICENSE.
// Solid silhouette and turning motion are local adaptations of the supplied GIF.

// Preserve the endpoints of an open outline. A closed whole-body resample
// otherwise gives the same flukes different knots in each appearance.
export function sampleOpenPath(points,count) {
  const lengths=[0];
  for(let i=1;i<points.length;i++) lengths.push(lengths.at(-1)
    +Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  let segment=1;
  return Array.from({length:count},(_,i)=>{
    const distance=lengths.at(-1)*i/(count-1);
    while(segment<points.length-1 && lengths[segment]<distance)segment++;
    const t=(distance-lengths[segment-1])/(lengths[segment]-lengths[segment-1]||1);
    const a=points[segment-1],b=points[segment];
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  });
}

export const TAIL_ATTACHMENT={x:1.05,y:-.35,angle:.05,scale:.60};
export const TAIL_FLUKE_Y=-.20;
export const TAIL_HEIGHT=1.34;

// Official logo's curled flukes, with a short curved stem instead of the
// running icon's long upright stalk. Both appearances use this same contour.
const start = [19.18,6.75];
const curves = [
  [19.30,6.42,19.45,6.22,19.4222,6.09732],
  [19.4182,5.93231,19.4562,5.86831,19.6447,5.84931],
  [20.1657,5.78931,20.6712,5.64681,21.1357,5.3913],
  [22.4833,4.65528,23.0268,3.44624,23.1548,1.9972],
  [23.1738,1.77569,23.1508,1.54668,22.9168,1.43018],
  [22.6713,1.31018,22.5658,1.53918,22.4223,1.65519],
  [22.3733,1.69269,22.3318,1.74169,22.2903,1.78669],
  [21.9317,2.1697,21.5127,2.42121,20.9657,2.39121],
  [20.1657,2.34621,19.4827,2.59771,18.8787,3.20973],
  [18.7502,2.45521,18.3236,2.0047,17.6746,1.71569],
  [17.3351,1.56568,16.9916,1.41518,16.7536,1.08867],
  [16.5876,.856163,16.5421,.597155,16.4591,.341647],
  [16.4061,.187643,16.3536,.0301382,16.1761,.00363739],
  [15.9836,-.0263635,15.9081,.135141,15.8326,.270145],
  [15.5306,.822162,15.4136,1.43018,15.4251,2.0462],
  [15.4516,3.43174,16.0366,4.53527,17.1991,5.3203],
  [17.3311,5.4103,17.3651,5.5003,17.3236,5.63181],
  [17.22,5.96,17.04,6.28,16.90,6.60],
];

// Close the official outer contour across the stem's base. Filling this one
// polygon gives a solid fluke and stem, with no inner stroke or cut-out.
function tailBoundary() {
  const line = [{x:start[0], y:start[1]}];
  for (const c of curves) {
    const from = line.at(-1);
    for (let n=1;n<=20;n++) {
      const t=n/20,u=1-t;
      line.push({x:u*u*u*from.x+3*u*u*t*c[0]+3*u*t*t*c[2]+t*t*t*c[4],
        y:u*u*u*from.y+3*u*u*t*c[1]+3*u*t*t*c[3]+t*t*t*c[5]});
    }
  }
  return sampleOpenPath(line.map(p=>({x:(p.x-18.04)/5,y:(p.y-6.675)/5})),48);
}

export function harnessTail() {
  const boundary=tailBoundary(),first=boundary[0],last=boundary.at(-1);
  const base=Array.from({length:48},(_,i)=>{
    const t=(i+1)/49;
    return {x:last.x+(first.x-last.x)*t,y:last.y+(first.y-last.y)*t};
  });
  return [...boundary,...base].map(p=>({x:p.x+.04,y:p.y+.95}));
}

// The full whale uses the very same flukes, rotated and joined at the stem.
export function attachedHarnessTail() {
  const {x,y,angle,scale}=TAIL_ATTACHMENT;
  return tailBoundary().reverse().map(p=>({
    x:x+scale*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),
    y:y+scale*(p.x*Math.sin(angle)+p.y*Math.cos(angle)),
  }));
}

export function detachTailPoint(p) {
  const {x,y,angle,scale}=TAIL_ATTACHMENT;
  const dx=(p.x-x)/scale,dy=(p.y-y)/scale;
  return {x:dx*Math.cos(angle)+dy*Math.sin(angle),y:-dx*Math.sin(angle)+dy*Math.cos(angle)};
}

export function bendThinkingTail(points,time,weight,calm) {
  if (!weight || calm) return;
  const phase=time*Math.PI*2/3;
  for (const p of points) {
    // GIF-like broadside → edge-on → broadside, with a visible left/right
    // sweep. Keep the lower stem planted and keep a little width edge-on.
    const height=Math.max(0,Math.min(1,(.95-p.y)/TAIL_HEIGHT));
    const fluke=Math.max(0,Math.min(1,(.95-p.y)/-TAIL_FLUKE_Y));
    const spread=.24+.76*Math.cos(phase)**2;
    const x=p.x-.04,y=p.y-.95;
    const projected=x*(1-weight*fluke*(1-spread));
    const angle=weight*height*Math.sin(phase)*.22;
    p.x=.04+Math.cos(angle)*projected-Math.sin(angle)*y
      +weight*Math.sin(phase)*.50*height**1.35;
    p.y=.95+Math.sin(angle)*projected+Math.cos(angle)*y
      +weight*Math.sin(phase*2)*.08*height;
  }
}
