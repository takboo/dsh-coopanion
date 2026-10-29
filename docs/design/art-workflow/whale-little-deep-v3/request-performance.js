// SPDX-License-Identifier: AGPL-3.0-or-later
// Local handoff study. The caller supplies folded facts; this module never answers a request.
import {Actor} from '../vendor/livelings/workspace/livelings.js';
import character from './character.js';
import {applyPose,samplePose,TIMING} from './storyboard-performance.js';

const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
const loops=new Set(['idle','working','thinking']);
export const EXIT_DURATION=.36;
export const MARKER_CHANGE_DURATION=.18;

export function sampleRequestPose(time,kind='question',{calm=false}={}) {
  const pose=samplePose(time,{calm});
  if(kind==='approval') {
    pose.symbol=clamp((time-TIMING.ask)/.65);
    pose.tremor*=.5;
  }
  return pose;
}

// Match the engine's whole-body transform, including drag-adjacent lean and breathing.
export function headAnchor(actor) {
  const breath=Math.sin(actor.time*2.2)*character.physics.breath*(actor.calm?.5:1);
  const x=-1.55*(1+actor.squash.value+breath*.6)*actor.scale.value;
  const y=-.72*(1-actor.squash.value-breath)*actor.scale.value;
  const angle=actor.spinAngle+actor.lean.value+actor.leanIn.value+actor.sway;
  const center=actor.bodyCenter();
  return {x:center.x+x*Math.cos(angle)-y*Math.sin(angle),y:center.y+x*Math.sin(angle)+y*Math.cos(angle)};
}

