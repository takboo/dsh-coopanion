// SPDX-License-Identifier: AGPL-3.0-or-later
// Standalone slow spout study. It consumes no Host events or goal completion facts.
import {Actor} from '../vendor/livelings/workspace/livelings.js';
import character from './character.js';
import {SPOUT_FRAMES,SPOUT_OPEN_DROPS,drawSpoutArtwork} from './spout-shape-frames.js';
import {spoutAnchor} from './completion-spout.js';
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const SPOUT_SCORE=Object.freeze({launch:.50,open:1.10,holdEnd:1.70,fallEnd:2.90,settled:3.65,end:4.10});
const neutral={lean:0,hover:.13,fin:.10,tail:0,squash:0,eyes:'neutral'};
function blend(a,b,t){return {lean:mix(a.lean,b.lean,t),hover:mix(a.hover,b.hover,t),fin:mix(a.fin,b.fin,t),tail:mix(a.tail,b.tail,t),squash:mix(a.squash,b.squash,t),eyes:t<.5?a.eyes:b.eyes};}

export function sampleSpoutMotion(time,{calm=false}={}){
  const t=Math.max(0,Math.min(SPOUT_SCORE.end,time)),s=SPOUT_SCORE,[gather,open,fall]=SPOUT_FRAMES;
  let phase,body;
  if(t<s.launch){phase='gather';body=blend(neutral,gather,smooth(t/s.launch));}
  else if(t<s.open){phase='rise';body=blend(gather,open,smooth((t-s.launch)/(s.open-s.launch)));}
  else if(t<s.holdEnd){phase='hold';body={...open};}
  else if(t<s.fallEnd){phase='fall';body=blend(open,fall,smooth((t-s.holdEnd)/(s.fallEnd-s.holdEnd)));}
  else{phase=t<s.settled?'settle':'rest';body=blend(fall,neutral,smooth((t-s.fallEnd)/(s.settled-s.fallEnd)));}
  if(calm){body.lean*=.28;body.hover=.13+(body.hover-.13)*.28;body.fin*=.28;body.tail*=.28;body.squash*=.28;}
  let jet=0,jetOpacity=1,drops=[];
  if(t>=s.launch&&t<s.fallEnd){
    jet=smooth((t-s.launch)/.32);jetOpacity=1-smooth((t-s.holdEnd)/.38);
    drops=SPOUT_OPEN_DROPS.map(p=>{
      if(t<s.open){
        const u=clamp((t-s.launch-p.id*.018)/(s.open-s.launch-p.id*.018)),e=1-(1-u)**3;
        return {...p,x:calm?p.x:p.x*e,y:calm?p.y:mix(-.18,p.y,e),r:p.r*mix(.4,1,smooth(u)),opacity:smooth(u/.28)};
      }
      const h=clamp((t-s.open)/(s.holdEnd-s.open)),u=clamp((t-s.holdEnd)/(s.fallEnd-s.holdEnd));
      const side=Math.sign(p.x),drift=side*.022*smooth(h);
      // Give the right arc extra lateral travel beside the raised tail.
      const fallSpread=side>0?2.3*smooth(u):side*(.68+Math.abs(p.x)*.45)*(u*.65+u*u*.35);
      const down=(calm?.32:1.40)*u*u-.06*u;
      return {...p,x:p.x+drift+(calm?fallSpread*.35:fallSpread),y:p.y-.018*smooth(h)+down,
        turn:mix(p.turn,side>0?-.45:.45,smooth(u)),opacity:1-smooth((u-.55)/.45)};
    });
  }
  return {time:t,phase,body,jet,jetOpacity,drops};
}

export function createSpoutMotion({palette='deep',calm=false}={}){
  let time=0,visible=true,origin=null,actor;
  function apply(a){
    const p=sampleSpoutMotion(time,{calm}).body;
    a.morph('rest',{squash:0,blink:false});a.scale.target=1;a.rootX.target=0;
    a.lean.target=p.lean;a.hover.target=p.hover;a.squash.target=p.squash;
    a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;a.fx('fin').target=p.fin;
    a.fx('tail').target=p.tail;a.fx('ripple').target=0;a.fx('belly').target=0;
    a.express(p.eyes);a.lookAt(-.4,-.18);
  }
  function reset(){
    time=0;origin=null;
    const definition={...character,actions:{...character.actions,'spout-motion':{kind:'loop',enter:apply,tick:apply}}};
    actor=new Actor(definition,{state:'spout-motion',palette,seed:42,fidget:false});actor.calm=calm;
    for(let i=0;i<132;i++){apply(actor);actor.advance(1/120);}
  }
  function advance(seconds){
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite animation duration');
    if(!visible)return;
    const target=Math.min(SPOUT_SCORE.end,time+seconds);
    while(time<target-1e-9){const dt=Math.min(1/120,target-time);time+=dt;apply(actor);actor.advance(dt);
      if(!origin&&time>=SPOUT_SCORE.open-1e-8)origin=spoutAnchor(actor);}
    time=target;
  }
  reset();
  return {get actor(){return actor;},get time(){return time;},get duration(){return SPOUT_SCORE.end;},
    get view(){return {...sampleSpoutMotion(time,{calm}),origin:origin?{...origin}:null,visible};},advance,
    seek(value){if(!Number.isFinite(value))throw new Error('Expected a finite seek time');const shown=visible;reset();visible=true;advance(Math.max(0,Math.min(SPOUT_SCORE.end,value)));visible=shown;},
    setVisible(value){visible=Boolean(value);},
    setPalette(id){const p=character.palettes.find(p=>p.id===id);if(!p)throw new Error('Unknown palette');palette=id;actor.palette=p;},
  };
}

export function drawSpoutMotionWater(g,motion,layout){
  const v=motion.view;
  drawSpoutArtwork(g,motion.actor,layout,{jet:v.jet,jetOpacity:v.jetOpacity});
  drawSpoutArtwork(g,motion.actor,layout,{anchor:v.origin??spoutAnchor(motion.actor),drops:v.drops});
}
