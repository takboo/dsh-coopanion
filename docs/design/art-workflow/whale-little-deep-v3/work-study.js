// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createWorkPerformance} from './work-performance.js';
import {drawSymbol} from './storyboard-symbol.js';

const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const references=new Map();
let film,playing=!reduced.matches,frame=null,last=null;
function options(){return {palette:$('#palette').value,route:$('#route').value,ending:$('#ending').value,calm:reduced.matches};}
function draw(canvas,study) {
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  const palette=$('#palette').value;
  g.fillStyle=palette==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
  const layout={cx:bounds.width/2,cy:bounds.height*.64,R:Math.min(bounds.width/4.6,bounds.height/3.5),shadow:true};
  renderActor(g,study.actor,layout);
  for(const s of study.view.symbols)drawSymbol(g,study.actor,layout,s.progress,s.kind,palette,study.actor.time,s.tremor,{...s,calm:reduced.matches});
  canvas.dataset.rendered='true';canvas.dataset.shot=study.view.shot.id;
}
function render() {
  const view=film.view;draw($('#work-film'),film);
  $('#shot-title').textContent=view.shot.title;$('#shot-detail').textContent=view.shot.detail;
  $('#request-status').textContent=view.pendingIds.length?
    (view.symbol.kind==='approval'?'! · 等待决定（样片模拟）':'? · 等待回应（样片模拟）'):
    view.symbols.length?'标记退场，继续当前工作':view.replyCategory==='goal-progress'?'本轮回复生成 · 目标仍继续':
    view.replyCategory==='reply'?'本轮回复生成 · 普通收势':'没有待处理请求';
  $('#clock').textContent=`${film.time.toFixed(1)} / ${film.duration.toFixed(1)} s`;
  $('#progress').value=String(Math.round(film.time*1000));
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#playback-status').textContent=view.finished?'样片结束，保留当前持续姿态；可重播或定位到任意分镜。':
    playing?(view.route==='guided'?'连续播放同一个角色；等待与决定按样片时序模拟。':'连续播放同一个角色；当前路线不需要介入。'):
      '已暂停，可拖动进度或点选分镜观察。';
  for(const button of document.querySelectorAll('#shots button')) {
    if(button.dataset.shot===view.shot.id)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  }
}
function renderReferences() {
  for(const canvas of document.querySelectorAll('canvas[data-reference-time]')) {
    let reference=references.get(canvas);
    if(!reference){reference=createWorkPerformance(options());reference.seek(Number(canvas.dataset.referenceTime));references.set(canvas,reference);}
    reference.setPalette($('#palette').value);draw(canvas,reference);
  }
}
function seek(time){playing=false;film.seek(time);last=null;render();}
function buildBoard() {
  const shots=$('#shots'),board=$('#references');shots.replaceChildren();board.replaceChildren();references.clear();
  for(const shot of film.timeline) {
    const li=document.createElement('li'),button=document.createElement('button'),time=document.createElement('small');
    button.type='button';button.dataset.shot=shot.id;time.textContent=`${shot.start.toFixed(1)}–${shot.end.toFixed(1)} s`;
    button.append(time,shot.title);button.onclick=()=>seek(shot.start);li.append(button);shots.append(li);
    if(shot.referenceTime!==null) {
      const figure=document.createElement('figure'),image=document.createElement('div'),canvas=document.createElement('canvas');
      const caption=document.createElement('figcaption'),title=document.createElement('strong'),stamp=document.createElement('small');
      image.className='reference-image';canvas.dataset.referenceTime=String(shot.referenceTime);canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label',`${shot.referenceTime.toFixed(2)} 秒 · ${shot.title}`);
      image.append(canvas);title.textContent=shot.title;stamp.textContent=`${shot.referenceTime.toFixed(2)} 秒 · 同源采样`;
      caption.append(title,stamp);figure.append(image,caption);board.append(figure);
    }
  }
}
function configure(){
  film=createWorkPerformance(options());playing=!reduced.matches;last=null;$('#progress').max=String(Math.round(film.duration*1000));
  $('#screenplay-note').textContent=$('#route').value==='guided'?
    '等待各示意 1 秒，样片按时序模拟允许与答复；真实请求需等待实际结算。普通收势不播放目标完成庆祝。':
    '当前路线不进入提问／审批。步骤转换按固定分镜预演；普通收势不播放目标完成庆祝。';
  buildBoard();render();renderReferences();schedule();
}
function tick(now) {
  frame=null;if(!playing||document.hidden){last=null;return;}
  const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;
  film.advance(dt);if(film.view.finished)playing=false;render();schedule();
}
function schedule(){if(playing&&!document.hidden&&frame===null)frame=requestAnimationFrame(tick);}
$('#replay').onclick=()=>{film.seek(0);playing=true;last=null;render();schedule();};
$('#play').onclick=()=>{if(film.view.finished)film.seek(0);playing=!playing;last=null;render();schedule();};
$('#progress').addEventListener('input',event=>seek(Number(event.target.value)/1000));
$('#route').onchange=configure;$('#ending').onchange=configure;
$('#palette').onchange=()=>{film.setPalette($('#palette').value);render();renderReferences();};
document.addEventListener('visibilitychange',()=>{
  film.setVisible(!document.hidden);last=null;
  if(document.hidden&&frame!==null){cancelAnimationFrame(frame);frame=null;}else{render();schedule();}
});
reduced.addEventListener('change',()=>{playing=false;film.setCalm(reduced.matches);references.clear();last=null;render();renderReferences();});
new ResizeObserver(render).observe($('#work-film').parentElement);
new ResizeObserver(renderReferences).observe($('#references'));
configure();
