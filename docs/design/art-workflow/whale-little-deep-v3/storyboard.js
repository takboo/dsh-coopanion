// SPDX-License-Identifier: AGPL-3.0-or-later
// Continuous preview and reference frames share the same performance source.
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createPerformance,KEYFRAMES} from './storyboard-performance.js';

import {drawSymbol} from './storyboard-symbol.js';
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

const canvases=[...document.querySelectorAll('canvas[data-pose]')];
const previewCanvas=document.querySelector('#performance');
const progressInput=document.querySelector('#progress');
const pauseButton=document.querySelector('#pause');
const references=new Map();
let palette=document.querySelector('#palette').value;
let symbol=document.querySelector('#symbol').value;
let study=createPerformance({palette,calm:reducedMotion.matches});
let playing=!reducedMotion.matches,frame=null,lastFrame=null;
const phaseNames={settle:'稍微一怔',ask:'疑问浮现',relax:'余韵与放松',wait:'安静等待回应'};

function draw(canvas,actor,progress,time=0,activity=0) {
  const bounds=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
  const width=Math.round(bounds.width*dpr),height=Math.round(bounds.height*dpr);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
  g.fillStyle=palette==='night'?'#15263f':'#e8eef8';g.fillRect(0,0,bounds.width,bounds.height);
  const R=Math.min(bounds.width/3.8,bounds.height/3.5);
  const layout={cx:bounds.width/2,cy:bounds.height*.64,R,shadow:true};
  renderActor(g,actor,layout);
  drawSymbol(g,actor,layout,progress,symbol,palette,time,activity,{calm:reducedMotion.matches});
  canvas.dataset.rendered='true';
}

function updateControls() {
  const time=Math.min(study.time,study.duration);
  progressInput.value=String(Math.round(time/study.duration*100));
  document.querySelector('#clock').textContent=`${time.toFixed(1)} s / ${study.duration.toFixed(1)} s`;
  pauseButton.textContent=playing?'暂停':'播放';
  pauseButton.setAttribute('aria-pressed',String(playing));
  document.querySelector('#replay').textContent='↻ 重播';
}

function renderPreview() {
  const pose=study.pose;
  draw(previewCanvas,study.actor,pose.symbol,study.actor.time,pose.tremor);
  document.querySelector('#phase-name').textContent=phaseNames[pose.phase];
  for(const chip of document.querySelectorAll('[data-phase]')) {
    if(chip.dataset.phase===pose.phase)chip.setAttribute('aria-current','step');
    else chip.removeAttribute('aria-current');
  }
  updateControls();
}

function render() {
  const mark=symbol==='question'?'问号':'感叹号';
  previewCanvas.setAttribute('aria-label',`小湛稍微一怔，侧倾时头前逐笔画出${mark}，然后放松等待`);
  for(const canvas of canvases) {
    let reference=references.get(canvas);
    if(!reference){reference=createPerformance({palette});reference.seek(KEYFRAMES[canvas.dataset.pose]);references.set(canvas,reference);}
    reference.setPalette(palette);
    draw(canvas,reference.actor,reference.pose.symbol);
    if(canvas.dataset.pose==='ask')canvas.setAttribute('aria-label',`小湛侧倾约十二度，头前的${mark}逐笔成形`);
  }
  study.setPalette(palette);renderPreview();
  document.querySelector('#render-status').textContent='短版样片与三张参考帧共用同一表演数据 · 尚未接入 Harness';
}

function tick(now) {
  frame=null;
  if(!playing||document.hidden){lastFrame=null;return;}
  const dt=lastFrame===null?0:Math.min((now-lastFrame)/1000,.05);lastFrame=now;
  study.advance(dt);renderPreview();
  frame=requestAnimationFrame(tick);
}

function schedule() {
  if(playing&&!document.hidden&&frame===null){lastFrame=null;frame=requestAnimationFrame(tick);}
}

function seek(time) {
  study.seek(time);lastFrame=null;renderPreview();
}

document.querySelector('#palette').addEventListener('change',event=>{palette=event.target.value;render();});
document.querySelector('#symbol').addEventListener('change',event=>{symbol=event.target.value;render();});
document.querySelector('#replay').addEventListener('click',()=>{seek(0);playing=true;updateControls();schedule();});
pauseButton.addEventListener('click',()=>{playing=!playing;updateControls();render();schedule();});
progressInput.addEventListener('input',()=>{playing=false;seek(Number(progressInput.value)/100*study.duration);});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&frame!==null){cancelAnimationFrame(frame);frame=null;lastFrame=null;}
  else schedule();
});
reducedMotion.addEventListener('change',()=>{
  playing=false;study=createPerformance({palette,calm:reducedMotion.matches});seek(study.duration);
});
new ResizeObserver(render).observe(document.querySelector('.board'));
new ResizeObserver(renderPreview).observe(previewCanvas.parentElement);
if(reducedMotion.matches)seek(study.duration);
render();
schedule();
