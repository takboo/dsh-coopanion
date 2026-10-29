// SPDX-License-Identifier: AGPL-3.0-or-later
// Explicit gesture/request simulation for review; manual ownership cancels future score cues.
import {createLifeTouchPerformance} from './life-touch-performance.js';
const STEP=1/120,DURATION=16,SESSION='life-touch-film';
export const LIFE_TOUCH_FRAMES=Object.freeze([
  {time:1.5,title:'注意到靠近'}, {time:2.9,title:'持续抚摸'}, {time:4.35,title:'松手余韵'},
  {time:9.3,title:'请求接管'}, {time:10.9,title:'重新回到生活'}, {time:13.5,title:'生活退给工作'},
]);
export function createLifeTouchFilm({palette='deep',calm=false,kind='question'}={}) {
  if(!['question','approval'].includes(kind))throw new Error('Unknown simulated request kind');
  let life,time=0,tick=0,cursor=0,manual=false,visible=true,serial=0,mode='life',pending=new Map();
  const cues=[{time:1.2,type:'move',x:-.6},{time:1.8,type:'press'},
    ...Array.from({length:10},(_,i)=>({time:2+i*.16,type:'move',x:i%2?.25:-.6})),
    {time:3.8,type:'release'},{time:6.4,type:'press'},
    ...Array.from({length:5},(_,i)=>({time:6.6+i*.16,type:'move',x:i%2?.25:-.6})),
    {time:7.6,type:'open'},{time:10.2,type:'settle'},{time:11.6,type:'work'},{time:14,type:'life'}].sort((a,b)=>a.time-b.time);
  const identity=id=>JSON.stringify([SESSION,kind,id]);
  function sync(){life.sync({mode,stage:'tools',workId:'interruption-work',pending:[...pending.values()],atMs:Math.min(tick*STEP,DURATION)*1000});}
  function open(id,k=kind){const key=JSON.stringify([SESSION,k,id]);pending.set(key,{id:key,kind:k,sessionId:SESSION,state:'open'});return key;}
  function due(at) {
    if(manual)return;
    while(cursor<cues.length&&cues[cursor].time<=at+1e-9) {
      const c=cues[cursor++];
      if(c.type==='move')life.move({x:c.x,y:-.2});
      else if(c.type==='press')life.press();
      else if(c.type==='release')life.release();
      else if(c.type==='open'){open('score-request');sync();}
      else if(c.type==='settle'){pending.delete(identity('score-request'));sync();}
      else {mode=c.type;sync();}
    }
  }
  function reset(){life=createLifeTouchPerformance({sessionId:SESSION,palette,calm});time=0;tick=0;cursor=0;serial=0;mode='life';pending=new Map();manual=false;due(0);}
  function moveTo(target) {
    const targetTick=Math.floor(target/STEP+1e-8);
    while(tick<targetTick){life.advanceAnimation(STEP);tick++;life.advanceEventTime(Math.min(tick*STEP,DURATION)*1000);due(tick*STEP);}
    time=target;
  }
  reset();
  return {
    get life(){return life;},get time(){return time;},get duration(){return DURATION;},
    get view(){return {time,manual,scoreFinished:time>=DURATION,kind,life:life.view,simulated:true};},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid film interval');if(visible)moveTo(time+seconds);},
    seek(seconds){if(!Number.isFinite(seconds))throw new Error('Invalid seek time');reset();moveTo(Math.max(0,Math.min(DURATION,seconds)));if(!visible)life.setVisible(false);},
    manual(){if(!manual)life.cancel();manual=true;},
    inject(k){if(!['question','approval'].includes(k))throw new Error('Invalid request kind');manual=true;const id=open('manual-'+(++serial),k);sync();return id;},
    settle(id=life.view.requestId){if(!pending.has(id))throw new Error('Expected an exact simulated request');manual=true;pending.delete(id);sync();},
    setMode(value){if(!['work','life'].includes(value))throw new Error('Invalid mode');manual=true;mode=value;sync();},
    setPalette(value){life.setPalette(value);palette=value;},setCalm(value){life.setCalm(value);calm=Boolean(value);},
    setVisible(value){visible=Boolean(value);life.setVisible(value);},
  };
}
