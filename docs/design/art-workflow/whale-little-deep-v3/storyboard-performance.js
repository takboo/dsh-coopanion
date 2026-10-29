// SPDX-License-Identifier: AGPL-3.0-or-later
// One continuous actor for the storyboard study; no Harness event adapter.
import {Actor} from '../vendor/livelings/workspace/livelings.js';
import character from './character.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const TIMING=Object.freeze({ask:.15,relax:1.05,end:1.5});
export const KEYFRAMES=Object.freeze({settle:.12,ask:.70,wait:1.5});

export function samplePose(time,{calm=false}={}) {
  const t=Math.max(0,time);
  const release=smooth(t/.25),open=smooth((t-.02)/.23),energy=1-release;
  const turn=smooth((t-.08)/.48),tailTurn=smooth((t-.20)/.50);
  const relax=smooth((t-1.0)/.50),phase=t*4.8+.35;
  const waiting=Math.max(0,t-TIMING.end),idle=smooth(waiting/.5);
  const pose={
    phase:t<TIMING.ask?'settle':t<TIMING.relax?'ask':t<TIMING.end?'relax':'wait',
    rootX:Math.sin(t*1.3+.2)*.09*energy,
    lean:Math.sin(t*1.3+.2)*.025*energy-.018*Math.sin(Math.PI*smooth(t/.12))+.22*turn-.09*relax,
    tail:mix(Math.sin(phase)*.09,-.02,release)-.10*tailTurn+.08*relax+Math.sin(waiting*1.4)*.012*idle,
    fin:mix(Math.sin(phase)*.35,.08,release)+.06*turn-.12*relax+Math.sin(waiting*1.1)*.008*idle,
    // A small natural eye shift supports the expression; eye contact is not an acceptance goal.
    look:[mix(.3,.05,open),mix(.6,.1,open)],
    eyes:{w:mix(.95,1,open),h:mix(.86,1.03,open)-.06*relax,topLid:.14*(1-open)+.04*relax},
    symbol:clamp((t-TIMING.ask)/(TIMING.relax-TIMING.ask)),tremor:mix(1,.35,relax),
  };
  if(calm) {
    pose.rootX*=.28;pose.lean*=.28;pose.tail*=.28;pose.fin*=.28;pose.tremor=0;
  }
  return pose;
}

export function applyPose(actor,pose) {
  actor.lookAt(...pose.look);actor.express({...pose.eyes,asym:character.eyes.asym});
  actor.rootX.target=pose.rootX;actor.lean.target=pose.lean;
  actor.fx('tail').target=pose.tail;actor.fx('fin').target=pose.fin;
}

export function createPerformance({palette='deep',calm=false}={}) {
  let actor,time=0;
  const pose=()=>samplePose(time,{calm});
  function setPalette(id) {
    const selected=character.palettes.find(p=>p.id===id);
    if(!selected)throw new Error(`Unknown storyboard palette: ${id}`);
    palette=id;actor.palette=selected;
  }
  function reset() {
    time=0;
    const definition={...character,actions:{...character.actions,
      'storyboard-performance':{kind:'loop',enter(a){applyPose(a,pose());}},
    }};
    actor=new Actor(definition,{state:'storyboard-performance',palette,seed:42,fidget:false});
    actor.calm=calm;
    for(let i=0;i<132;i++)actor.advance(1/120);
  }
  function advance(seconds) {
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative duration');
    for(let remaining=seconds;remaining>1e-9;) {
      const dt=Math.min(remaining,1/120);time+=dt;remaining-=dt;
      applyPose(actor,pose());actor.advance(dt);
    }
  }
  reset();
  return {
    get actor(){return actor;},get time(){return time;},get duration(){return TIMING.end;},
    get pose(){return pose();},
    advance,setPalette,
    seek(seconds){
      const target=Math.max(0,Math.min(TIMING.end,seconds));
      reset();advance(target);
      // Fixed-step accumulation may finish a fraction below a named boundary.
      time=target;applyPose(actor,pose());
    },
  };
}
