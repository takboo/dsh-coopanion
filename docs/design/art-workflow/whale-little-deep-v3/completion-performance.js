// SPDX-License-Identifier: AGPL-3.0-or-later
// Storyboard-only consumption of already-classified Host outcomes. No success inference.
import {createSegmentPerformance} from './segment-performance.js';
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const COMPLETION_TIMING=Object.freeze({prepare:.3,burst:.68,release:2.5,end:3.5,replyEnd:1});
export function createCompletionPerformance({sessionId='completion-study',palette='deep',calm=false}={}) {
  let active=true,workId='work-1',stage='focus',pending=[],finish=null,visible=true;
  let outcome=null,spouts=0,starts=0,cancellations=0;
  const consumed=new Set();
  const restPerformance={
    advance(dt){if(finish)finish.elapsed+=dt;},
    apply(a){
      if(!finish)return false;
      const t=finish.elapsed,goal=finish.kind==='completed',amp=a.calm?.22:1;
      a.morph('rest',{squash:0,blink:false});a.fx('hidden').target=0;a.fx('eyesOpacity').target=1;
      a.scale.target=1;a.hover.target=.13;a.rootX.target=0;a.fx('belly').target=0;
      a.fx('tailMotion').target=1;a.fx('ripple').target=0;
      if(!goal||t<COMPLETION_TIMING.prepare){
        const nod=Math.sin(Math.PI*clamp(t/(goal?COMPLETION_TIMING.prepare:COMPLETION_TIMING.replyEnd)));
        a.lean.target=.065*nod*amp;a.fx('fin').target=.12-.07*smooth(t);a.fx('tail').target=Math.sin(t*2)*.02*amp;
        a.express({h:.95-.12*nod,topLid:.07});a.lookAt(-.4,-.05);
      }else{
        const u=t-COMPLETION_TIMING.prepare,open=smooth(u/.25)*(1-smooth((t-COMPLETION_TIMING.release)/(COMPLETION_TIMING.end-COMPLETION_TIMING.release)));
        a.lean.target=-.16*Math.sin(u*3.1)*open*amp;a.hover.target=.13+.12*Math.sin(Math.PI*clamp(u/.9))*amp;
        a.fx('fin').target=.1+.7*open*amp;a.fx('tail').target=Math.sin(u*5.3)*.18*open*amp;
        a.fx('ripple').target=.22*open;a.express(t<1.9?'happy':'proud');a.lookAt(-.55,-.3);
        if(t>=COMPLETION_TIMING.burst&&!finish.emitted){
          finish.emitted=true;spouts++;const c=a.bodyCenter();
          for(let i=0;i<(a.calm?2:8);i++)a.emit({kind:'drop',x:c.x+.17,y:c.y-.88,
            vx:(a.rand()-.5)*1.2,vy:-1.7-a.rand(),ay:3.6,life:.9,size:.035+a.rand()*.025,color:a.palette.accent});
        }
      }
      return true;
    },
  };
  const segment=createSegmentPerformance({sessionId,palette,calm,mode:'work',workStyle:'readable',restPerformance});
  function syncSegment(){segment.sync({sessionId,workId,stage,pending,mode:active?'work':finish?'rest':'life'});}
  function cancel(){if(finish){cancellations++;finish=null;}}
  const api={
    actor:segment.actor,
    get view(){return {...segment.view,outcome,finish:finish?{...finish}:null,spouts,starts,cancellations,consumed:consumed.size,
      finishPhase:finish?finish.kind!=='completed'?'reply-settle':finish.elapsed<COMPLETION_TIMING.prepare?'gather':finish.elapsed<COMPLETION_TIMING.release?'celebrate':'release':null};},
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
              finish={kind:outcome.category==='completed'?'completed':'reply',elapsed:0,emitted:false};starts++;
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
    setPalette:segment.setPalette,setCalm:segment.setCalm,
  };return api;
}
