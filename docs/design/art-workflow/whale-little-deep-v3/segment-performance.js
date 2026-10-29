// SPDX-License-Identifier: AGPL-3.0-or-later
// Explicit work/life intentions drive resumable phrases, never inferred thinking duration.
import {createRequestPerformance} from './request-performance.js';

const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
export const LIFE_DURATION=24;
export const RESUME_DURATION=.7;
export function lifePhase(time) {
  const t=time%LIFE_DURATION;
  return t<3?'stretch':t<7?'observe':t<12?'belly':t<16?'bubble':t<20?'rest':'return';
}

export function createSegmentPerformance({sessionId='segment-study',mode='work',palette='deep',calm=false,workId='work-1',lifePerformance=null,interactionPerformance=null,workStyle='concentrated'}={}) {
  if(lifePerformance&&(!['apply','advance'].every(key=>typeof lifePerformance[key]==='function')))
    throw new Error('Expected a local life performance with apply and advance');
  if(interactionPerformance&&!['apply','advance','active'].every(key=>typeof interactionPerformance[key]==='function'))throw new Error('Expected a local interaction performance');
  const context={mode:null,pending:[],eventTimeMs:0,lastFactMs:0,animationTime:0,visible:true,
    work:{id:workId,stage:'focus',group:'deep',clock:0,groupClock:0,tailPhase:0,tailSpeed:1,entries:0,
      initial:true,fromDepth:0,resumeClock:RESUME_DURATION,resumeFrom:0},
    life:{clock:0,entries:0,bubbleCycle:-1}};
  function workPose(a) {
    if(interactionPerformance?.apply(a))return;
    const w=context.work,amp=a.calm?.28:1,deep=w.group==='deep',lead=w.initial?.65:.12;
    let depth=deep?smooth((w.groupClock-lead)/.8):w.fromDepth*(1-smooth(w.groupClock/.85));
    if(w.resumeClock<RESUME_DURATION)depth=mix(w.resumeFrom,depth,smooth(w.resumeClock/RESUME_DURATION));
    a.morph(deep&&w.groupClock>=lead?'tail':'rest',{squash:0,blink:false});
    a.fx('hidden').target=depth;
    // Close the face before the silhouette contracts; reopen after surfacing has begun.
    a.fx('eyesOpacity').target=deep?1-smooth((w.groupClock-(lead-.18))/.18):1-smooth(depth/.65);
    a.scale.target=1-.22*depth;a.hover.target=.13-.04*depth;
    a.fx('tailMotion').target=1;a.cues.tailClock=w.tailPhase;
    if(deep) {
      a.express({w:1,h:.72,topLid:.16});a.lookAt(-.45,.4);
      a.rootX.target=Math.sin(w.clock*.8)*.02*amp;
      a.lean.target=(-.085*(1-depth)+Math.sin(w.clock*1.1)*.012)*amp;
      a.fx('fin').target=.65*(1-depth)*amp;a.fx('tail').target=Math.sin(w.clock*1.7)*.045*amp;
    } else if(w.group==='execute') {
      // Execution is a sustained, intent-driven phrase, not one surfacing per tool result.
      const review=w.stage==='focus';
      a.express({w:1,h:review?.66:.84,topLid:review?.22:.10});a.lookAt(review?-.25:-.8,review?-.2:.26);
      a.scale.target=.90;a.lean.target=(review?.055:-.17)*amp;a.rootX.target=-.065*amp;
      a.fx('fin').target=(review?.10:.42+Math.sin(w.clock*4)*.14)*amp;
      a.fx('tail').target=Math.sin(w.clock*(review?1.4:3.6))*(review?.025:.075)*amp;
    } else {
      a.express({w:1,h:1.03,topLid:.02});a.lookAt(-.75,-.10);
      a.rootX.target=-.025*amp;a.lean.target=.055*amp;
      a.fx('fin').target=(.28+Math.sin(w.clock*1.4)*.025)*amp;
      a.fx('tail').target=Math.sin(w.clock*1.5)*.035*amp;
    }
    a.fx('belly').target=0;a.fx('ripple').target=workStyle==='readable'?(deep?.18:.45):0;
  }
  function restPose(a) {
    if(interactionPerformance?.apply(a))return;
    a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
    a.scale.target=1;a.hover.target=.13;a.rootX.target=0;a.lean.target=0;
    a.fx('fin').target=.06;a.fx('belly').target=0;a.fx('ripple').target=0;
    a.fx('tail').target=Math.sin(a.time*1.2)*.025;a.express('neutral');
  }
  function lifePose(a) {
    if(lifePerformance?.apply(a))return;
    const t=context.life.clock%LIFE_DURATION,phase=lifePhase(context.life.clock),amp=a.calm?.28:1;
    a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
    a.scale.target=1;a.hover.target=.13;a.fx('belly').target=0;
    a.rootX.target=0;a.lean.target=0;a.fx('fin').target=.10*amp;
    a.fx('tail').target=Math.sin(context.life.clock*1.35)*.065*amp;
    if(phase==='stretch') {
      const open=Math.sin(Math.PI*t/3);a.lean.target=-.26*open*amp;
      a.fx('belly').target=.7*open;a.fx('fin').target=(.1+.8*open)*amp;
      a.express({h:.94,topLid:.05});a.lookAt(-.15,-.25);
    } else if(phase==='observe') {
      const u=(t-3)/4;a.rootX.target=-.22*Math.sin(Math.PI*u)*amp;
      a.lean.target=.13*Math.sin(u*Math.PI*2)*amp;
      a.express({h:1.06,topLid:0});a.lookAt(mix(-.85,.6,smooth((u-.35)/.4)),-.3);
    } else if(phase==='belly') {
      const open=Math.sin(Math.PI*(t-7)/5);a.rootX.target=.10*open*amp;
      a.lean.target=-.34*open*amp;a.fx('belly').target=open;a.fx('fin').target=(.1+.85*open)*amp;
      a.express({h:1-.4*open,topLid:.05+.09*open});a.lookAt(-.1,-.2);
    } else if(phase==='bubble') {
      const open=Math.sin(Math.PI*(t-12)/4);a.rootX.target=.18*open*amp;
      a.lean.target=.12*open*amp;a.hover.target=.13+.08*open*amp;
      a.fx('fin').target=(.1+.4*open)*amp;a.express({h:1.08,topLid:0});a.lookAt(-.7,-.65);
      const cycle=Math.floor(context.life.clock/LIFE_DURATION);
      if(t>=12.8&&context.life.bubbleCycle!==cycle) {
        context.life.bubbleCycle=cycle;const c=a.bodyCenter();
        a.emit({kind:'bubble',x:c.x-.88,y:c.y-.15,vx:-.08*amp,vy:a.calm?-.08:-.26,
          life:2.6,size:.14,grow:.04,color:a.palette.accent});
      }
    } else if(phase==='rest') {
      const rest=Math.sin(Math.PI*(t-16)/4);a.lean.target=.23*rest*amp;a.hover.target=.13-.035*rest;
      a.fx('tail').target=Math.sin(context.life.clock*1.1)*.018*amp;
      a.express({h:1-.55*rest,topLid:.03+.2*rest});a.lookAt(.1,.25);
    } else {
      const settle=Math.sin(Math.PI*(t-20)/4);a.rootX.target=-.06*settle*amp;
      a.lean.target=-.06*settle*amp;a.express({h:.96,topLid:.04});a.lookAt(-.4,-.1);
    }
  }
  const engine=createRequestPerformance({sessionId,palette,calm,initialState:'idle',activityActions:{
    'focus-segment':{kind:'loop',enter:workPose,tick:workPose},
    'life-segment':{kind:'loop',enter:lifePose,tick:lifePose},
    'rest-segment':{kind:'loop',enter:restPose,tick:restPose},
  }});
  function phase() {
    if(context.pending.length)return 'request';
    if(context.mode==='life')return lifePhase(context.life.clock);
    if(context.mode==='rest')return 'idle';
    const w=context.work;
    if(w.resumeClock<RESUME_DURATION)return 'resume';
    if(w.group==='report')return w.groupClock<.85?'surface':'report';
    if(w.group==='execute')return w.groupClock<.85?'surface':w.stage==='focus'?'review':'execute';
    const lead=w.initial?.65:.12;
    return w.groupClock<lead?'gather':w.groupClock<lead+.8?'dive':w.stage==='tools'?'execute':'focus';
  }
  const api={
    actor:engine.actor,
    tap:engine.tap,beginDrag:engine.beginDrag,drag:engine.drag,release:engine.release,lookAt:engine.lookAt,
    get view(){return {...engine.view,mode:context.mode,phase:phase(),work:{...context.work},life:{...context.life},
      clocks:{eventTimeMs:context.eventTimeMs,lastFactMs:context.lastFactMs,animationSeconds:context.animationTime}};},
    sync(value) {
      const nextSession=value.sessionId??sessionId;
      if(typeof nextSession!=='string'||!nextSession)throw new Error('Expected a selected session identity');
      const switchedSession=nextSession!==sessionId;sessionId=nextSession;
      const nextMode=value.mode??context.mode,nextStage=value.stage??context.work.stage,nextId=value.workId??context.work.id;
      if(!['work','life','rest'].includes(nextMode)||!['focus','tools','report'].includes(nextStage)||typeof nextId!=='string'||!nextId)
        throw new Error('Expected an explicit mode, work stage and work identity');
      const interactions=value.pending??context.pending;
      if(!Array.isArray(interactions))throw new Error('Expected folded pending interactions');
      const next=[...new Map(interactions.filter(p=>p.sessionId===sessionId&&typeof p.id==='string'&&p.id&&
        ['question','approval'].includes(p.kind)&&['open','continued'].includes(p.state)).map(p=>[p.id,{...p}])).values()];
      if(value.atMs!==undefined){if(!Number.isFinite(value.atMs)||value.atMs<0)throw new Error('Invalid source timestamp');context.lastFactMs=value.atMs;context.eventTimeMs=Math.max(context.eventTimeMs,value.atMs);}
      const wasPending=context.pending.length>0,wasMode=context.mode,newWork=nextMode==='work'&&(switchedSession||wasMode!=='work'||nextId!==context.work.id);
      if(newWork)Object.assign(context.work,{id:nextId,clock:0,groupClock:0,tailPhase:0,tailSpeed:1,entries:context.work.entries+1,
        group:nextStage==='report'?'report':workStyle==='readable'&&nextStage==='tools'?'execute':'deep',initial:true,fromDepth:0,resumeClock:RESUME_DURATION});
      else if(nextMode==='work') {
        const group=nextStage==='report'?'report':workStyle==='readable'&&(nextStage==='tools'||context.work.group==='execute')?'execute':'deep';
        if(group!==context.work.group)Object.assign(context.work,{group,groupClock:0,initial:false,
          fromDepth:next.length?0:engine.actor.fxValue('hidden')});
      }
      if(nextMode==='life'&&wasMode!=='life')Object.assign(context.life,{clock:0,entries:context.life.entries+1,bubbleCycle:-1});
      context.mode=nextMode;context.work.stage=nextStage;context.pending=next;
      if(wasPending&&!next.length&&nextMode==='work'&&!newWork)Object.assign(context.work,
        {resumeClock:0,resumeFrom:engine.actor.fxValue('hidden')});
      engine.sync({sessionId,mood:nextMode==='work'?'focus-segment':nextMode==='life'?'life-segment':'rest-segment',interactions:next});
    },
    advanceAnimation(seconds) {
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative animation interval');
      if(!context.visible)return;
      const target=context.animationTime+seconds;
      for(let left=seconds;left>1e-9;) {
        const dt=Math.min(left,1/120);left-=dt;context.animationTime+=dt;
        interactionPerformance?.advance(dt);
        if(!context.pending.length&&!interactionPerformance?.active()) {
          if(context.mode==='work') {
            const w=context.work;w.clock+=dt;w.groupClock+=dt;w.resumeClock=Math.min(RESUME_DURATION,w.resumeClock+dt);
            if(w.group==='deep'){w.tailSpeed+=((w.stage==='tools'?1.2:.8)-w.tailSpeed)*(1-Math.exp(-dt/.45));w.tailPhase+=dt*w.tailSpeed;}
          } else if(context.mode==='life'&&!lifePerformance?.advance(dt))context.life.clock+=dt;
        }
        engine.advance(dt);
        if(context.mode==='work'&&!context.pending.length)engine.actor.cues.tailClock=context.work.tailPhase;
      }
      context.animationTime=target;
    },
    advanceEventTime(ms){if(!Number.isFinite(ms)||ms+1e-6<context.eventTimeMs)throw new Error('Expected monotonic event time');context.eventTimeMs=Math.max(ms,context.eventTimeMs);},
    // A completed manual life interaction starts a fresh plan; no queued old cues.
    restartLife(){Object.assign(context.life,{clock:0,entries:context.life.entries+1,bubbleCycle:-1});},
    setPalette:engine.setPalette,setCalm:engine.setCalm,
    setVisible(value){context.visible=Boolean(value);engine.setVisible(context.visible);},
  };
  api.sync({mode,stage:'focus',workId,pending:[],atMs:0});return api;
}
