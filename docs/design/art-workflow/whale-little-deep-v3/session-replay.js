// SPDX-License-Identifier: AGPL-3.0-or-later
// Offline metadata replay. No tools, messages or requests are executed.
import {createWorkLoop,GOAL_TIMING} from './work-loop.js';

const STEP=1/120;
export function validateStructure(data) {
  if(data?.schema!==1||typeof data.sessionId!=='string'||!Number.isFinite(data.source?.durationMs)||data.source.durationMs<=0||!data.facts?.length)
    throw new Error('Invalid structural replay');
  let at=-1;
  for(let i=0;i<data.facts.length;i++) {
    const f=data.facts[i];
    if(f.seq!==i||!Number.isFinite(f.atMs)||f.atMs<at||f.atMs>data.source.durationMs||!['idle','thinking','working','talking','waiting','happy'].includes(f.mood)||
      !Number.isSafeInteger(f.tools)||f.tools<0||!Array.isArray(f.pending)||f.pending.some(p=>p.sessionId!==data.sessionId||!p.id||!['question','approval'].includes(p.kind)||!['open','continued'].includes(p.state)))
      throw new Error('Structural facts must be ordered and retain exact session identity');
    at=f.atMs;
  }
  if(data.facts.at(-1).seq!==data.source.lastSeq||at!==data.source.durationMs)throw new Error('Incomplete structural replay');
  if((data.publicTextWindows??[]).some(w=>!Number.isFinite(w.fromMs)||!Number.isFinite(w.toMs)||w.fromMs<0||w.toMs<w.fromMs||w.toMs>data.source.durationMs||data.facts[w.seq]?.type!=='assistant/message'))
    throw new Error('Invalid public text timing metadata');
  return data;
}

export function createSessionReplay(data,{speed=8,palette='deep',calm=false,completionBranch=false}={}) {
  validateStructure(data);
  if(![1,8,16,32].includes(speed))throw new Error('Unsupported replay speed');
  const sourceDuration=data.source.durationMs/1000,endCue=Math.ceil(sourceDuration/speed/STEP)*STEP;
  const duration=endCue+(completionBranch?GOAL_TIMING.prepare+GOAL_TIMING.celebrate+GOAL_TIMING.rest:1);
  let loop,time=0,tick=0,cursor=0,current,textPhase=null,visible=true,serial=0,synthetic=[];
  function textAt(at) {
    if(!current.active||current.tools||current.pending.length)return null;
    const ms=at*speed*1000;
    return (data.publicTextWindows??[]).find(w=>current.seq<w.seq&&ms>=w.fromMs&&ms<w.toMs)??null;
  }
  function sync(at=time){textPhase=textAt(at);loop.sync({...current,mood:textPhase?'talking':current.mood,sessionId:data.sessionId,pending:[...current.pending,...synthetic]});}
  function processDue(at) {
    while(cursor<data.facts.length&&data.facts[cursor].atMs/1000/speed<=at+1e-9){current=data.facts[cursor++];sync(at);}
    if(textAt(at)!==textPhase)sync(at);
  }
  function reset() {
    loop=createWorkLoop({sessionId:data.sessionId,palette,calm,completionBranch});time=0;tick=0;cursor=0;synthetic=[];serial=0;textPhase=null;
    current={seq:-1,mood:'idle',tools:0,step:0,errors:0,publicMessages:0,pending:[],active:false};processDue(0);
  }
  function moveTo(target) {
    const targetTick=Math.floor(target/STEP+1e-8);
    while(tick<targetTick){tick++;processDue(tick*STEP);loop.advanceEventTime(Math.min(sourceDuration,tick*STEP*speed)*1000);loop.advance(STEP);}
    time=target;
  }
  reset();
  const definitions=[
    [data.source.turnStartSeq,'回合开始'],[data.facts.find(f=>f.type==='tool/call')?.seq,'首次工具工作'],
    [204,'过程说明后继续'],[246,'局部工具错误'],[338,'中途目标记录'],[373,'等待实际审批'],
    [374,'决定后继续'],[633,'文字输出后仍工作'],[640,'继续读取'],[651,'最后一段文字'],[data.source.turnEndSeq,'回合结束事实'],
  ];
  const landmarks=definitions.flatMap(([seq,title])=>{
    const fact=data.facts.find(f=>f.seq===seq);return fact?[{seq,title,time:Math.ceil(fact.atMs/1000/speed/STEP)*STEP,sourceSeconds:fact.atMs/1000}]:[];
  });
  const approval=data.facts.find(f=>f.pending.some(p=>p.kind==='approval'));
  const decided=approval&&data.facts.find(f=>f.seq>approval.seq&&!f.pending.some(p=>p.kind==='approval'));
  const references=[landmarks[1],landmarks.find(l=>l.seq===204),
    ...(approval&&decided?[{seq:approval.seq,title:'审批等待中的姿态',time:(approval.atMs+decided.atMs)/2000/speed}]:[]),
    landmarks.find(l=>l.seq===374),landmarks.find(l=>l.seq===633),landmarks.find(l=>l.seq===640)].filter(Boolean)
      .map(l=>({...l,time:Math.min(endCue,l.time+(l.seq===approval?.seq?0:.3))}));
  return {
    get actor(){return loop.actor;},get time(){return time;},get duration(){return duration;},get landmarks(){return landmarks;},get references(){return references;},
    get view(){return {...loop.view,time,duration,speed,sourceSeconds:Math.min(sourceDuration,time*speed),sourceDuration,
      fact:{...current,mood:textPhase?'talking':current.mood},eventFact:current,textPhase,processed:cursor,total:data.facts.length,finished:time>=duration,syntheticIds:synthetic.map(p=>p.id),
      completion:current.completion??null,completionBranch,terminalPending:!completionBranch&&current.completion?.category==='completed'};},
    advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw new Error('Expected a finite non-negative duration');if(visible)moveTo(Math.min(duration,time+seconds));},
    seek(seconds){if(!Number.isFinite(seconds))throw new Error('Expected a finite seek time');reset();moveTo(Math.max(0,Math.min(duration,seconds)));if(!visible)loop.setVisible(false);},
    inject(kind) {
      if(!['question','approval'].includes(kind))throw new Error('Unknown simulated request kind');
      const id=JSON.stringify([data.sessionId,kind,`simulation-${++serial}`]);
      synthetic.push({id,sessionId:data.sessionId,kind,state:'open'});sync();return id;
    },
    settleSynthetic(id=synthetic[0]?.id) {
      if(!synthetic.some(p=>p.id===id))throw new Error('Only an explicitly simulated request can be settled here');
      synthetic=synthetic.filter(p=>p.id!==id);sync();
    },
    setPalette(id){loop.setPalette(id);palette=id;},setCalm(value){calm=Boolean(value);loop.setCalm(calm);},
    setVisible(value){visible=Boolean(value);loop.setVisible(visible);},
  };
}
