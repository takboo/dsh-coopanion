// SPDX-License-Identifier: AGPL-3.0-or-later
// Local life gestures. These never award relationship credit or settle requests.
import {createSegmentPerformance} from './segment-performance.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function createLifeTouchPerformance({sessionId='life-touch',palette='deep',calm=false}={}) {
  const state={phase:'free',age:0,pressed:false,held:0,travel:0,idle:0,point:{x:-.4,y:-.2},last:null,wasPet:false,strength:.28};
  let segment,visible=true,freshOnRestore=false;
  const setPhase=phase=>{if(state.phase!==phase){state.phase=phase;state.age=0;}};
  function clear(){setPhase('free');state.pressed=false;state.last=null;state.held=0;state.travel=0;state.wasPet=false;}
  const lifePerformance={
    apply(a) {
      if(state.phase==='free')return false;
      const amp=a.calm?.28:1;
      let weight=state.phase==='notice'?0:state.phase==='pet'?.85:.28;
      if(state.phase==='afterglow')weight=state.strength*(1-smooth(state.age/(state.wasPet?1.3:.65)));
      a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
      a.scale.target=1;a.hover.target=.13;a.fx('belly').target=.15*weight;
      a.rootX.target=state.point.x*.045*amp;a.lean.target=(-.035-.19*weight)*amp;
      a.fx('fin').target=(.08+.12*weight)*amp;a.fx('tail').target=Math.sin(a.time*1.2)*.025*amp;
      a.lookAt(state.point.x,state.point.y);
      a.express({w:1,h:1.04-.70*weight,topLid:.02+.25*weight});
      return true;
    },
    advance(dt) {
      if(state.phase==='free')return false;
      state.age+=dt;
      if(state.pressed) {
        state.held+=dt;state.idle+=dt;
        if(state.held>=.32&&state.travel>=.30&&state.idle<.45){setPhase('pet');state.wasPet=true;}
        else if(state.phase==='pet'&&state.idle>=.45){setPhase('touch');state.travel=0;}
      }
      if(state.phase==='afterglow'&&state.age>=(state.wasPet?1.3:.65)) {
        clear();segment.restartLife();
      }
      return true;
    },
  };
  segment=createSegmentPerformance({sessionId,mode:'life',palette,calm,lifePerformance});
  function available(){const v=segment.view;return visible&&v.mode==='life'&&!v.pendingIds.length;}
  function point(value) {
    if(!value||![value.x,value.y].every(Number.isFinite))throw new Error('Expected a finite local pointer');
    return {x:Math.max(-1,Math.min(1,value.x)),y:Math.max(-1,Math.min(1,value.y))};
  }
  return {
    actor:segment.actor,
    get view(){return {...segment.view,interaction:{phase:state.phase,pressed:state.pressed,held:state.held,wasPet:state.wasPet}};},
    sync(value) {
      const previous=segment.view;segment.sync(value);const current=segment.view;
      if(current.mode==='work'||current.pendingIds.length)clear();
      else if(previous.pendingIds.length)segment.restartLife();
    },
    move(value) {
      const next=point(value);if(!available())return false;
      if(state.pressed&&state.last){const distance=Math.hypot(next.x-state.last.x,next.y-state.last.y);state.travel+=distance;if(distance>.012)state.idle=0;}
      state.point=next;state.last=next;if(state.phase==='free')setPhase('notice');return true;
    },
    press(value={x:-.4,y:-.2}) {
      const next=point(value);if(!available()||state.pressed)return false;
      Object.assign(state,{pressed:true,held:0,travel:0,idle:0,last:next,point:next,wasPet:false});
      setPhase('touch');segment.actor.blink();return true;
    },
    release() {
      if(!available()||!state.pressed)return false;
      state.pressed=false;state.last=null;state.wasPet=state.phase==='pet';state.strength=state.wasPet?.85:.28;setPhase('afterglow');return true;
    },
    leave(){if(available()&&!state.pressed&&state.phase==='notice'){state.wasPet=false;state.strength=0;setPhase('afterglow');}},
    cancel(){const active=state.phase!=='free';clear();if(active&&available())segment.restartLife();},
    tap(){if(!this.press())return false;return this.release();},
    advanceAnimation:segment.advanceAnimation,advanceEventTime:segment.advanceEventTime,
    setPalette:segment.setPalette,setCalm:segment.setCalm,
    setVisible(value) {
      const next=Boolean(value);
      if(!next){freshOnRestore=state.phase!=='free';clear();}
      visible=next;segment.setVisible(next);
      if(next&&freshOnRestore){if(segment.view.mode==='life')segment.restartLife();freshOnRestore=false;}
    },
  };
}
