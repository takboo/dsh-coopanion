// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createWorkLifePerformance} from './work-life-performance.js';
import {drawSymbol} from './storyboard-symbol.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const names={gather:'收鳍，准备专注',dive:'潜下去，留下尾巴',focus:'潜入考量，扫摆继续',execute:'集中执行，段内承接',
  resume:'回到刚才的事情',surface:'浮出，向你说明',report:'把进展说清楚',stretch:'舒展一下',observe:'探看周围',
  belly:'露露白腹，伸个懒腰',bubble:'追看一粒泡泡',rest:'松弛休息',return:'再看看你'};
const references=[['work',3.5,'集中工作','工具往返不改变潜水姿态'],['work',9.4,'工作续接','保留当前工作续点与扫摆'],['work',18.8,'浮出汇报','说明进展，仍是进行中的事情'],
  ['life',1.7,'舒展','完整鲸鱼、白腹与小鳍打开'],['life',9.5,'露腹伸展','松弛侧倾，和工作留尾巴区分'],['life',13.5,'追看泡泡','注意环境，留出玩耍停顿']];
let film,playing=false,last=null,raf=null,blind=false;const samples=new Map();
function options(){return {palette:$('#palette').value,route:$('#route').value,calm:reduced.matches};}
function draw(canvas,segment) {
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(b.width*dpr),h=Math.round(b.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=$('#palette').value==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,b.width,b.height);
  const layout={cx:b.width/2,cy:b.height*.64,R:Math.min(b.width/4.6,b.height/3.5),shadow:true};
  renderActor(g,segment.actor,layout);
  for(const s of segment.view.symbols)drawSymbol(g,segment.actor,layout,s.progress,s.kind,$('#palette').value,segment.actor.time,s.tremor,{...s,calm:reduced.matches});
  canvas.dataset.rendered='true';canvas.dataset.phase=segment.view.phase;
}
function render() {
  if(!film)return;const v=film.view,w=v.work,l=v.life;draw($('#work-canvas'),film.work);draw($('#life-canvas'),film.life);
  $('#work-phase').textContent=w.pendingIds.length?(w.symbol?.kind==='approval'?'先等你决定':'有件事想问你'):names[w.phase];
  $('#work-request').textContent=w.pendingIds.length?`${w.pendingIds.length} 个请求待结算`:w.symbols.length?'标记退场，与工作重叠':'同一个工作段';
  $('#work-context').textContent=`工作续点 ${w.work.clock.toFixed(1)} s · 扫摆相位 ${w.work.tailPhase.toFixed(1)} · 工作开场 ${w.work.entries} 次`;
  $('#life-phase').textContent=l.mode==='life'?names[l.phase]:'生活退让，进入工作';
  $('#life-context').textContent=l.mode==='life'?`生活段 ${l.life.clock.toFixed(1)} s · ${l.life.entries} 次生活进入`:`新工作 ${l.work.clock.toFixed(1)} s · 旧生活计划已取消`;
  $('#life-mode').textContent=l.mode==='life'?'让生活退给工作':'结束示例工作，回到生活';
  $('#work-stage').value=v.stage;$('#settle').disabled=!w.pendingIds.length;
  $('#request-summary').textContent=w.pendingIds.length?w.pendingIds.map(id=>{const [,,native]=JSON.parse(id);return (id===w.requestId?'当前：':'随后：')+native;}).join(' · '):'没有待处理请求';
  $('#progress').value=String(Math.round(Math.min(film.time,film.duration)*1000));
  $('#clock').textContent=`${Math.min(film.time,film.duration).toFixed(1)} / ${film.duration} s`;
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#playback-status').textContent=v.scoreFinished?'分镜事件已播完，继续观察当前工作与生活循环；可手动插入请求。':playing?'按分镜模拟工具、请求与结算；等待时保留工作续点。':'已暂停，可定位关键节点或改变当前工作意图。';
}
function renderReferences() {
  for(const canvas of document.querySelectorAll('canvas[data-reference]')) {
    let sample=samples.get(canvas);if(!sample){sample=createWorkLifePerformance(options());sample.seek(Number(canvas.dataset.time));samples.set(canvas,sample);}
    sample.setPalette($('#palette').value);draw(canvas,sample[canvas.dataset.lane]);
  }
}
function configure(){film=createWorkLifePerformance(options());playing=!reduced.matches;last=null;samples.clear();$('#landmarks').replaceChildren();
  for(const l of film.landmarks){const button=document.createElement('button');button.textContent=`${l.time.toFixed(1)} s · ${l.title}`;button.onclick=()=>seek(l.time);$('#landmarks').append(button);}
  render();renderReferences();schedule();}
function seek(t){playing=false;film.seek(t);last=null;render();}
function schedule(){if(playing&&!document.hidden&&raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;film.advance(dt);render();schedule();}
for(const [lane,time,title,detail] of references){const figure=document.createElement('figure'),box=document.createElement('div'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption'),strong=document.createElement('strong');
  box.className='keyframe-image';canvas.dataset.reference='true';canvas.dataset.lane=lane;canvas.dataset.time=String(time);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',title);
  strong.textContent=title;caption.append(strong,detail);box.append(canvas);figure.append(box,caption);$('#'+lane+'-board').append(figure);}
$('#play').onclick=()=>{playing=!playing;last=null;render();schedule();};
$('#replay').onclick=()=>{film.seek(0);playing=true;last=null;render();schedule();};
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);$('#route').onchange=configure;
$('#palette').onchange=()=>{film.setPalette($('#palette').value);render();renderReferences();};
$('#blind').onclick=()=>{blind=!blind;document.body.classList.toggle('blind',blind);$('#blind').setAttribute('aria-pressed',String(blind));$('#blind').textContent=blind?'显示分镜文字':'遮住分镜文字';};
function continuePlaying(){playing=true;last=null;render();schedule();}
$('#question').onclick=()=>{film.inject('question');continuePlaying();};$('#approval').onclick=()=>{film.inject('approval');continuePlaying();};
$('#settle').onclick=()=>{film.settle();continuePlaying();};$('#work-stage').onchange=e=>{film.setStage(e.target.value);render();};
$('#life-mode').onclick=()=>{film.setLifeMode(film.life.view.mode==='life'?'work':'life');continuePlaying();};
document.addEventListener('visibilitychange',()=>{film?.setVisible(!document.hidden);last=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else{render();schedule();}});
reduced.addEventListener('change',()=>{film.setCalm(reduced.matches);playing=false;last=null;samples.clear();render();renderReferences();});
new ResizeObserver(()=>{render();renderReferences();}).observe($('.pair-grid'));
configure();
