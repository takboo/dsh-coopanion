// SPDX-License-Identifier: AGPL-3.0-or-later
// Two alternative, explicit simulated outcomes. Both lanes retain one Actor during playback.
import {createCompletionPerformance} from './completion-performance.js';
export const COMPLETION_ROUTES=['none','new-work','question','approval','question-work','approval-work'];
export const COMPLETION_LANDMARKS=[{time:3,title:'同样在工具工作'},{time:4.7,title:'同样浮出汇报'},
  {time:5.18,title:'从余势收起'},{time:5.85,title:'水柱起势'},{time:6.05,title:'普通收势／水花展开'},{time:7.1,title:'安静陪伴／自豪余韵'},{time:9.2,title:'退出后接最新意图'}];
export function createCompletionFilm({route='none',palette='deep',calm=false,interruptAt=6}={}){
  if(!COMPLETION_ROUTES.includes(route))throw new Error('Unknown completion route');
  if(!Number.isFinite(interruptAt)||interruptAt<5||interruptAt>8.4)throw new Error('Invalid interruption time');
  const sessionId='completion-study',duration=16,goal={category:'completed',goal:{id:'demonstration-goal/full',revision:1,round:1}};
  let lanes,time,ticks,cursor,pending,stage,active,workId,scored,serial,visible=true;
  const cues=[{at:2,kind:'tools'},{at:4,kind:'report'},{at:5,kind:'outcome'}];
  if(route==='new-work')cues.push({at:interruptAt,kind:'work'},{at:interruptAt+1.4,kind:'tools'});
  else if(route!=='none'){cues.push({at:interruptAt,kind:route.startsWith('question')?'question':'approval'});
    if(route.endsWith('-work'))cues.push({at:interruptAt+1.2,kind:'work'});
    cues.push({at:interruptAt+3,kind:'settle'});}
  cues.push({at:10,kind:'duplicate'});cues.sort((a,b)=>a.at-b.at);
  function reset(){lanes={reply:createCompletionPerformance({sessionId,palette,calm}),goal:createCompletionPerformance({sessionId,palette,calm})};
    time=0;ticks=0;cursor=0;pending=new Map();stage='focus';active=true;workId='work-1';scored=true;serial=0;}
  function sync(outcomes){for(const [key,lane] of Object.entries(lanes))lane.sync({sessionId,workId,stage,active,pending:[...pending.values()],...(outcomes?{outcome:outcomes[key]}:{})});}
  function request(kind){const id=JSON.stringify([sessionId,kind,'request-'+(++serial)]);pending.set(id,{id,sessionId,kind,state:'open'});sync();return id;}
  function startWork(){active=true;stage='focus';workId='work-'+(++serial+1);sync({reply:null,goal:null});}
  function cue(kind){
    if(kind==='tools'||kind==='report'){stage=kind;sync();}
    else if(kind==='outcome'){active=false;sync({reply:{category:'reply'},goal});}
    else if(kind==='duplicate')sync({reply:{category:'reply'},goal});
    else if(kind==='work')startWork();
    else if(kind==='settle'){pending.clear();sync();}
    else request(kind);
  }
  function due(){while(scored&&cursor<cues.length&&cues[cursor].at<=ticks/120+1e-8)cue(cues[cursor++].kind);}
  reset();return {
    get reply(){return lanes.reply;},get goal(){return lanes.goal;},get time(){return time;},duration,
    get view(){return {time,scored,route,stage,active,workId,pending:[...pending.values()],reply:lanes.reply.view,goal:lanes.goal.view};},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid film interval');if(!visible)return;time+=seconds;
      const target=Math.floor(time*120+1e-8);while(ticks<target){due();for(const lane of Object.values(lanes))lane.advance(1/120);ticks++;}due();},
    seek(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid film position');reset();this.advance(Math.min(duration,seconds));},
    inject(kind){if(!['question','approval'].includes(kind))throw new Error('Invalid request kind');scored=false;return request(kind);},
    settle(id=lanes.goal.view.requestId){if(!pending.has(id))throw new Error('Expected exact current request identity');scored=false;pending.delete(id);sync();},
    startWork(){scored=false;startWork();},
    setStage(value){if(!['focus','tools','report'].includes(value))throw new Error('Invalid work stage');scored=false;stage=value;sync();},
    repeat(){scored=false;sync({reply:{category:'reply'},goal});},
    setPalette(value){palette=value;for(const lane of Object.values(lanes))lane.setPalette(value);},
    setCalm(value){calm=Boolean(value);for(const lane of Object.values(lanes))lane.setCalm(calm);},
    setVisible(value){visible=Boolean(value);for(const lane of Object.values(lanes))lane.setVisible(visible);},
  };
}
