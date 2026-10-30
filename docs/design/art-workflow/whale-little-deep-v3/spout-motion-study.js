// SPDX-License-Identifier: AGPL-3.0-or-later
import {renderActor} from '../vendor/livelings/workspace/livelings.js';
import {createSpoutMotion,drawSpoutMotionWater} from './spout-motion.js';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const phases={gather:'轻轻蓄势',rise:'缓慢展开',hold:'展开，稍作停留',fall:'水滴向两侧落散',settle:'身体放松',rest:'安静落定'};
let motion=createSpoutMotion({calm:reduced.matches}),playing=false,last=null,raf=null,actualSize=150;
function draw(canvas,size){
  const b=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle=$('#palette').value==='night'?'#19263f':'#e8eef8';g.fillRect(0,0,b.width,b.height);
  const layout={cx:b.width*.44,cy:b.height-25-(size/3.3)*1.4,R:size/3.3,shadow:true};
  renderActor(g,motion.actor,layout);drawSpoutMotionWater(g,motion,layout);
  Object.assign(canvas.dataset,{rendered:'true',time:String(motion.time),phase:motion.view.phase,size:String(size),radius:String(layout.R),drops:String(motion.view.drops.length),actorTime:String(motion.actor.time)});
}
function render(){
  const normalSize=Math.min(300,$('#normal').getBoundingClientRect().width*.59);draw($('#normal'),normalSize);draw($('#actual'),actualSize);
  $('#normal-size').textContent=`角色大小 ${normalSize.toFixed(0)} px`;$('#actual-size').textContent=`宿主设置 ${actualSize} px · 原比例`;
  for(const e of document.querySelectorAll('.phase'))e.textContent=phases[motion.view.phase];
  $('#progress').value=String(Math.round(motion.time*1000));$('#clock').textContent=`${motion.time.toFixed(2)} / ${motion.duration.toFixed(2)} s`;
  $('#play').textContent=playing?'暂停':'播放';$('#play').setAttribute('aria-pressed',String(playing));
  $('#playback-status').textContent=motion.time>=motion.duration?'本段结束，点击从头播放可再看一次。':playing?'两种尺寸同步播放。':'已暂停，可定位展开停留或水滴落散。';
}
function schedule(){if(playing&&!document.hidden&&raf===null)raf=requestAnimationFrame(tick);}
function tick(now){raf=null;if(!playing||document.hidden){last=null;return;}const dt=last===null?0:Math.min(.05,(now-last)/1000);last=now;motion.advance(dt);if(motion.time>=motion.duration)playing=false;render();schedule();}
function run(){playing=true;last=null;render();schedule();}
function seek(time){playing=false;last=null;motion.seek(time);render();}
$('#replay').onclick=()=>{motion.seek(0);run();};
$('#play').onclick=()=>{if(motion.time>=motion.duration)motion.seek(0);playing=!playing;last=null;render();schedule();};
$('#progress').oninput=e=>seek(Number(e.target.value)/1000);
for(const b of document.querySelectorAll('[data-at]'))b.onclick=()=>seek(Number(b.dataset.at));
$('#palette').onchange=e=>{motion.setPalette(e.target.value);render();};
$('#size').onchange=e=>{actualSize=Math.max(90,Math.min(240,Number(e.target.value)||150));e.target.value=String(actualSize);render();};
$('#blind').onclick=()=>{const on=document.body.classList.toggle('blind');$('#blind').setAttribute('aria-pressed',String(on));$('#blind').textContent=on?'显示分镜文字':'遮住分镜文字';};
document.addEventListener('visibilitychange',()=>{motion.setVisible(!document.hidden);last=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else schedule();});
reduced.addEventListener('change',()=>{const time=motion.time;motion=createSpoutMotion({palette:$('#palette').value,calm:reduced.matches});motion.seek(time);motion.setVisible(!document.hidden);playing=false;last=null;render();});
new ResizeObserver(render).observe($('#motion-pair'));render();
