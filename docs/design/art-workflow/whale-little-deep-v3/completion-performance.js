// SPDX-License-Identifier: AGPL-3.0-or-later
// Storyboard-only consumption of already-classified Host outcomes. No success inference.
import {createSegmentPerformance} from './segment-performance.js';
import {createReferenceScore,REFERENCE_SCORES,referenceWaterColors} from './reference-celebration.js';
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const COMPLETION_TIMING=Object.freeze({prepare:.20,burst:.22,release:2,end:REFERENCE_SCORES.celebrate.duration,replyEnd:1});
export function createCompletionPerformance({sessionId='completion-study',palette='deep',calm=false}={}) {
  let active=true,workId='work-1',stage='focus',pending=[],finish=null,visible=true;
  let outcome=null,spouts=0,starts=0,cancellations=0,celebration=null;
  const consumed=new Set();
  const restPerformance={
    advance(dt){if(finish)finish.elapsed+=dt;},
    apply(a){
      if(!finish)return false;
      const t=finish.elapsed,goal=finish.kind==='completed',amp=a.calm?.22:1;
      if(goal){
        if(!finish.entered){celebration.score.enter(a);finish.entered=true;}
        celebration.elapsed=t;celebration.score.tick(a,t,0);celebration.score.update(a);
        if(!finish.emitted&&celebration.score.view(a,t).jets){finish.emitted=true;spouts++;}
      }else{
        a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
        a.scale.target=1;a.hover.target=.13;a.rootX.target=0;a.fx('belly').target=0;
        a.fx('tailMotion').target=1;a.fx('ripple').target=0;
        const nod=Math.sin(Math.PI*clamp(t/COMPLETION_TIMING.replyEnd));
        a.lean.target=.065*nod*amp;a.fx('fin').target=.12-.07*smooth(t);a.fx('tail').target=Math.sin(t*2)*.02*amp;
        a.express({h:.95-.12*nod,topLid:.07});a.lookAt(-.4,-.05);
      }
      return true;
    },
  };
  const segment=createSegmentPerformance({sessionId,palette,calm,mode:'work',workStyle:'readable',restPerformance});
  function syncSegment(){segment.sync({sessionId,workId,stage,pending,mode:active?'work':finish?'rest':'life'});}
  function cancel(){if(finish){cancellations++;finish=null;if(celebration&&!celebration.cut){celebration.score.cancel(segment.actor);celebration.cut=true;}}}
  const api={
    actor:segment.actor,
    get view(){return {...segment.view,outcome,finish:finish?{...finish}:null,celebration:celebration?celebration.score.view(segment.actor,celebration.elapsed,visible):null,spouts,starts,cancellations,consumed:consumed.size,
      finishPhase:finish?finish.kind!=='completed'?'reply-settle':'complete-'+celebration.score.view(segment.actor,finish.elapsed).phase:null};},
    sync(value){
      const priorSession=sessionId;sessionId=value.sessionId??sessionId;
      if(typeof sessionId!=='string'||!sessionId)throw new Error('Expected a full session identity');
      if(value.active!==undefined){if(typeof value.active!=='boolean')throw new Error('Expected explicit work activity');active=value.active;}
      workId=value.workId??workId;stage=value.stage??stage;
      const wasPending=pending.length>0;
      pending=(value.pending??pending).filter(p=>p.sessionId===sessionId&&['open','continued'].includes(p.state));
      if(priorSession!==sessionId)cancel();
      if(value.outcome!==undefined){
        outcome=value.outcome;
        if(outcome){
          if(!['reply','goal-progress','completed','blocked','stopped'].includes(outcome.category))throw new Error('Expected a shared outcome classification');
          const g=outcome.goal;
          if(outcome.category==='completed'&&(!g||typeof g.id!=='string'||!g.id||!Number.isInteger(g.revision)||g.revision<0))throw new Error('Confirmed completion needs full goal identity and revision');
          // Match CompletionTracker: round updates do not create another goal version.
          const key=JSON.stringify(outcome.category==='completed'?[sessionId,g.id,g.revision]:[sessionId,workId,outcome.category]);
          if(!consumed.has(key)){
            consumed.add(key);
            if(!active&&!pending.length&&['reply','goal-progress','completed'].includes(outcome.category)){
              finish={kind:outcome.category==='completed'?'completed':'reply',elapsed:0,emitted:false,entered:false};starts++;
              if(finish.kind==='completed')celebration={score:createReferenceScore(),elapsed:0,cut:false};
            }
          }
        }
      }
      if(active||pending.length)cancel();
      if(!wasPending&&pending.length&&!active&&segment.view.mode==='life')segment.restartLife();
      syncSegment();
    },
    advance(seconds){
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite animation duration');
      if(!visible)return;
      for(let left=seconds;left>1e-9;){const dt=Math.min(left,1/120);left-=dt;segment.advanceAnimation(dt);
        if(finish&&finish.elapsed>=(finish.kind==='completed'?COMPLETION_TIMING.end:COMPLETION_TIMING.replyEnd)-1e-8){finish=null;syncSegment();}}
    },
    setVisible(value){visible=Boolean(value);segment.setVisible(visible);},
    setPalette(value){segment.setPalette(value);for(const drop of segment.actor.particles)if(['jet','splash'].includes(drop.studyKind))drop.color=referenceWaterColors(segment.actor).drop;},
    setCalm(value){segment.setCalm(value);if(value){segment.actor.fx('referenceRainbow').target=0;}},
  };return api;
}
