// SPDX-License-Identifier: AGPL-3.0-or-later
// A local finite film. Timed request settlements are screenplay cues, never Host facts.
import {createRequestPerformance} from './request-performance.js';

const STEP=1/120;
const smooth=n=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
function reveal(actor) {
  actor.morph('rest',{squash:0,blink:false});actor.fx('hidden').target=0;
  actor.fx('eyesOpacity').target=1;actor.scale.target=1;actor.hover.target=.13;
}
export const workActivities={
  receiving:{kind:'loop',enter(a){reveal(a);a.express({h:.95,topLid:.04});a.lookAt(.1,0);},
    tick(a,t){const energy=Math.sin(Math.PI*Math.min(1,t/.5)),amp=a.calm?.28:1;
      a.lean.target=-.045*energy*amp;a.fx('fin').target=.12*energy*amp;}},
  replying:{kind:'loop',enter(a){reveal(a);a.express({w:1,h:.93,topLid:.07});a.lookAt(-.2,.15);},
    tick(a){const amp=a.calm?.28:1;
      a.rootX.target=(-.02+Math.sin(a.time*1.1)*.025)*amp;
      a.lean.target=(-.035+Math.sin(a.time*1.4)*.01)*amp;
      a.fx('tail').target=Math.sin(a.time*1.6)*.035*amp;a.fx('fin').target=Math.sin(a.time*2.8)*.10*amp;}},
  settling:{kind:'loop',enter(a){reveal(a);a.lookFree();},
    tick(a,t){const release=smooth(t),amp=a.calm?.28:1;
      a.rootX.target=0;a.lean.target=0;
      a.express({w:1,h:.93+.07*release,topLid:.07*(1-release)});
      a.fx('tail').target=Math.sin(a.time*1.6)*(.035-.015*release)*amp;
      a.fx('fin').target=Math.sin(a.time*2.8)*.08*(1-release)*amp;}},
};

export function buildWorkTimeline({route='guided',ending='reply'}={}) {
  if(!['guided','plain'].includes(route)||!['reply','continue'].includes(ending))throw new Error('Unknown work-film route or ending');
  const shots=[
    ['idle',.8,'idle','安静陪着你','先安静漂浮，保留待机余势。'],
    ['receive',.5,'receiving','接到工作','轻轻收一下神，准备开始。',null,.25],
    ['think',2.7,'thinking','潜下去想一想','留下实心尾巴，明显左右扫摆。',null,1.6],
    ['work',2,'working','探出来认真做','划鳍和尾巴一起动，接着做这一步。',null,1.1],
    ['approval',2.5,'working','下一步，需要你决定','沿用已确认的 !；样片停留后模拟允许。','approval',1.7],
    ['resume-work',2,'working',route==='guided'?'得到决定，接着做':'接着做完这一步',
      route==='guided'?'感叹号退场与工作承接重叠，不庆祝允许。':'继续当前工具工作，不新增开场。'],
    ['rethink',1.5,'thinking','整理刚才的线索','这一步告一段落，继续想下一步。'],
    ['question',2.5,'thinking','有件事，想问问你','沿用已确认的 ?；样片停留后模拟答复。','question',1.7],
    ['resume-think',1.2,'thinking',route==='guided'?'把回答想清楚':'理清回复内容',
      route==='guided'?'问号从当前笔画淡出，思考继续。':'把已有线索整理成这轮回复的思路。'],
    ['reply',2.3,'replying','把回复整理好','身体更稳，平缓划鳍，专注中逐渐柔和。',null,1.2],
    ['settle',1,'settling','本轮回复已生成','安静收势，普通回复不喷水、不跳起庆祝。',null,.7],
    [ending==='reply'?'rest':'continue',ending==='reply'?1:2,ending==='reply'?'idle':'thinking',
      ending==='reply'?'回到安静陪伴':'目标仍在继续',ending==='reply'?'这轮回复告一段落，回到待机。':'收势后接回思考，继续下一步。',null,.6],
  ];
  let tick=0;
  return Object.freeze(shots.filter(s=>route==='guided'||!s[5]).map(([id,duration,mood,title,detail,kind,reference])=>{
    const startTick=tick;tick+=Math.round(duration/STEP);
    return Object.freeze({id,mood,title,detail,kind:kind??null,startTick,endTick:tick,start:startTick*STEP,end:tick*STEP,
      referenceTime:reference===undefined?null:(startTick+Math.floor(reference/STEP))*STEP});
  }));
}

export function createWorkPerformance({palette='deep',calm=false,route='guided',ending='reply'}={}) {
  const timeline=buildWorkTimeline({route,ending}),duration=timeline.at(-1).end;
  let study,time=0,tick=0,index=0,visible=true;
  function enterShot() {
    const shot=timeline[index],sessionId='work-film';
    study.sync({sessionId,mood:shot.mood,interactions:shot.kind?
      [{id:JSON.stringify([sessionId,shot.kind,shot.id]),sessionId,kind:shot.kind,state:'open'}]:[]});
  }
  function reset() {
    time=0;tick=0;index=0;
    study=createRequestPerformance({sessionId:'work-film',palette,calm,initialState:'idle',activityActions:workActivities});
    enterShot();
  }
  function moveTo(target) {
    // A global fixed-step lattice makes playback and reference reconstruction identical.
    const targetTick=Math.floor(target/STEP+1e-8);
    while(tick<targetTick) {
      study.advance(STEP);tick++;
      if(index+1<timeline.length&&tick>=timeline[index+1].startTick){index++;enterShot();}
    }
    time=target;
  }
  reset();
  return {
    get actor(){return study.actor;},get timeline(){return timeline;},get duration(){return duration;},get time(){return time;},
    get view(){return {...study.view,time,duration,shot:timeline[index],finished:time>=duration,route,ending,
      replyCategory:index>=timeline.findIndex(s=>s.id==='settle')?(ending==='reply'?'reply':'goal-progress'):null};},
    advance(seconds) {
      if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative duration');
      if(visible)moveTo(Math.min(duration,time+seconds));
    },
    seek(seconds) {
      if(!Number.isFinite(seconds))throw new Error('Expected a finite seek time');
      const target=Math.max(0,Math.min(duration,seconds));reset();moveTo(target);
      if(!visible)study.setVisible(false);
    },
    setPalette(id){study.setPalette(id);palette=id;},
    setCalm(value){calm=Boolean(value);study.setCalm(calm);},
    setVisible(value){visible=Boolean(value);study.setVisible(visible);},
  };
}
