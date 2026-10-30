// SPDX-License-Identifier: AGPL-3.0-or-later
// Static design poses only. No clock, emission schedule or completion integration.
import {Actor,renderActor} from '../vendor/livelings/workspace/livelings.js';
import character from './character.js';
import {spoutAnchor} from './completion-spout.js';

export const SPOUT_FRAMES=Object.freeze([
  {id:'gather',title:'蓄势',detail:'轻收身体，眼睛稍眯；水花尚未出现。',lean:.035,hover:.10,fin:.12,tail:-.025,squash:.035,eyes:{h:.76,topLid:.14}},
  {id:'open',title:'展开',detail:'短水束与分离水滴，向上、向两侧甩开。',lean:-.075,hover:.23,fin:.58,tail:.045,squash:-.015,eyes:'happy'},
  {id:'fall',title:'落散',detail:'水冠散成六颗大水滴，从两侧落下。',lean:-.025,hover:.15,fin:.22,tail:.015,squash:0,eyes:'proud'},
]);
export const SPOUT_OPEN_DROPS=Object.freeze([
  [-.06,-.58,.082,3.05],[-.33,-.67,.115,2.10],[.29,-.61,.105,-2.25],
  [-.68,-.39,.095,1.0],[.64,-.27,.12,-1.10],[.58,-.67,.065,-1.65],
].map(([x,y,r,turn],id)=>Object.freeze({id,x,y,r,turn})));

export function createSpoutFrame(frame,palette='deep'){
  const pose=a=>{
    a.morph('rest',{squash:0,blink:false});a.scale.target=1;a.rootX.target=0;
    a.lean.target=frame.lean;a.hover.target=frame.hover;a.squash.target=frame.squash;
    a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;a.fx('fin').target=frame.fin;
    a.fx('tail').target=frame.tail;a.fx('ripple').target=0;a.fx('belly').target=0;
    a.express(frame.eyes);a.lookAt(-.4,-.18);
  };
  const definition={...character,actions:{...character.actions,'spout-static':{kind:'loop',enter:pose,tick:pose}}};
  const actor=new Actor(definition,{state:'spout-static',palette,seed:42,fidget:false});
  for(let i=0;i<132;i++){pose(actor);actor.advance(1/120);}
  return actor;
}

function drop(g,x,y,r,turn){
  g.save();g.translate(x,y);g.rotate(turn);g.beginPath();g.moveTo(0,-r*1.35);
  g.bezierCurveTo(r*.32,-r*.75,r,-r*.13,r,r*.35);
  g.bezierCurveTo(r,r*1.25,-r,r*1.25,-r,r*.35);
  g.bezierCurveTo(-r,-r*.13,-r*.32,-r*.75,0,-r*1.35);g.closePath();g.fill();g.stroke();g.restore();
}

export function drawSpoutArtwork(g,actor,layout,{anchor=spoutAnchor(actor),jet=0,jetOpacity=1,drops=[]}={}){
  const c=anchor,night=actor.palette.id==='night';
  g.save();g.translate(layout.cx+c.x*layout.R,layout.cy+c.y*layout.R);g.scale(layout.R,layout.R);
  g.fillStyle=night?'#a8c2ff':'#9bb8ff';g.strokeStyle=night?'#708fc7':'#5d7bdb';
  g.lineWidth=.026;g.lineJoin='round';g.lineCap='round';
  if(jet>0&&jetOpacity>0){
    g.save();g.globalAlpha*=jetOpacity;g.scale(1,jet);
    // Air gaps and outward-facing drop heads replace the solid, three-lobed crown.
    g.beginPath();g.moveTo(-.035,.005);
    g.bezierCurveTo(-.038,-.10,-.07,-.24,-.11,-.31);
    g.quadraticCurveTo(-.06,-.36,-.02,-.32);
    g.bezierCurveTo(.025,-.24,.045,-.10,.045,.005);
    g.closePath();g.fill();g.stroke();
    g.restore();
  }
  for(const p of drops){g.save();g.globalAlpha*=p.opacity??1;drop(g,p.x,p.y,p.r,p.turn);g.restore();}
  g.restore();
}

export function drawSpoutFrameWater(g,actor,layout,id){
  if(id==='gather')return;
  const drops=id==='open'?SPOUT_OPEN_DROPS:
    [[-1.35,-.05,.12,-.48],[-.85,-.55,.10,-.30],[-.25,-.91,.115,-.10],[.40,-.83,.095,.26],[1.15,-.85,.135,.45],[1.9,-.15,.09,.62]].map(([x,y,r,turn])=>({x,y,r,turn}));
  drawSpoutArtwork(g,actor,layout,{jet:id==='open'?1:0,drops});
}

export function renderSpoutFrame(canvas,actor,id,{size=150,background='light'}={}){
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=background==='night'?'#19263f':'#e8eef8';g.fillRect(0,0,b.width,b.height);
  const layout={cx:b.width*.44,cy:b.height*.69,R:size/3.3,shadow:true};
  renderActor(g,actor,layout);drawSpoutFrameWater(g,actor,layout,id);
  Object.assign(canvas.dataset,{rendered:'true',frame:id,size:String(size),radius:String(layout.R),actorTime:String(actor.time)});
}
