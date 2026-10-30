// SPDX-License-Identifier: AGPL-3.0-or-later
// Whale-water adaptation of Livelings Celebrate's launch, spread and falling aftermath.
// The pinned vendor code and the whale's anatomy are unchanged.
import character from './character.js';
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const SPOUT_TIMING=Object.freeze({fan:.14,jetEnd:.68,end:1.7,cutFade:.16});
export function spoutAnchor(a){
  const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1);
  const x=.02*(1+a.squash.value+breath*.6)*a.scale.value,y=-.98*(1-a.squash.value-breath)*a.scale.value;
  const angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway,c=a.bodyCenter();
  return {x:c.x+x*Math.cos(angle)-y*Math.sin(angle),y:c.y+x*Math.sin(angle)+y*Math.cos(angle)};
}
function colors(a){return a.palette.id==='night'?{ink:'#4a9fc9',water:'#78cfff',light:'#bcecff',shine:'#effcff'}:
  {ink:'#287fab',water:'#37a7de',light:'#75ceef',shine:'#e5faff'};}
export function createCompletionSpout(a){return {age:0,cutAt:null,fan:false,anchor:spoutAnchor(a)};}
export function advanceCompletionSpout(effect,a,dt){
  effect.age+=dt;
  if(effect.cutAt===null)effect.anchor=spoutAnchor(a);
  if(!effect.fan&&effect.cutAt===null&&effect.age>=SPOUT_TIMING.fan){
    effect.fan=true;const c=effect.anchor,p=colors(a),n=a.calm?2:22;
    for(let i=0;i<n;i++){
      const side=i%2?-1:1,main=i<14,spread=main?1.25+a.rand()*1.05:.4+a.rand()*.6;
      a.emit({kind:'drop',x:c.x+side*(a.calm?.04:.16+a.rand()*.28),y:c.y-(a.calm?.36:.86)+(a.rand()-.5)*.09,
        vx:side*spread*(a.calm?.25:1),vy:a.calm?-.65:-.7-a.rand()*.9,
        ay:a.calm?4.5:4.6,drag:.65,life:a.calm?1:main?1.05+a.rand()*.25:.8+a.rand()*.3,
        size:a.calm?.10:main?.065+a.rand()*.03:.025+a.rand()*.02,
        rot:side*-.35,vrot:side*.5,color:i%3===0?p.light:p.water});
    }
  }
  return effect.age<(effect.cutAt===null?SPOUT_TIMING.end:effect.cutAt+SPOUT_TIMING.cutFade);
}
export function cutCompletionSpout(effect){if(effect&&effect.cutAt===null)effect.cutAt=effect.age;}
export function completionSpoutPose(effect,calm=false){
  if(!effect)return null;
  const age=effect.age,t=Math.min(age,effect.cutAt??age),cut=effect.cutAt===null?1:1-smooth((age-effect.cutAt)/SPOUT_TIMING.cutFade);
  return {height:(calm?.42:1.02)*smooth(t/.12),bend:Math.sin(t*12)*.014,
    bloom:smooth((t-.10)/.15)*(calm?.45:1),opacity:(1-smooth((age-.38)/(SPOUT_TIMING.jetEnd-.38)))*cut};
}
export function drawCompletionSpout(g,actor,layout,effect){
  if(!effect)return;
  const pose=completionSpoutPose(effect,actor.calm);if(pose.opacity<.001)return;
  const R=layout.R,p=colors(actor),h=R*pose.height;
  const w=R*(actor.calm?.035:.055),bend=pose.bend*R;
  g.save();g.translate(layout.cx+effect.anchor.x*R,layout.cy+effect.anchor.y*R);g.globalAlpha=pose.opacity;
  const grad=g.createLinearGradient(0,0,0,-Math.max(h,1));grad.addColorStop(0,p.water);grad.addColorStop(.65,p.light);grad.addColorStop(1,p.shine);
  g.fillStyle=grad;g.strokeStyle=p.ink;g.lineWidth=Math.max(1,R*.018);g.lineJoin='round';
  g.beginPath();g.moveTo(-w,0);g.bezierCurveTo(-w*1.1,-h*.35,bend-R*.11,-h*.78,bend-R*.06,-h);
  g.quadraticCurveTo(bend,-h-R*.035,bend+R*.06,-h);g.bezierCurveTo(bend+R*.11,-h*.78,w*1.1,-h*.35,w,0);g.closePath();g.fill();g.stroke();
  g.strokeStyle=p.shine;g.lineWidth=Math.max(1,R*.025);g.lineCap='round';g.beginPath();g.moveTo(0,-R*.04);g.quadraticCurveTo(-R*.025,-h*.5,bend,-h*.91);g.stroke();
  const bloom=pose.bloom;
  for(const side of [-1,1]){
    g.beginPath();g.moveTo(bend,-h*.94);g.bezierCurveTo(side*R*.15*bloom,-h-R*.20*bloom,side*R*.43*bloom,-h-R*.18*bloom,side*R*.59*bloom,-h+R*.09*bloom);
    g.strokeStyle=p.ink;g.lineWidth=R*.085*bloom;g.stroke();g.strokeStyle=p.light;g.lineWidth=R*.052*bloom;g.stroke();
  }
  g.restore();
}
