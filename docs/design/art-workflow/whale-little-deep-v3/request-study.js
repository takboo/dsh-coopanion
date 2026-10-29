// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import character,{bendTail} from './character.js';
import {createRequestPerformance} from './request-performance.js';
import {KEYFRAMES} from './storyboard-performance.js';
import {drawSymbol} from './storyboard-symbol.js';

const $=selector=>document.querySelector(selector),canvas=$('#handoff');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const study=createRequestPerformance({calm:reduced.matches});
const mainKind=document.body.dataset.kind==='approval'?'approval':'question';
const words={question:{name:'提问',wait:'回应',answer:'答复',cancel:'取消',mark:'问号'},
  approval:{name:'审批',wait:'决定',answer:'允许',cancel:'拒绝',mark:'感叹号'}};
const references=new Map();
let sessionId='study-main',requests=[],serial=0,playing=true,last=null,frame=null,press=null,layout=null;
const phaseNames={settle:'稍微一怔',ask:'疑问浮现',relax:'余韵',wait:'安静等待回应',
  exit:'回应收到了，继续往下做',touch:'听见你啦',drag:'跟着你的手',working:'认真忙起来',thinking:'潜回思考',idle:'安静陪着你'};
function sync(){study.sync({sessionId,mood:$('#mood').value,interactions:requests});render();}
function feedback(text){$('#feedback').textContent=text;}
function run(){playing=true;$('#pause').textContent='暂停';$('#pause').setAttribute('aria-pressed','false');schedule();}
function addRequest(kind=mainKind,target=sessionId) {
  const n=++serial;
  requests.push({id:JSON.stringify([target,kind,`call-${n}`]),sessionId:target,kind,state:'open',label:`${words[kind].name} ${n}`});
  sync();run();
}
function settle(decision) {
  const current=requests.find(p=>p.id===study.view.requestId);if(!current)return;
  const action=words[current.kind][decision];
  current.state='settled';sync();run();
  feedback(`${current.label}已模拟${action}。${study.view.pendingIds.length?'还有请求，继续等你。':`${words[current.kind].mark}退场，按最新状态继续。`}`);
}
function render() {
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const palette=$('#palette').value;
  g.fillStyle=palette==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
  layout={cx:bounds.width/2,cy:bounds.height*.64,R:Math.min(bounds.width/4.6,bounds.height/3.5),shadow:true};
  const view=study.view;renderActor(g,study.actor,layout);
  for(const s of view.symbols) {
    drawSymbol(g,study.actor,layout,s.progress,s.kind,palette,study.actor.time,s.tremor,{...s,calm:reduced.matches});
  }
  const current=requests.find(p=>p.id===view.requestId),kind=current?.kind??mainKind;
  $('#phase').textContent=kind==='approval'&&view.phase==='ask'?'需要你决定':
    kind==='approval'&&view.phase==='wait'?'安静等待决定':phaseNames[view.phase];
  const kinds=new Set(view.pendingIds.map(id=>requests.find(p=>p.id===id).kind));
  $('#pending-count').textContent=view.pendingIds.length?`${view.pendingIds.length} 个${kinds.size>1?'请求等你处理':`${words[kind].name}等你${words[kind].wait}`}`:`${words[mainKind].name}已处理`;
  const list=$('#requests');
  const labels=view.pendingIds.map(id=>requests.find(p=>p.id===id)).map(p=>`${p.label}${p.id===view.requestId?' · 当前标记':''}${p.state==='continued'?' · 跨回合保留':''}`);
  if(list.textContent!==labels.join(''))list.replaceChildren(...labels.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  for(const id of ['answer','cancel','continued'])$('#'+id).disabled=!view.pendingIds.length;
  $('#answer').textContent=`模拟${words[kind].answer}`;$('#cancel').textContent=`模拟${words[kind].cancel}`;
  $('#continued').hidden=kind==='approval';
  $('#accepted').textContent=kind==='approval'?'模拟决定已发送':'模拟发送已接收';
  $('#prompt').textContent=`小湛正在等你${words[kind].wait}。这块提示的打开或关闭不会处理${words[kind].name}。`;
  canvas.dataset.phase=view.phase;canvas.dataset.pending=String(view.pendingIds.length);canvas.dataset.rendered='true';
}
function renderReferences() {
  const palette=$('#palette').value;
  for(const canvas of document.querySelectorAll('canvas[data-reference]')) {
    const time=KEYFRAMES[canvas.dataset.reference];
    let reference=references.get(canvas);
    if(!reference){
      reference=createRequestPerformance({palette,calm:reduced.matches});
      reference.sync({sessionId:'study-main',mood:'working',interactions:[{id:'reference',sessionId:'study-main',kind:'approval',state:'open'}]});
      reference.advance(time);references.set(canvas,reference);
    }
    reference.setPalette(palette);
    const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr);
    const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    g.fillStyle=palette==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
    const box={cx:bounds.width/2,cy:bounds.height*.64,R:Math.min(bounds.width/4.6,bounds.height/3.5),shadow:true};
    renderActor(g,reference.actor,box);
    for(const s of reference.view.symbols)drawSymbol(g,reference.actor,box,s.progress,s.kind,palette,reference.actor.time,s.tremor,
      {...s,calm:reduced.matches});
    canvas.dataset.rendered='true';
  }
}
function tick(now) {
  frame=null;if(!playing||document.hidden){last=null;return;}
  const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;
  study.advance(dt);render();frame=requestAnimationFrame(tick);
}
function schedule(){if(playing&&!document.hidden&&frame===null){last=null;frame=requestAnimationFrame(tick);}}
function point(event) {
  const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left-layout.cx)/layout.R,y:(event.clientY-r.top-layout.cy)/layout.R};
}
function hit(p) {
  const a=study.actor,c=a.bodyCenter(),angle=a.spinAngle+a.lean.value+a.leanIn.value+a.sway;
  const breath=Math.sin(a.time*2.2)*character.physics.breath*(a.calm?.5:1);
  const dx=p.x-c.x,dy=p.y-c.y;
  const q={x:(dx*Math.cos(angle)+dy*Math.sin(angle))/((1+a.squash.value+breath*.6)*a.scale.value),
    y:(-dx*Math.sin(angle)+dy*Math.cos(angle))/((1-a.squash.value-breath)*a.scale.value)};
  const points=a.base.map((b,i)=>({x:b.x+a.off[i].x,y:b.y+a.off[i].y}));bendTail(points,a.time,a);
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const u=points[i],v=points[j];
    if((u.y>q.y)!==(v.y>q.y)&&q.x<(v.x-u.x)*(q.y-u.y)/(v.y-u.y)+u.x)inside=!inside;
  }
  return inside;
}
function cancelPress() {
  if(!press)return;const id=press.id;press=null;study.release();
  if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  canvas.style.cursor='default';
}
canvas.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||press||!hit(point(event)))return;
  event.preventDefault();canvas.focus();run();
  press={id:event.pointerId,x:event.clientX,y:event.clientY,point:point(event),drag:false};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  const p=point(event);study.lookAt({x:p.x-study.actor.bodyCenter().x,y:p.y-study.actor.bodyCenter().y});
  canvas.style.cursor=press?.drag?'grabbing':hit(p)?'grab':'default';
  if(!press||press.id!==event.pointerId)return;
  if(!press.drag&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>7){press.drag=true;study.beginDrag(press.point);}
  if(press.drag)study.drag(p);
});
canvas.addEventListener('pointerup',event=>{
  if(press?.id!==event.pointerId)return;
  const tapped=!press.drag;cancelPress();if(tapped){study.tap();feedback('听见你啦。请求仍等你实际处理。');}render();
});
canvas.addEventListener('pointercancel',cancelPress);
canvas.addEventListener('lostpointercapture',cancelPress);
canvas.addEventListener('pointerleave',()=>{if(!press)study.lookAt(null);});
canvas.addEventListener('keydown',event=>{
  if(event.key==='Escape'){cancelPress();study.lookAt(null);render();}
  if(event.key==='Enter'||event.key===' '){event.preventDefault();study.tap();run();render();}
});
$('#new-request').onclick=()=>{addRequest();feedback(`新${words[mainKind].name}来了。已有请求分别保留，不重播旧出场。`);};
$('#answer').onclick=()=>settle('answer');$('#cancel').onclick=()=>settle('cancel');
$('#touch').onclick=()=>{study.tap();run();render();feedback('轻戳只回应你的触碰，不处理请求。');};
$('#duplicate').onclick=()=>{sync();feedback('相同请求再次同步，继续当前表演。');};
$('#accepted').onclick=()=>feedback(study.view.symbol?.kind==='approval'?
  '模拟决定已发送；尚未收到结算事实，继续保留感叹号。':'模拟消息已接收；尚未得到请求结算，继续保留问号。');