export function createRequestPerformance({sessionId='study-main',palette='deep',calm=false,
  initialState='working',activityActions={}}={}) {
  // Local storyboard loops may extend the continuation choices without replacing accepted actions.
  const activityIds=Object.keys(activityActions),allowedMoods=new Set([...loops,...activityIds]);
  if(activityIds.some(id=>id==='request-study'||character.actions[id]||activityActions[id]?.kind!=='loop')||!allowedMoods.has(initialState))
    throw new Error('Expected new local loop activities and a supported initial state');
  const definition={...character,actions:{...character.actions,
    ...activityActions,
    'request-study':{kind:'loop',enter(a){
      a.morph('rest',{squash:0,blink:false});
      a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;a.scale.target=1;
    }},
  }};
  const actor=new Actor(definition,{state:initialState,palette,seed:42,fidget:false});
  actor.calm=calm;
  for(let i=0;i<132;i++)actor.advance(1/120);
  let time=0,elapsed=0,mood=initialState,pending=[],primary=null,exit=null,markerChange=null;
  let interrupted=false,touchUntil=0,dragging=false,visible=true,pointer=null;

  function exitingSymbols() {
    if(!exit)return [];
    const progress=smooth((time-exit.started)/EXIT_DURATION);
    return exit.symbols.map(s=>({...s,opacity:s.opacity*(1-progress),
      lift:calm?0:progress*.12,scale:1-progress*.08,tremor:0}));
  }
  function symbol() {
    if(primary) {
      const pose=sampleRequestPose(elapsed,primary.kind,{calm});
      const opacity=markerChange?smooth((time-markerChange.started)/MARKER_CHANGE_DURATION):1;
      return {requestId:primary.id,kind:primary.kind,progress:pose.symbol,opacity,lift:0,scale:1,tremor:pose.tremor,anchor:headAnchor(actor)};
    }
    return exitingSymbols().at(-1)??null;
  }
  function symbols() {
    if(!primary)return exitingSymbols();
    const current=symbol();
    if(!markerChange)return [current];
    const progress=smooth((time-markerChange.started)/MARKER_CHANGE_DURATION);
    return [{...markerChange.symbol,opacity:markerChange.symbol.opacity*(1-progress),tremor:0},current];
  }
  function resume() {
    if(!dragging)actor.play(primary?'request-study':mood);
  }
  function apply() {
    if(primary) {
      const pose=sampleRequestPose(interrupted?Math.max(TIMING.end,elapsed):elapsed,primary.kind,{calm});
      if(time<touchUntil)pose.eyes={...pose.eyes,h:.76,topLid:.13};
      applyPose(actor,pose);
    }
    if(pointer)actor.lookAt(pointer.x,pointer.y);
  }
  return {
    actor,
    get time(){return time;},
    get view(){return {
      sessionId,mood,pendingIds:pending.map(p=>p.id),requestId:primary?.id??null,symbol:symbol(),symbols:symbols(),
      phase:dragging?'drag':time<touchUntil?'touch':primary?(interrupted?'wait':samplePose(elapsed).phase):exit?'exit':mood,
    };},
    // Request fields follow NotificationSnapshot.interactions; mood is the simulator's continuation choice.
    // This is not a Host adapter or an alternative request-settlement API.
    sync(facts) {
      if(typeof facts.sessionId!=='string'||!facts.sessionId.length||!allowedMoods.has(facts.mood)||!Array.isArray(facts.interactions))
        throw new Error('Expected a selected session, a supported activity and folded interactions');
      const next=[...new Map(facts.interactions.filter(p=>p.sessionId===facts.sessionId&&
        typeof p.id==='string'&&p.id.length&&['question','approval'].includes(p.kind)&&
        ['open','continued'].includes(p.state)).map(p=>[p.id,{id:p.id,kind:p.kind}])).values()];
      const switched=sessionId!==facts.sessionId,hadPending=Boolean(primary),oldSymbols=symbols();
      const oldId=primary?.id,oldKind=primary?.kind;
      sessionId=facts.sessionId;mood=facts.mood;pending=next;
      primary=pending.find(p=>p.id===oldId)??pending[0]??null;
      if(switched) {
        if(dragging)actor.release();dragging=false;touchUntil=0;exit=null;markerChange=null;
        pointer=null;actor.lookFree();elapsed=TIMING.end;interrupted=true;resume();apply();
      } else if(primary) {
        exit=null;
        if(!hadPending) {
          markerChange=null;
          interrupted=dragging||!visible||calm;elapsed=interrupted?TIMING.end:0;
          touchUntil=0;resume();apply();
        } else if(primary.id!==oldId) {
          elapsed=Math.max(elapsed,TIMING.end);interrupted=true;touchUntil=0;
          markerChange=oldKind!==primary.kind&&visible&&!calm?
            {started:time,symbol:oldSymbols.at(-1)}:null;
          apply();
        }
        // Removing one of several requests preserves the body and the already-present marker.
      } else if(hadPending) {
        const drawn=oldSymbols.filter(s=>s.progress>0&&s.opacity>0);
        exit=visible&&drawn.length?{started:time,symbols:drawn}:null;markerChange=null;
        touchUntil=0;resume();
      } else if(!dragging)resume();
    },
    advance(seconds) {
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative duration');
      if(!visible)return;
      const targetTime=time+seconds,targetElapsed=elapsed+(primary?seconds:0);
      for(let left=seconds;left>1e-9;) {
        const dt=Math.min(left,1/120);left-=dt;time+=dt;
        if(primary)elapsed+=dt;
        if(exit&&time-exit.started>=EXIT_DURATION)exit=null;
        if(markerChange&&time-markerChange.started>=MARKER_CHANGE_DURATION)markerChange=null;
        apply();actor.advance(dt);
      }
      // Preserve named sampling boundaries despite fixed-step floating-point accumulation.
      time=targetTime;elapsed=targetElapsed;
      if(exit&&time-exit.started>=EXIT_DURATION)exit=null;
      if(markerChange&&time-markerChange.started>=MARKER_CHANGE_DURATION)markerChange=null;
      apply();
    },
    tap() {
      if(dragging)return;
      interrupted=true;touchUntil=time+.4;actor.blink();actor.poke(calm?.08:.2);
      apply();
    },
    beginDrag(point) {
      if(dragging)return;
      interrupted=true;touchUntil=0;dragging=true;actor.grab(point);
    },
    drag(point){if(dragging)actor.drag(point);},
    release() {
      if(!dragging)return;
      actor.release();dragging=false;resume();apply();
    },
    lookAt(point) {
      pointer=point?{x:Math.max(-1,Math.min(1,point.x)),y:Math.max(-1,Math.min(1,point.y))}:null;
      if(!pointer)actor.lookFree();else apply();
    },
    setPalette(id) {
      const selected=character.palettes.find(p=>p.id===id);
      if(!selected)throw new Error(`Unknown request-study palette: ${id}`);
      actor.palette=selected;
    },
    setCalm(value) {
      calm=Boolean(value);actor.calm=calm;
      if(calm&&primary){markerChange=null;interrupted=true;elapsed=Math.max(elapsed,TIMING.end);apply();}
    },
    setVisible(value,{preserveActivity=false}={}) {
      visible=Boolean(value);
      if(!visible) {
        if(dragging)actor.release();dragging=false;touchUntil=0;pointer=null;actor.lookFree();
      } else {
        exit=null;markerChange=null;
        if(primary){elapsed=Math.max(elapsed,TIMING.end);interrupted=true;}
        if(!preserveActivity)resume();apply();
      }
    },
  };
}
