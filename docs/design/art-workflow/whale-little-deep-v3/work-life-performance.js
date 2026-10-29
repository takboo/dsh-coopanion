// SPDX-License-Identifier: AGPL-3.0-or-later
// A screenplay with explicit simulated cues. It never decides real request outcomes.
import {createSegmentPerformance} from './segment-performance.js';
const STEP=1/120,DURATION=24,SESSION='work-life-film';
export const WORK_LIFE_LANDMARKS=Object.freeze([
  {time:3.5,title:'工作潜入／生活探看'}, {time:7.8,title:'提问等待'}, {time:9.4,title:'问号退场后接回'},
  {time:13.8,title:'审批等待'}, {time:15.4,title:'感叹号退场后接回'},
  {time:18.8,title:'浮出汇报／生活休息'}, {time:22,title:'继续集中工作'},
]);

export function createWorkLifePerformance({palette='deep',calm=false,route='guided'}={}) {
  if(!['guided','plain'].includes(route))throw new Error('Unknown screenplay route');
  let work,life,time=0,tick=0,cursor=0,serial=0,visible=true,stage='focus',pending=new Map();
  const cues=[{time:0,type:'focus'}];
  for(let i=0;i<12;i++){cues.push({time:2+i*.30,type:'tools'},{time:2.12+i*.30,type:'focus'});}
  cues.push({time:6.8,type:'focus'},{time:6.95,type:'tools'},{time:10.2,type:'focus'},
    {time:10.35,type:'tools'},{time:15.6,type:'focus'},{time:15.8,type:'tools'},
    {time:17,type:'report'},{time:20,type:'tools'},{time:22.8,type:'focus'});
  if(route==='guided')cues.push({time:6,type:'open',kind:'question',id:'score-question'},
    {time:8.6,type:'settle',id:'score-question'},{time:12,type:'open',kind:'approval',id:'score-approval'},
    {time:14.6,type:'settle',id:'score-approval'});
  cues.sort((a,b)=>a.time-b.time);
  const identity=(kind,id)=>JSON.stringify([SESSION,kind,id]);
  function sync(at=time){work.sync({mode:'work',stage,workId:'same-work',pending:[...pending.values()],atMs:Math.min(at,DURATION)*1000});}
  function due(at) {
    while(cursor<cues.length&&cues[cursor].time<=at+1e-9) {
      const cue=cues[cursor++];
      if(cue.type==='open'){const id=identity(cue.kind,cue.id);pending.set(id,{id,sessionId:SESSION,kind:cue.kind,state:'open'});}
      else if(cue.type==='settle'){for(const [id,p] of pending)if(id===identity(p.kind,cue.id))pending.delete(id);}
      else stage=cue.type;
      sync(at);
    }
  }
  function reset() {
    work=createSegmentPerformance({sessionId:SESSION,mode:'work',palette,calm,workId:'same-work'});
    life=createSegmentPerformance({sessionId:'life-film',mode:'life',palette,calm});
    time=0;tick=0;cursor=0;serial=0;stage='focus';pending=new Map();due(0);
  }
  function move(target) {
    const targetTick=Math.floor(target/STEP+1e-8);
    while(tick<targetTick) {
      work.advanceAnimation(STEP);life.advanceAnimation(STEP);tick++;
      work.advanceEventTime(Math.min(tick*STEP,DURATION)*1000);life.advanceEventTime(Math.min(tick*STEP,DURATION)*1000);due(tick*STEP);
    }
    time=target;
  }
  reset();
  return {
    get work(){return work;},get life(){return life;},get time(){return time;},get duration(){return DURATION;},
    get landmarks(){return route==='guided'?WORK_LIFE_LANDMARKS:WORK_LIFE_LANDMARKS.filter(l=>[3.5,18.8,22].includes(l.time));},
    get view(){return {time,duration:DURATION,scoreFinished:time>=DURATION,processed:cursor,total:cues.length,stage,
      work:work.view,life:life.view,route,simulated:true};},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid film interval');if(visible)move(time+seconds);},
    seek(seconds){if(!Number.isFinite(seconds))throw new Error('Invalid seek time');reset();move(Math.max(0,Math.min(DURATION,seconds)));if(!visible){work.setVisible(false);life.setVisible(false);}},
    inject(kind){if(!['question','approval'].includes(kind))throw new Error('Invalid request kind');const id=identity(kind,'manual-'+(++serial));pending.set(id,{id,sessionId:SESSION,kind,state:'open'});sync();return id;},
    settle(id=work.view.requestId){if(!pending.has(id))throw new Error('Expected an exact current simulated request');pending.delete(id);sync();},
    setStage(value){if(!['focus','tools','report'].includes(value))throw new Error('Invalid work stage');stage=value;sync();},
    setLifeMode(value){life.sync({mode:value,stage:'tools',workId:'life-to-work',pending:[],atMs:Math.min(time,DURATION)*1000});},
    setPalette(id){work.setPalette(id);life.setPalette(id);palette=id;},setCalm(value){work.setCalm(value);life.setCalm(value);calm=Boolean(value);},
    setVisible(value){visible=Boolean(value);work.setVisible(visible);life.setVisible(visible);},
  };
}
