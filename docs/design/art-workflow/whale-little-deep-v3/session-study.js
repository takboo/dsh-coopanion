// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createSessionReplay} from './session-replay.js';
import {drawSymbol} from './storyboard-symbol.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const names={idle:'安静陪伴',thinking:'继续想一想',working:'认真做这一步',talking:'把话整理清楚',waiting:'等你处理请求',happy:'目标完成事实已确认',
  considering:'凝神考量',doing:'低头划鳍做事',replying:'展开向你回应','request-study':'请求表演',settling:'轻轻收势',done:'开心收尾（候选）'};
const refs=new Map();let data,replay,playing=false,frame=null,last=null;
function options(){return {speed:Number($('#speed').value),palette:$('#palette').value,calm:reduced.matches,completionBranch:$('#stage').value==='completion'};}
function draw(canvas,study) {
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(bounds.width*dpr),h=Math.round(bounds.height*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);const palette=$('#palette').value;
  g.fillStyle=palette==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
  const layout={cx:bounds.width/2,cy:bounds.height*.64,R:Math.min(bounds.width/4.6,bounds.height/3.5),shadow:true};
  renderActor(g,study.actor,layout);
  for(const s of study.view.symbols)drawSymbol(g,study.actor,layout,s.progress,s.kind,palette,study.actor.time,s.tremor,{...s,calm:reduced.matches});
  canvas.dataset.rendered='true';canvas.dataset.seq=String(study.view.fact.seq);
}
function render() {
  if(!replay)return;const v=replay.view,f=v.fact;draw($('#work-film'),replay);
  $('#shot-title').textContent=v.terminalPending?'已到目标完成事实，可切换收尾候选':v.finishPhase?
    ({prepare:'完成确认后，轻轻收势',celebrate:'做好了，送你一小束水花',rest:'安静陪着你'})[v.finishPhase]:v.pendingIds.length?'有请求需要你处理':names[v.motion];
  $('#shot-detail').textContent=`seq ${f.seq} · ${f.type}${v.textPhase?` · 文字阶段（提交于 #${v.textPhase.seq}）`:''} · 已读取 ${v.processed}/${v.total} 条事件 · 累计 ${f.errors} 条工具局部错误`;
  $('#request-status').textContent=v.pendingIds.length?`${v.pendingIds.length} 个请求仍未结算`:v.symbols.length?'标记退场，继续当前活动':'当前没有待处理请求';
  $('#step-count').textContent=`${f.step}/59`;$('#tool-count').textContent=String(f.tools);
  $('#fact-mood').textContent=names[f.mood];$('#body-motion').textContent=(names[v.motion]??v.motion)+(v.motionHeld?'（余势）':'');
  $('#clock').textContent=`${replay.time.toFixed(1)} / ${replay.duration.toFixed(1)} s`;$('#progress').value=String(Math.round(replay.time*1000));
  $('#source-clock').textContent=`原始时间 ${v.sourceSeconds.toFixed(3)} / ${v.sourceDuration.toFixed(3)} s · ×${v.speed} 回放`;
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#playback-status').textContent=v.finished?(v.completionBranch?'结构与目标完成候选播放结束，回到陪伴。':'结构回放结束；目标完成事实保留，可另选收尾候选。'):playing?'事实连续推进；身体以凝神、划鳍、展开回应承接短事件。':'已暂停；可定位事件或检查模拟支路。';
  $('#settle-simulation').disabled=!v.syntheticIds.length;
  $('#simulation-status').textContent=v.syntheticIds.length?`附加 ${v.syntheticIds.length} 个模拟请求，原始事件未改写`:'没有附加模拟请求';
  for(const button of document.querySelectorAll('#shots button')) {
    const seq=Number(button.dataset.seq),next=replay.landmarks.find(l=>l.seq>seq);
    if(f.seq>=seq&&(!next||f.seq<next.seq))button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  }
}
function renderRefs() {
  if(!replay)return;
  for(const canvas of document.querySelectorAll('canvas[data-time]')) {
    let study=refs.get(canvas);if(!study){study=createSessionReplay(data,options());study.seek(Number(canvas.dataset.time));refs.set(canvas,study);}
    study.setPalette($('#palette').value);draw(canvas,study);
  }
}
function seek(t){playing=false;replay.seek(t);last=null;render();}
function buildBoard() {
  $('#shots').replaceChildren();$('#references').replaceChildren();refs.clear();
  for(const l of replay.landmarks) {
    const li=document.createElement('li'),button=document.createElement('button'),stamp=document.createElement('small');
    button.dataset.seq=String(l.seq);stamp.textContent=`#${l.seq} · 原始 ${l.sourceSeconds.toFixed(1)} s`;
    button.append(stamp,l.title);button.onclick=()=>seek(l.time);li.append(button);$('#shots').append(li);
  }
  // Sample the first readable surface phrases from this very replay, not a second pose model.
  const sampler=createSessionReplay(data,options()),wanted=new Map([
    ['considering','凝神考量 · 保留完整鲸鱼'],['doing','动手做事 · 低头划鳍'],['replying','组织文字 · 展开回应'],
  ]),samples=[];
  let prior='',since=0;
  while(!sampler.view.finished&&wanted.size) {
    sampler.advance(1/60);const motion=sampler.view.motion;
    if(motion!==prior){prior=motion;since=sampler.time;}
    if(wanted.has(motion)&&sampler.time-since>=.6){samples.push({time:sampler.time,title:wanted.get(motion)});wanted.delete(motion);}
  }
  const handoffs=replay.references.filter(l=>[373,374,640].includes(l.seq));
  for(const l of [...samples,...handoffs]) {
    const figure=document.createElement('figure'),box=document.createElement('div'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
    box.className='reference-image';canvas.dataset.time=String(l.time);canvas.setAttribute('role','img');canvas.setAttribute('aria-label',l.title);
    caption.textContent=l.title;box.append(canvas);figure.append(box,caption);$('#references').append(figure);
  }
}
function configure(){replay=createSessionReplay(data,options());playing=!reduced.matches;last=null;$('#progress').max=String(Math.round(replay.duration*1000));buildBoard();render();renderRefs();schedule();}
function tick(now){frame=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;replay.advance(dt);if(replay.view.finished)playing=false;render();schedule();}
function schedule(){if(playing&&!document.hidden&&frame===null)frame=requestAnimationFrame(tick);}
$('#replay').onclick=()=>{replay.seek(0);playing=true;last=null;render();schedule();};
$('#play').onclick=()=>{if(replay.view.finished)replay.seek(0);playing=!playing;last=null;render();schedule();};
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);$('#speed').onchange=configure;$('#stage').onchange=configure;
$('#palette').onchange=()=>{replay.setPalette($('#palette').value);render();renderRefs();};
$('#inject-question').onclick=()=>{replay.inject('question');render();};$('#inject-approval').onclick=()=>{replay.inject('approval');render();};
$('#settle-simulation').onclick=()=>{replay.settleSynthetic();render();};
document.addEventListener('visibilitychange',()=>{if(!replay)return;replay.setVisible(!document.hidden);last=null;if(document.hidden&&frame!==null){cancelAnimationFrame(frame);frame=null;}else{render();schedule();}});
reduced.addEventListener('change',()=>{if(!replay)return;playing=false;replay.setCalm(reduced.matches);refs.clear();last=null;render();renderRefs();});
new ResizeObserver(render).observe($('#work-film').parentElement);new ResizeObserver(renderRefs).observe($('#references'));
try {
  const response=await fetch('./fixtures/session-d1e0a596.structure.json');if(!response.ok)throw new Error('Structure unavailable');data=await response.json();
  for(const id of ['replay','play','progress','inject-question','inject-approval'])$('#'+id).disabled=false;
  configure();
} catch(error){$('#playback-status').textContent='结构加载失败，请检查本地样片文件。';console.error(error);}