$('#continued').onclick=()=>{const p=requests.find(p=>p.id===study.view.requestId);if(p)p.state='continued';sync();feedback('回合结束了，提问还在等答复。');};
$('#other-kind').onclick=()=>{addRequest(mainKind==='approval'?'question':'approval');feedback('已插入另一类请求，当前请求先继续等待。');};
$('#background').onclick=()=>{addRequest(mainKind,sessionId==='study-main'?'study-other':'study-main');feedback('后台会话有新请求，当前会话的表演不变。');};
$('#open-prompt').onclick=()=>{
  const open=$('#prompt').hidden;$('#prompt').hidden=!open;
  $('#open-prompt').textContent=open?'关闭提示':'打开提示';$('#open-prompt').setAttribute('aria-expanded',String(open));
};
$('#mood').onchange=sync;
$('#session').onchange=event=>{cancelPress();sessionId=event.target.value;sync();run();feedback('已切换关注会话，已有提问直接恢复等待。');};
$('#palette').onchange=event=>{study.setPalette(event.target.value);render();renderReferences();};
$('#pause').onclick=()=>{cancelPress();playing=!playing;$('#pause').textContent=playing?'暂停':'播放';$('#pause').setAttribute('aria-pressed',String(!playing));last=null;schedule();render();};
window.addEventListener('blur',()=>{cancelPress();study.lookAt(null);});
document.addEventListener('visibilitychange',()=>{
  cancelPress();study.setVisible(!document.hidden);last=null;
  if(document.hidden&&frame!==null){cancelAnimationFrame(frame);frame=null;}else{render();schedule();}
});
reduced.addEventListener('change',()=>{study.setCalm(reduced.matches);references.clear();render();renderReferences();});
new ResizeObserver(render).observe(canvas.parentElement);
const board=document.querySelector('.reference-board');
if(board)new ResizeObserver(renderReferences).observe(board);
addRequest();renderReferences();
