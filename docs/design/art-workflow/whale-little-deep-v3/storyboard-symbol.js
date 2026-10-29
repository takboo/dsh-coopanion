// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared unbacked stroke artwork for the entrance and request-handoff studies.
const clamp = n => Math.max(0,Math.min(1,n));
const smooth = n => {const t=clamp(n);return t*t*(3-2*t);};
const mix = (a,b,t) => a+(b-a)*t;

// Draw the hook by travelled distance, so it grows from the tip of the pen.
function sampleStroke(curves) {
  const points=[];
  for(const [p0,p1,p2,p3] of curves) {
    for(let i=points.length?1:0;i<=40;i++) {
      const t=i/40,u=1-t;
      const x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0];
      const y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];
      const last=points.at(-1);
      points.push({x,y,distance:last?last.distance+Math.hypot(x-last.x,y-last.y):0});
    }
  }
  return points;
}
const question=sampleStroke([
  [[-.39,-.29],[-.51,-.72],[.20,-.85],[.40,-.48]],
  [[.40,-.48],[.66,-.08],[.00,-.06],[-.035,.25]],
]);
const exclamation=sampleStroke([
  [[-.06,-.65],[-.085,-.39],[.045,-.01],[.015,.23]],
]);

function strokePrefix(g,points,progress) {
  if(progress<=0)return;
  const distance=points.at(-1).distance*clamp(progress);
  g.beginPath();g.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++) {
    const p=points[i],previous=points[i-1];
    if(p.distance>distance) {
      const t=(distance-previous.distance)/(p.distance-previous.distance);
      g.lineTo(mix(previous.x,p.x,t),mix(previous.y,p.y,t));break;
    }
    g.lineTo(p.x,p.y);
  }
  g.stroke();
}

export function drawSymbol(g, actor, layout, progress, symbol, palette, time=0, activity=0, options={}) {
  if (progress<=0) return;
  const size = layout.R*.47*(options.scale??1);
  const center=actor.bodyCenter(), angle=actor.lean.value;
  // Float ahead of the left-facing head; the symbol has its own small tremor.
  // Attachment during shape changes remains outside this storyboard study.
  const x=-1.55, y=-.72;
  const anchor=options.anchor?{x:layout.cx+options.anchor.x*layout.R,y:layout.cy+(options.anchor.y-(options.lift??0))*layout.R}:{
    x:layout.cx+(center.x+x*Math.cos(angle)-y*Math.sin(angle))*layout.R,
    y:layout.cy+(center.y+x*Math.sin(angle)+y*Math.cos(angle))*layout.R,
  };
  const tremor=options.calm?0:Math.min(progress*3,1)*activity;
  const shakeX=tremor*(Math.sin(time*23)*.027+Math.sin(time*37)*.012);
  const shakeY=tremor*Math.sin(time*29+.8)*.026;
  g.save();
  g.globalAlpha*=options.opacity??1;
  g.translate(anchor.x,anchor.y);
  g.scale(size,size);
  g.translate(shakeX,shakeY);
  g.rotate(-.09+tremor*Math.sin(time*19)*.035);
  g.strokeStyle=g.fillStyle=palette==='night'?'#bdd0ff':actor.palette.outline;
  g.lineWidth=.14;g.lineCap='round';g.lineJoin='round';
  strokePrefix(g,symbol==='question'?question:exclamation,smooth(progress/.84));
  const dot=smooth((progress-.86)/.14);
  if(dot>0) {
    g.beginPath();g.ellipse(-.055,.55,.115*dot,.10*dot,-.2,0,Math.PI*2);g.fill();
  }
  g.restore();
}
