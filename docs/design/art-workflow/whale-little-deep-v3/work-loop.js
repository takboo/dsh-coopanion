// Historical structural observer/replay; current scene: completion-study.html, current runtime: examples/little-deep.
// SPDX-License-Identifier: AGPL-3.0-or-later
// Facts are immediate. Readable surface phrases carry bursts of low-level events.
import {createRequestPerformance} from './request-performance.js';
import {mainlineActivities} from './work-activities.js';

export const MOTION_HOLD=1.4;
export const WORK_GAP=.8;
export const GOAL_TIMING=Object.freeze({prepare:.3,celebrate:3,rest:1});
const activity=mood=>({idle:'idle',thinking:'considering',working:'doing',talking:'replying',waiting:'considering',happy:'replying'})[mood];

export function createWorkLoop({sessionId,palette='deep',calm=false,completionBranch=false}={}) {
  if(!sessionId)throw new Error('Expected a session identity');
  const engine=createRequestPerformance({sessionId,palette,calm,initialState:'idle',activityActions:mainlineActivities});
  let time=0,holdUntil=0,motion='idle',desired='idle',wasPending=false,visible=true;
  let candidate='idle',candidateSince=0;
  let eventTimeMs=0,eventPhaseSinceMs=0,eventPhase='idle',lastFactMs=0;
  let finish=null;const handledGoals=new Set();
  let facts={sessionId,mood:'idle',tools:0,pending:[],active:false};
  function apply(force=false) {
    const waiting=facts.pending.length>0;
    desired=candidate;
    if(candidate==='considering'&&!waiting) {
      // This is a visual bridge between strokes, not elapsed model-thinking time.
      if(motion==='doing'&&time-candidateSince<WORK_GAP)desired='doing';
    }
    if(waiting||wasPending||force||motion==='idle'||time+1e-9>=holdUntil) {
      if(desired!==motion){
        motion=desired;holdUntil=time+MOTION_HOLD;
      }
    }
    engine.sync({sessionId,mood:motion,interactions:facts.pending});
    wasPending=waiting;
  }
  function goalKey(value) {
    const goal=value.completion?.goal;
    return value.completion?.category==='completed'&&goal&&typeof goal.id==='string'&&goal.id.length&&Number.isSafeInteger(goal.revision)&&goal.revision>0?
      JSON.stringify([sessionId,goal.id,goal.revision]):null;
  }
  function advanceFinish() {
    const elapsed=time-finish.started;
    if(elapsed+1e-9>=GOAL_TIMING.prepare+GOAL_TIMING.celebrate) {
      if(finish.phase!=='rest'){engine.sync({sessionId,mood:'idle',interactions:[]});motion='idle';finish.phase='rest';}
      if(elapsed+1e-9>=GOAL_TIMING.prepare+GOAL_TIMING.celebrate+GOAL_TIMING.rest)finish=null;
    } else if(elapsed+1e-9>=GOAL_TIMING.prepare&&finish.phase==='prepare') {
      engine.actor.play('done');motion='done';finish.phase='celebrate';
    }
  }
  return {
    actor:engine.actor,
    get view(){return {...engine.view,facts,motion:engine.actor.state,desiredMotion:desired,
      motionHeld:!finish&&!facts.pending.length&&motion!==desired,time,finishPhase:finish?.phase??null,
      clocks:{eventTimeMs,lastFactMs,eventPhaseAgeMs:Math.max(0,eventTimeMs-eventPhaseSinceMs),animationSeconds:time}};},
    sync(value) {
      if(value.sessionId!==sessionId||!activity(value.mood)||!Array.isArray(value.pending))throw new Error('Expected folded facts for this exact session');
      if(value.atMs!==undefined&&(!Number.isFinite(value.atMs)||value.atMs<0))throw new Error('Expected a source timestamp');
      if(value.atMs!==undefined){lastFactMs=value.atMs;eventTimeMs=Math.max(eventTimeMs,lastFactMs);}
      const phase=value.pending.length?'request':value.tools>0?'tools':value.mood;
      if(phase!==eventPhase){eventPhase=phase;eventPhaseSinceMs=lastFactMs;}
      const priorPending=facts.pending.length>0,priorCandidate=candidate;
      facts={...value,pending:value.pending.map(p=>({...p}))};
      candidate=facts.tools>0?'doing':activity(facts.mood);
      if(candidate!==priorCandidate||priorPending!==Boolean(facts.pending.length))candidateSince=time;
      const key=goalKey(facts),eligible=completionBranch&&key&&facts.active===false&&facts.mood==='happy'&&!facts.tools&&!facts.pending.length;
      const interruptedFinish=Boolean(finish&&(!eligible||finish.key!==key));
      if(interruptedFinish){finish=null;holdUntil=0;}
      if(eligible) {
        candidate=desired='idle';
        if(!handledGoals.has(key)) {
          handledGoals.add(key);finish={key,started:time,phase:'prepare'};motion='settling';
          engine.sync({sessionId,mood:'settling',interactions:[]});return;
        }
        if(finish)return;
        desired='idle';
      }
      apply(interruptedFinish||facts.mood==='happy'||facts.active===false||candidate==='replying'&&priorCandidate!=='replying');
    },
    advance(seconds) {
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative duration');
      if(!visible)return;
      for(let left=seconds;left>1e-9;){const dt=Math.min(left,1/120);left-=dt;time+=dt;if(finish)advanceFinish();else apply();engine.advance(dt);}
    },
    advanceEventTime(ms) {
      if(!Number.isFinite(ms)||ms+1e-6<eventTimeMs)throw new Error('Expected monotonic source time');
      eventTimeMs=Math.max(eventTimeMs,ms);
    },
    setPalette:engine.setPalette,
    setCalm:engine.setCalm,
    setVisible(value){visible=Boolean(value);if(visible&&!finish)apply(true);engine.setVisible(visible,{preserveActivity:Boolean(finish)});},
  };
}
